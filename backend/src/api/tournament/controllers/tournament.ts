import { factories } from '@strapi/strapi';

const TOURNAMENT_UID = 'api::tournament.tournament';
const VISIBLE_STATUSES = ['published', 'registration_open', 'registration_closed', 'in_progress', 'completed'];
const PRIVATE_TOURNAMENT_FIELDS = new Set([
	'config_snapshot',
	'tournament_config',
	'entries',
	'prize_payouts',
]);
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

function sanitizeRelation(relation: any, allowedFields: Set<string>): void {
	if (Array.isArray(relation)) {
		relation.forEach((item) => sanitizeRelation(item, allowedFields));
		return;
	}
	if (!relation || typeof relation !== 'object') return;
	const fields = relation.attributes && typeof relation.attributes === 'object'
		? relation.attributes
		: relation;
	for (const field of Object.keys(fields)) {
		if (!allowedFields.has(field)) delete fields[field];
	}
}

function sanitizeTournament(tournament: any): any {
	if (!tournament || typeof tournament !== 'object') return tournament;
	const fields = tournament.attributes && typeof tournament.attributes === 'object'
		? tournament.attributes
		: tournament;
	for (const field of PRIVATE_TOURNAMENT_FIELDS) delete fields[field];
	sanitizeRelation(fields.game, PUBLIC_GAME_FIELDS);
	sanitizeRelation(fields.country, PUBLIC_COUNTRY_FIELDS);
	sanitizeRelation(fields.countries, PUBLIC_COUNTRY_FIELDS);
	sanitizeRelation(fields.prize_pool_currency, PUBLIC_CURRENCY_FIELDS);
	const countryFields = fields.country?.attributes ?? fields.country;
	sanitizeRelation(countryFields?.default_currency, PUBLIC_CURRENCY_FIELDS);
	return tournament;
}

function requireVisibleTournaments(ctx: any): void {
	const currentFilters = ctx.query.filters;
	const visibleFilter = {
		$and: [
			{ tournament_status: { $in: VISIBLE_STATUSES } },
			{ game: { game_status: { $eq: 'active' } } },
		],
	};
	ctx.query.filters = currentFilters
		? { $and: [currentFilters, visibleFilter] }
		: visibleFilter;
}

export default factories.createCoreController(TOURNAMENT_UID, ({ strapi }) => ({
	async find(ctx: any) {
		requireVisibleTournaments(ctx);
		const response = await super.find(ctx);
		if (Array.isArray(response?.data)) response.data.forEach(sanitizeTournament);
		return response;
	},

	async findOne(ctx: any) {
		const id = String(ctx.params.id ?? '');
		const tournament = await strapi.db.query(TOURNAMENT_UID).findOne({
			where: /^\d+$/.test(id) ? { id: Number(id) } : { documentId: id },
			select: ['id', 'tournament_status'],
			populate: { game: { select: ['game_status'] } },
		});
		if (!tournament
			|| !VISIBLE_STATUSES.includes(tournament.tournament_status)
			|| tournament.game?.game_status !== 'active') {
			return ctx.notFound('Tournament not found');
		}

		const response = await super.findOne(ctx);
		sanitizeTournament(response?.data);
		return response;
	},
}));
