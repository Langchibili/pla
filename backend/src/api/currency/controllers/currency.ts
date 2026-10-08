import { factories } from '@strapi/strapi';

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
}));
