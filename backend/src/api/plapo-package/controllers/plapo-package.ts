import { factories } from '@strapi/strapi';

const PACKAGE_UID = 'api::plapo-package.plapo-package';
const USER_UID = 'plugin::users-permissions.user';

async function getUserCurrencyId(strapi: any, userId: number): Promise<number | null> {
	const user = await strapi.db.query(USER_UID).findOne({
		where: { id: userId },
		populate: {
			preferred_currency: { select: ['id'] },
			country: { populate: { default_currency: { select: ['id'] } } },
		},
	});
	return Number(user?.preferred_currency?.id ?? user?.country?.default_currency?.id) || null;
}

function restrictPackages(ctx: any, currencyId: number | null): void {
	const currentFilters = ctx.query.filters;
	const packageFilter = {
		$and: [
			{ plapo_package_status: { $eq: 'active' } },
			...(currencyId ? [{ currency: { id: { $eq: currencyId } } }] : [{ documentId: { $eq: '__no_available_currency__' } }]),
		],
	};
	ctx.query.filters = currentFilters
		? { $and: [currentFilters, packageFilter] }
		: packageFilter;
}

export default factories.createCoreController(PACKAGE_UID, ({ strapi }) => ({
	async find(ctx: any) {
		const userId = Number(ctx.state.user?.id);
		if (!Number.isInteger(userId) || userId < 1) return ctx.unauthorized();
		restrictPackages(ctx, await getUserCurrencyId(strapi, userId));
		return super.find(ctx);
	},

	async findOne(ctx: any) {
		const userId = Number(ctx.state.user?.id);
		if (!Number.isInteger(userId) || userId < 1) return ctx.unauthorized();
		const id = String(ctx.params.id ?? '');
		const packageRecord = await strapi.db.query(PACKAGE_UID).findOne({
			where: /^\d+$/.test(id) ? { id: Number(id) } : { documentId: id },
			select: ['id', 'plapo_package_status'],
			populate: { currency: { select: ['id'] } },
		});
		const currencyId = await getUserCurrencyId(strapi, userId);
		if (!packageRecord
			|| packageRecord.plapo_package_status !== 'active'
			|| Number(packageRecord.currency?.id) !== currencyId) {
			return ctx.notFound('Plapo package not found');
		}
		return super.findOne(ctx);
	},
}));
