import { factories } from '@strapi/strapi';
import { randomBytes } from 'crypto';

export default factories.createCoreController('api::tournament-entry.tournament-entry', ({ strapi }) => ({
	async join(ctx: any) {
		const userId = Number(ctx.state.user?.id);
		if (!Number.isInteger(userId) || userId < 1) return ctx.unauthorized();

		const body = ctx.request.body ?? {};
		const tournamentId = String(body.tournament_id ?? body.tournamentId ?? '');
		const inGameName = typeof body.in_game_name === 'string' ? body.in_game_name.trim() : '';
		if (!tournamentId || inGameName.length < 2 || inGameName.length > 80) {
			return ctx.badRequest('tournament_id and a valid in_game_name are required');
		}

		const user = await strapi.db.query('plugin::users-permissions.user').findOne({
			where: { id: userId },
			select: ['id', 'user_status'],
			populate: { country: { select: ['id'] } },
		});
		if (!user || user.user_status !== 'active') return ctx.forbidden('This account cannot enter tournaments');

		const tournament = await strapi.db.query('api::tournament.tournament').findOne({
			where: /^\d+$/.test(tournamentId)
				? { $or: [{ id: Number(tournamentId) }, { documentId: tournamentId }] }
				: { documentId: tournamentId },
			populate: { game: true, country: { select: ['id'] } },
		});
		if (!tournament) return ctx.notFound('Tournament not found');
		if (tournament.tournament_status !== 'registration_open') return ctx.badRequest('Registration is not open');
		if (tournament.registration_closes_at && new Date(tournament.registration_closes_at).getTime() <= Date.now()) {
			return ctx.badRequest('Registration has closed');
		}
		if (tournament.game?.game_status !== 'active') return ctx.badRequest('This game is not active');
		if (tournament.requires_entry_fee || Number(tournament.entry_fee_plapo) > 0) {
			return ctx.badRequest('Paid tournament entry is unavailable until ledger charging is configured');
		}
		if (tournament.country?.id && Number(tournament.country.id) !== Number(user.country?.id)) {
			return ctx.forbidden('This tournament is not available in your country');
		}

		const entryCount = await strapi.db.query('api::tournament-entry.tournament-entry').count({
			where: { tournament: tournament.id },
		});
		if (tournament.max_players && entryCount >= Number(tournament.max_players)) {
			return ctx.badRequest('This tournament is full');
		}

		const existingEntry = await strapi.db.query('api::tournament-entry.tournament-entry').findOne({
			where: { tournament: tournament.id, user: userId },
			select: ['id'],
		});
		if (existingEntry) return ctx.badRequest('You have already entered this tournament');

		if (tournament.game.in_game_id_format) {
			try {
				if (!new RegExp(tournament.game.in_game_id_format).test(inGameName)) {
					return ctx.badRequest('Your in-game name does not match this game\'s required format');
				}
			} catch {
				return ctx.internalServerError('The game in-game name format is invalid');
			}
		}

		const entry = await strapi.documents('api::tournament-entry.tournament-entry').create({
			data: {
				user: userId,
				tournament: tournament.documentId ?? tournament.id,
				in_game_name: inGameName,
				anon_label: `Player ${randomBytes(4).toString('hex').toUpperCase()}`,
				tournament_entry_status: 'registered',
			},
		});

		return ctx.send({
			data: {
				documentId: entry.documentId,
				tournament_entry_status: entry.tournament_entry_status,
			},
		}, 201);
	},
}));
