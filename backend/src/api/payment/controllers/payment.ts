import { factories } from '@strapi/strapi';
import { randomUUID } from 'crypto';
import { getPaymentGateway } from '../../../paymentGatewayAdapters';
import { resolveSettingsForCountry } from '../../../services/settingsResolver';
import { sendEmailNotification, sendSmsNotification } from '../../../services/notificationService';

const UNPARSED_BODY = Symbol.for('unparsedBody');
const PAYMENT_UID = 'api::payment.payment';
const LEDGER_UID = 'api::plapo-ledger.plapo-ledger';

function responseError(ctx: any, status: number, message: string) {
	ctx.status = status;
	ctx.body = { data: null, error: { status, name: 'PaymentError', message } };
}

function amountsMatch(expected: number, received: unknown): boolean {
	const amount = Number(received);
	return Number.isFinite(amount) && Math.abs(amount - expected) < 0.00001;
}

export default factories.createCoreController('api::payment.payment', ({ strapi }) => ({
	async create(ctx: any) {
		return ctx.methodNotAllowed('Use POST /payments/checkout');
	},

	async update(ctx: any) {
		return ctx.methodNotAllowed('Payment records cannot be edited directly');
	},

	async checkout(ctx: any) {
		const userId = Number(ctx.state.user?.id);
		if (!Number.isInteger(userId) || userId < 1) return ctx.unauthorized();
		const body = ctx.request.body ?? {};
		const packageId = String(body.package_id ?? body.packageId ?? '');
		const idempotencyKey = String(ctx.request.headers['idempotency-key'] ?? body.idempotency_key ?? '');
		if (!packageId || idempotencyKey.length < 8 || idempotencyKey.length > 128) {
			return ctx.badRequest('package_id and an idempotency key are required');
		}

		const existingPayment = await strapi.db.query(PAYMENT_UID).findOne({
			where: { user: userId, idempotency_key: idempotencyKey },
			select: ['documentId', 'payment_status', 'provider_reference'],
		});
		if (existingPayment) {
			return ctx.send({
				data: {
					documentId: existingPayment.documentId,
					payment_status: existingPayment.payment_status,
					provider_reference: existingPayment.provider_reference,
				},
			});
		}

		const user = await strapi.db.query('plugin::users-permissions.user').findOne({
			where: { id: userId },
			select: ['id', 'email', 'username', 'phone_number', 'user_status'],
			populate: { country: { select: ['id', 'iso_code', 'dial_code'] } },
		});
		if (!user || user.user_status !== 'active') return ctx.forbidden('This account cannot purchase Plapo');

		const plapoPackage = await strapi.db.query('api::plapo-package.plapo-package').findOne({
			where: /^\d+$/.test(packageId)
				? { $or: [{ id: Number(packageId) }, { documentId: packageId }] }
				: { documentId: packageId },
			populate: { currency: true },
		});
		if (!plapoPackage || plapoPackage.plapo_package_status !== 'active') {
			return ctx.notFound('Plapo package is not available');
		}
		if (Number(plapoPackage.price) <= 0 || !plapoPackage.currency?.code) {
			return ctx.badRequest('Plapo package price or currency is invalid');
		}

		const settings = await resolveSettingsForCountry(strapi, user.country?.id);
		const gatewayName = String(settings.default_payment_gateway || 'pawapay').toLowerCase();
		let payment = null;
		const merchantReference = `PLA-${randomUUID()}`;
		try {
			payment = await strapi.db.query(PAYMENT_UID).create({
				data: {
					user: userId,
					plapo_package: plapoPackage.id,
					provider: gatewayName,
					merchant_reference: merchantReference,
					idempotency_key: idempotencyKey,
					amount: Number(plapoPackage.price),
					currency: plapoPackage.currency.id,
					plapo_credited: 0,
					payment_status: 'pending',
				},
			});

			const result = await getPaymentGateway(gatewayName).initiatePayment({
				reference: merchantReference,
				amount: Number(plapoPackage.price),
				currency: plapoPackage.currency.code,
				phone: String(body.phone ?? user.phone_number ?? user.username ?? ''),
				paymentType: body.payment_type === 'card' ? 'card' : 'mobile_money',
				operator: typeof body.operator === 'string' ? body.operator : undefined,
				country: user.country?.iso_code,
				email: user.email,
				customer: body.customer,
				card: body.card,
				billing: body.billing,
				redirectUrl: typeof body.redirect_url === 'string' ? body.redirect_url : undefined,
				narration: `Plapo package ${plapoPackage.name}`,
			});

			await strapi.db.query(PAYMENT_UID).update({
				where: { id: payment.id },
				data: {
					provider_reference: result.gatewayReference,
					checkout_url: result.redirectUrl || null,
				},
			});

			return ctx.send({
				data: {
					documentId: payment.documentId,
					merchant_reference: merchantReference,
					provider_reference: result.gatewayReference,
					payment_status: 'pending',
					redirect_url: result.redirectUrl || null,
				},
			}, 201);
		} catch (error) {
			if (payment) {
				await strapi.db.query(PAYMENT_UID).update({
					where: { id: payment.id },
					data: { payment_status: 'failed' },
				});
			}
			strapi.log.error('[Payment:checkout] Provider initiation failed', error);
			return responseError(ctx, 502, 'Could not start the payment. No Plapo has been credited.');
		}
	},

	async webhook(ctx: any) {
		const rawBody = ctx.request.body?.[UNPARSED_BODY];
		if (!Buffer.isBuffer(rawBody)) return responseError(ctx, 400, 'Raw webhook body is unavailable');

		let incoming: any;
		try {
			incoming = JSON.parse(rawBody.toString('utf8'));
		} catch {
			return responseError(ctx, 400, 'Invalid payment webhook payload');
		}
		const reference = String(incoming.depositId ?? incoming.payoutId ?? incoming.data?.reference ?? incoming.data?.depositId ?? incoming.reference ?? '');
		if (!reference) return responseError(ctx, 400, 'Payment reference is required');

		const payment = await strapi.db.query(PAYMENT_UID).findOne({
			where: { $or: [{ merchant_reference: reference }, { provider_reference: reference }] },
			populate: { user: true, plapo_package: true, currency: true },
		});
		if (!payment) return responseError(ctx, 404, 'Payment not found');

		const headers = Object.fromEntries(
			Object.entries(ctx.request.headers).map(([key, value]) => [key.toLowerCase(), String(value ?? '')]),
		);
		const gateway = getPaymentGateway(payment.provider);
		const verified = gateway.verifyWebhook(headers, rawBody.toString('utf8'));
		if (!verified.valid) return responseError(ctx, 401, 'Payment webhook signature is invalid');
		if (gateway.isCollectionFailed(verified.event, verified.data)) {
			await strapi.db.query(PAYMENT_UID).update({
				where: { id: payment.id },
				data: { payment_status: 'failed', webhook_payload: verified.data },
			});
			return ctx.send({ received: true, payment_status: 'failed' });
		}
		if (!gateway.isCollectionSuccess(verified.event, verified.data)) {
			return ctx.send({ received: true, ignored: true });
		}

		const data = verified.data as Record<string, any>;
		const paidAmount = data.amount ?? data.requestedAmount ?? data.requestAmount;
		const paidCurrency = data.currency ?? data.currencyCode;
		if (!amountsMatch(Number(payment.amount), paidAmount) || String(paidCurrency).toUpperCase() !== String(payment.currency?.code).toUpperCase()) {
			strapi.log.error(`[Payment:webhook] Amount/currency mismatch for payment ${payment.id}`);
			return responseError(ctx, 400, 'Payment amount or currency does not match the pending purchase');
		}

		const ledgerIdempotencyKey = `payment-credit:${payment.id}`;
		const creditAmount = Number(payment.plapo_package?.plapo_amount || 0) + Number(payment.plapo_package?.bonus_plapo || 0);
		let shouldNotify = false;
		await strapi.db.transaction(async () => {
			const currentPayment = await strapi.db.query(PAYMENT_UID).findOne({
				where: { id: payment.id },
				select: ['id', 'payment_status'],
			});
			if (currentPayment?.payment_status === 'succeeded') return;

			const existingCredit = await strapi.db.query(LEDGER_UID).findOne({
				where: { idempotency_key: ledgerIdempotencyKey },
				select: ['id'],
			});
			if (!existingCredit) {
				await strapi.db.query(LEDGER_UID).create({
					data: {
						user: payment.user.id,
						amount: creditAmount,
						ledger_type: 'purchase',
						plapo_source: 'purchased',
						plapo_ledger_status: 'posted',
						payment: payment.id,
						idempotency_key: ledgerIdempotencyKey,
						note: `Purchased ${payment.plapo_package.name}`,
					},
				});
			}
			await strapi.db.query(PAYMENT_UID).update({
				where: { id: payment.id },
				data: {
					payment_status: 'succeeded',
					plapo_credited: creditAmount,
					paid_at: new Date(),
					webhook_payload: verified.data,
				},
			});
			shouldNotify = true;
		});

		if (shouldNotify) try {
			await sendEmailNotification(strapi, {
				email: payment.user.email,
				subject: 'Your ProLeague Africa Plapo purchase is complete',
				text: `${payment.plapo_package.plapo_amount + payment.plapo_package.bonus_plapo} Plapo has been added to your wallet.`,
			});
		} catch (error) {
			strapi.log.warn(`[Payment] Email notification failed for payment ${payment.id}`, error);
		}
		if (shouldNotify) try {
			await sendSmsNotification(payment.user.phone_number, `${payment.plapo_credited || payment.plapo_package.plapo_amount + payment.plapo_package.bonus_plapo} Plapo was added to your ProLeague Africa wallet.`);
		} catch (error) {
			strapi.log.warn(`[Payment] SMS notification failed for payment ${payment.id}`, error);
		}

		return ctx.send({ received: true, payment_status: 'succeeded', duplicate: !shouldNotify });
	},
}));
