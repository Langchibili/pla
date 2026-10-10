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

function relationFields(relation: any): any {
	const data = relation?.data ?? relation;
	const item = Array.isArray(data) ? data[0] : data;
	return item?.attributes && typeof item.attributes === 'object'
		? item.attributes
		: item;
}

function sanitizeTournament(tournament: any, settingsOverride?: any): any {
	if (!tournament || typeof tournament !== 'object') return tournament;
	const fields = tournament.attributes && typeof tournament.attributes === 'object'
		? tournament.attributes
		: tournament;
	const configSnapshot = relationFields(fields.config_snapshot);
	const config = relationFields(fields.tournament_config);
	const settings = settingsOverride ?? configSnapshot ?? config?.settings_json;
	const configuredDistribution = settings?.prizePool?.distribution;
	fields.prize_distribution = Array.isArray(configuredDistribution)
		? configuredDistribution
			.map((prize: any) => ({
				place: Number(prize?.place),
				percent: Number(prize?.percent),
			}))
			.filter((prize: any) =>
				Number.isInteger(prize.place) && prize.place > 0
				&& Number.isFinite(prize.percent) && prize.percent > 0)
			.sort((left: any, right: any) => left.place - right.place)
		: [];
	for (const field of PRIVATE_TOURNAMENT_FIELDS) delete fields[field];
	sanitizeRelation(fields.game, PUBLIC_GAME_FIELDS);
	sanitizeRelation(fields.country, PUBLIC_COUNTRY_FIELDS);
	sanitizeRelation(fields.countries, PUBLIC_COUNTRY_FIELDS);
	sanitizeRelation(fields.prize_pool_currency, PUBLIC_CURRENCY_FIELDS);
	const countryFields = fields.country?.attributes ?? fields.country;
	sanitizeRelation(countryFields?.default_currency, PUBLIC_CURRENCY_FIELDS);
	return tournament;
}

async function getTournamentSettings(strapi: any, tournamentIds: number[]): Promise<Map<number, any>> {
	if (tournamentIds.length === 0) return new Map();
	const tournaments = await strapi.db.query(TOURNAMENT_UID).findMany({
		where: { id: { $in: tournamentIds } },
		select: ['id', 'config_snapshot'],
		populate: { tournament_config: { select: ['settings_json'] } },
	});
	return new Map(tournaments.map((tournament: any) => [
		Number(tournament.id),
		tournament.config_snapshot ?? relationFields(tournament.tournament_config)?.settings_json,
	]));
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
		if (Array.isArray(response?.data)) {
			const ids = response.data
				.map((tournament: any) => Number((tournament.attributes ?? tournament).id))
				.filter((id: number) => Number.isInteger(id) && id > 0);
			const settings = await getTournamentSettings(strapi, ids);
			response.data.forEach((tournament: any) => {
				const id = Number((tournament.attributes ?? tournament).id);
				sanitizeTournament(tournament, settings.get(id));
			});
		}
		return response;
	},

	async findOne(ctx: any) {
		const id = String(ctx.params.id ?? '');
		const tournament = await strapi.db.query(TOURNAMENT_UID).findOne({
			where: /^\d+$/.test(id) ? { id: Number(id) } : { documentId: id },
			select: ['id', 'tournament_status', 'config_snapshot'],
			populate: {
				game: { select: ['game_status'] },
				tournament_config: { select: ['settings_json'] },
			},
		});
		if (!tournament
			|| !VISIBLE_STATUSES.includes(tournament.tournament_status)
			|| tournament.game?.game_status !== 'active') {
			return ctx.notFound('Tournament not found');
		}

		const response = await super.findOne(ctx);
		const settings = tournament.config_snapshot
			?? relationFields(tournament.tournament_config)?.settings_json;
		sanitizeTournament(response?.data, settings);
		return response;
	},
}));
