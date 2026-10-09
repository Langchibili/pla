import { factories } from '@strapi/strapi';

const PUBLIC_GAME_FIELDS = new Set([
	'id',
	'documentId',
	'name',
	'slug',
	'logo',
	'game_status',
	'result_type',
	'in_game_id_format',
	'in_game_id_label',
	'in_game_id_example',
	'screenshotExample',
	'score_min',
	'score_max',
	'createdAt',
	'updatedAt',
	'publishedAt',
]);

function sanitizeGame(game: any): any {
	if (!game || typeof game !== 'object') return game;
	const fields = game.attributes && typeof game.attributes === 'object'
		? game.attributes
		: game;
	for (const field of Object.keys(fields)) {
		if (!PUBLIC_GAME_FIELDS.has(field)) delete fields[field];
	}
	return game;
}

function requireActiveGames(ctx: any): void {
	const currentFilters = ctx.query.filters;
	ctx.query.filters = currentFilters
		? { $and: [currentFilters, { game_status: { $eq: 'active' } }] }
		: { game_status: { $eq: 'active' } };
}

export default factories.createCoreController('api::game.game', ({ strapi }) => ({
	async find(ctx: any) {
		requireActiveGames(ctx);
		const response = await super.find(ctx);
		if (Array.isArray(response?.data)) response.data.forEach(sanitizeGame);
		return response;
	},

	async findOne(ctx: any) {
		const id = String(ctx.params.id ?? '');
		const existing = await strapi.db.query('api::game.game').findOne({
			where: /^\d+$/.test(id) ? { id: Number(id) } : { documentId: id },
			select: ['id', 'game_status'],
		});
		if (!existing || existing.game_status !== 'active') return ctx.notFound('Game not found');
		const response = await super.findOne(ctx);
		sanitizeGame(response?.data);
		return response;
	},
}));
