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

function sanitizeCountry(country: any): any {
	if (!country || typeof country !== 'object') return country;
	if (country.attributes && typeof country.attributes === 'object') {
		for (const field of Object.keys(country.attributes)) {
			if (!PUBLIC_COUNTRY_FIELDS.has(field)) delete country.attributes[field];
		}
		return country;
	}
	for (const field of Object.keys(country)) {
		if (!PUBLIC_COUNTRY_FIELDS.has(field)) delete country[field];
	}
	return country;
}

export default factories.createCoreController('api::country.country', () => ({
	async find(ctx: any) {
		const response = await super.find(ctx);
		if (Array.isArray(response?.data)) response.data.forEach(sanitizeCountry);
		return response;
	},

	async findOne(ctx: any) {
		const response = await super.findOne(ctx);
		sanitizeCountry(response?.data);
		return response;
	},
}));
