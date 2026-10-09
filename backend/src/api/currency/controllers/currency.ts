import { factories } from '@strapi/strapi';
import {
	convertAmount,
	CurrencyConversionUnavailableError,
} from '../../../services/currencyConversion';

const PUBLIC_CURRENCY_FIELDS = new Set([
	'id',
	'documentId',
	'code',
	'name',
	'symbol',
	'rate_to_base',
	'rate_updated_at',
	'is_base',
	'currency_status',
	'createdAt',
	'updatedAt',
	'publishedAt',
]);

function sanitizeCurrency(currency: any): any {
	if (!currency || typeof currency !== 'object') return currency;
	const fields = currency.attributes && typeof currency.attributes === 'object'
		? currency.attributes
		: currency;
	for (const field of Object.keys(fields)) {
		if (!PUBLIC_CURRENCY_FIELDS.has(field)) delete fields[field];
	}
	return currency;
}

function requireActiveCurrencies(ctx: any): void {
	const currentFilters = ctx.query.filters;
	ctx.query.filters = currentFilters
		? { $and: [currentFilters, { currency_status: { $eq: 'active' } }] }
		: { currency_status: { $eq: 'active' } };
}

export default factories.createCoreController('api::currency.currency', ({ strapi }) => ({
	async find(ctx: any) {
		requireActiveCurrencies(ctx);
		const response = await super.find(ctx);
		if (Array.isArray(response?.data)) response.data.forEach(sanitizeCurrency);
		return response;
	},

	async findOne(ctx: any) {
		const id = String(ctx.params.id ?? '');
		const existing = await strapi.db.query('api::currency.currency').findOne({
			where: /^\d+$/.test(id) ? { id: Number(id) } : { documentId: id },
			select: ['id', 'currency_status'],
		});
		if (!existing || existing.currency_status !== 'active') return ctx.notFound('Currency not found');
		const response = await super.findOne(ctx);
		sanitizeCurrency(response?.data);
		return response;
	},

	async convertPrice(ctx: any) {
		const userId = Number(ctx.state.user?.id);
		if (!Number.isInteger(userId) || userId < 1) return ctx.unauthorized('Login required');

		const { amount, fromCurrencyCode } = ctx.request.body ?? {};
		const numericAmount = Number(amount);
		const sourceCode = typeof fromCurrencyCode === 'string' ? fromCurrencyCode.trim().toUpperCase() : '';
		if (amount === undefined || amount === null || (typeof amount === 'string' && !amount.trim())
			|| !Number.isFinite(numericAmount) || numericAmount < 0 || numericAmount > 1_000_000_000_000) {
			return ctx.badRequest('amount must be a non-negative number');
		}
		if (!/^[A-Z]{3}$/.test(sourceCode)) {
			return ctx.badRequest('fromCurrencyCode must be a valid three-letter currency code');
		}

		const [sourceCurrency, user] = await Promise.all([
			strapi.db.query('api::currency.currency').findOne({
				where: { code: sourceCode, currency_status: 'active' },
				select: ['code', 'symbol'],
			}),
			strapi.db.query('plugin::users-permissions.user').findOne({
				where: { id: userId },
				populate: { country: { populate: { default_currency: true } } },
			}),
		]);
		if (!sourceCurrency) return ctx.badRequest(`Unknown or inactive currency: ${sourceCode}`);

		const targetCurrency = user?.country?.default_currency;
		if (!targetCurrency?.code || targetCurrency.currency_status !== 'active') {
			return ctx.badRequest('Your country has no active currency configured');
		}

		const targetCode = String(targetCurrency.code).toUpperCase();
		const wasConverted = sourceCode !== targetCode;
		try {
			const convertedAmount = wasConverted
				? await convertAmount(strapi, numericAmount, sourceCode, targetCode)
				: numericAmount;
			return ctx.send({
				success: true,
				amount: convertedAmount,
				currencyCode: targetCode,
				currencySymbol: targetCurrency.symbol || null,
				wasConverted,
			});
		} catch (error) {
			if (!(error instanceof CurrencyConversionUnavailableError)) throw error;
			strapi.log.error('[currency.convertPrice] Conversion failed', error.message);
			ctx.status = 503;
			ctx.body = {
				error: {
					status: 503,
					name: 'ServiceUnavailableError',
					message: 'Currency conversion is temporarily unavailable. Please try again shortly.',
				},
			};
			return;
		}
	},
}));
