import { factories } from '@strapi/strapi';

const PUBLIC_COUNTRY_FIELDS = new Set([
	'id',
	'documentId',
	'name',
	'iso_code',
	'dial_code',
	'default_currency',
	'country_status',
	'createdAt',
	'updatedAt',
	'publishedAt',
]);

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
]);

function sanitizeCountry(country: any): any {
	if (!country || typeof country !== 'object') return country;
	const fields = country.attributes && typeof country.attributes === 'object'
		? country.attributes
		: country;
	for (const field of Object.keys(fields)) {
		if (!PUBLIC_COUNTRY_FIELDS.has(field)) delete fields[field];
	}
	const currency = fields.default_currency;
	if (currency && typeof currency === 'object') {
		const currencyFields = currency.attributes && typeof currency.attributes === 'object'
			? currency.attributes
			: currency;
		for (const field of Object.keys(currencyFields)) {
			if (!PUBLIC_CURRENCY_FIELDS.has(field)) delete currencyFields[field];
		}
	}
	return country;
}

function requireActiveCountries(ctx: any): void {
	const currentFilters = ctx.query.filters;
	ctx.query.filters = currentFilters
		? { $and: [currentFilters, { country_status: { $eq: 'active' } }] }
		: { country_status: { $eq: 'active' } };
}

export default factories.createCoreController('api::country.country', ({ strapi }) => ({
	async find(ctx: any) {
		requireActiveCountries(ctx);
		const response = await super.find(ctx);
		if (Array.isArray(response?.data)) response.data.forEach(sanitizeCountry);
		return response;
	},

	async findOne(ctx: any) {
		const id = String(ctx.params.id ?? '');
		const existing = await strapi.db.query('api::country.country').findOne({
			where: /^\d+$/.test(id) ? { id: Number(id) } : { documentId: id },
			select: ['id', 'country_status'],
		});
		if (!existing || existing.country_status !== 'active') return ctx.notFound('Country not found');
		const response = await super.findOne(ctx);
		sanitizeCountry(response?.data);
		return response;
	},
}));
