import { factories } from '@strapi/strapi';
import { getPlapoBalances, getPlapoSourceBalances } from '../../../services/plapoLedgerService';
import { resolveSettingsForCountry } from '../../../services/settingsResolver';

const LEDGER_UID = 'api::plapo-ledger.plapo-ledger';
const USER_UID = 'plugin::users-permissions.user';

export default factories.createCoreController(LEDGER_UID, ({ strapi }) => ({
	async wallet(ctx: any) {
		const userId = Number(ctx.state.user?.id);
		if (!Number.isInteger(userId) || userId < 1) return ctx.unauthorized();
		const [balances, ledger] = await Promise.all([
			getPlapoBalances(strapi, userId),
			strapi.db.query(LEDGER_UID).findMany({
				where: { user: userId, plapo_ledger_status: 'posted' },
				select: ['documentId', 'amount', 'ledger_type', 'plapo_source', 'note', 'createdAt'],
				orderBy: { createdAt: 'desc' },
				limit: 100,
			}),
		]);
		return ctx.send({ data: { ...balances, ledger } });
	},

	async mine(ctx: any) {
		const userId = Number(ctx.state.user?.id);
		if (!Number.isInteger(userId) || userId < 1) return ctx.unauthorized();
		const ledger = await strapi.db.query(LEDGER_UID).findMany({
			where: { user: userId, plapo_ledger_status: 'posted' },
			select: ['documentId', 'amount', 'ledger_type', 'plapo_source', 'note', 'createdAt'],
			orderBy: { createdAt: 'desc' },
			limit: 100,
		});
		return ctx.send({ data: ledger });
	},

	async transfer(ctx: any) {
		const userId = Number(ctx.state.user?.id);
		if (!Number.isInteger(userId) || userId < 1) return ctx.unauthorized();
		const body = ctx.request.body ?? {};
		const recipientKey = typeof body.to === 'string' ? body.to.trim() : '';
		const amount = Number(body.amount);
		const idempotencyKey = typeof body.idempotency_key === 'string'
			? body.idempotency_key.trim()
			: '';
		if (!recipientKey || !Number.isSafeInteger(amount) || amount < 1) {
			return ctx.badRequest('A recipient and a positive whole-number amount are required');
		}
		if (!/^[a-zA-Z0-9_-]{8,100}$/.test(idempotencyKey)) {
			return ctx.badRequest('A valid idempotency key is required');
		}

		const [sender, recipient] = await Promise.all([
			strapi.db.query(USER_UID).findOne({
				where: { id: userId },
				select: ['id', 'user_status'],
				populate: { country: { select: ['id'] } },
			}),
			strapi.db.query(USER_UID).findOne({
				where: {
					$or: [
						{ referral_code: recipientKey.toUpperCase() },
						{ username: recipientKey },
					],
				},
				select: ['id', 'user_status'],
			}),
		]);
		if (!sender || sender.user_status !== 'active') return ctx.forbidden('This account cannot transfer Plapo');
		if (!recipient || recipient.user_status !== 'active') return ctx.notFound('Active recipient not found');
		if (Number(recipient.id) === userId) return ctx.badRequest('You cannot transfer Plapo to yourself');

		const settings = await resolveSettingsForCountry(strapi, sender.country?.id);
		if (!settings.transfers_enabled) return ctx.forbidden('Plapo transfers are currently disabled');

		const senderKey = `${idempotencyKey}:out:${userId}`;
		const recipientKeyForLedger = `${idempotencyKey}:in:${recipient.id}`;
		let resultBalances: { spendable_balance: number; transferable_balance: number } | undefined;
		try {
			await strapi.db.transaction(async ({ trx }: any) => {
				await trx('up_users').where({ id: userId }).forUpdate().first();
				const priorTransfer = await strapi.db.query(LEDGER_UID).findOne({
					where: { idempotency_key: { $startsWith: senderKey } },
					select: ['id'],
				});
				if (priorTransfer) {
					resultBalances = await getPlapoBalances(strapi, userId);
					return;
				}

				const balances = await getPlapoSourceBalances(strapi, userId);
				let remaining = amount;
				const debits: Array<{ source: 'received' | 'purchased'; amount: number }> = [];
				for (const source of ['received', 'purchased'] as const) {
					const debit = Math.min(remaining, Math.max(0, balances[source]));
					if (debit > 0) {
						debits.push({ source, amount: debit });
						remaining -= debit;
					}
				}
				if (remaining > 0) throw new Error('Transfer exceeds your transferable Plapo balance');

				for (const [index, debit] of debits.entries()) {
					await strapi.db.query(LEDGER_UID).create({
						data: {
							user: userId,
							counterparty: recipient.id,
							amount: -debit.amount,
							ledger_type: 'transfer_out',
							plapo_source: debit.source,
							plapo_ledger_status: 'posted',
							idempotency_key: `${senderKey}:${index}`,
							note: `Transfer to ${recipient.id}`,
						},
					});
				}
				await strapi.db.query(LEDGER_UID).create({
					data: {
						user: recipient.id,
						counterparty: userId,
						amount,
						ledger_type: 'transfer_in',
						plapo_source: 'received',
						plapo_ledger_status: 'posted',
						idempotency_key: recipientKeyForLedger,
						note: `Transfer from ${userId}`,
					},
				});
				resultBalances = await getPlapoBalances(strapi, userId);
			});
		} catch (error) {
			if (error instanceof Error && error.message === 'Transfer exceeds your transferable Plapo balance') {
				return ctx.badRequest(error.message);
			}
			throw error;
		}

		return ctx.send({ data: resultBalances });
	},
}));
