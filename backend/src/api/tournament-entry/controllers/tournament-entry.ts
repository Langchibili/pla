import { factories } from '@strapi/strapi';
import { randomBytes } from 'crypto';
import { createTournamentEntryWithPlapoCharge } from '../../../services/plapoLedgerService';

export default factories.createCoreController('api::tournament-entry.tournament-entry', ({ strapi }) => ({
	async mine(ctx: any) {
		const userId = Number(ctx.state.user?.id);
		if (!Number.isInteger(userId) || userId < 1) return ctx.unauthorized();

		const entries = await strapi.db.query('api::tournament-entry.tournament-entry').findMany({
			where: { user: userId },
			select: [
				'documentId',
				'in_game_name',
				'anon_label',
				'tournament_entry_status',
				'points',
				'matches_played',
				'wins',
				'draws',
				'losses',
				'goals_for',
				'goals_against',
			],
			populate: {
				tournament: { select: ['documentId', 'title', 'slug', 'tournament_status'] },
				current_stage: { select: ['documentId', 'stage_name', 'stage_order'] },
			},
			orderBy: { createdAt: 'desc' },
			limit: 100,
		});
		return ctx.send({ data: entries });
	},

	async leaderboard(ctx: any) {
		const tournamentId = String(ctx.query.tournament_id ?? ctx.query.tournamentId ?? '');
		if (!tournamentId) return ctx.badRequest('tournament_id is required');

		const entries = await strapi.db.query('api::tournament-entry.tournament-entry').findMany({
			where: /^\d+$/.test(tournamentId)
				? { $or: [{ tournament: { id: Number(tournamentId) } }, { tournament: { documentId: tournamentId } }] }
				: { tournament: { documentId: tournamentId } },
			populate: { user: { select: ['id'] } },
			orderBy: [
				{ points: 'desc' },
				{ wins: 'desc' },
				{ goals_for: 'desc' },
			],
			limit: 100,
		});
		const userId = Number(ctx.state.user?.id);

		return ctx.send({
			data: entries.map((entry: any) => ({
				documentId: entry.documentId,
				anon_label: entry.anon_label,
				tournament_entry_status: entry.tournament_entry_status,
				points: entry.points,
				matches_played: entry.matches_played,
				wins: entry.wins,
				draws: entry.draws,
				losses: entry.losses,
				goals_for: entry.goals_for,
				goals_against: entry.goals_against,
				is_me: Number(entry.user?.id) === userId,
			})),
		});
	},

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
			populate: {
				game: true,
				country: { select: ['id'] },
				countries: { select: ['id'] },
			},
		});
		if (!tournament) return ctx.notFound('Tournament not found');
		const entryFee = tournament.requires_entry_fee ? Number(tournament.entry_fee_plapo) : 0;
		if (!Number.isInteger(entryFee) || entryFee < 0) return ctx.badRequest('Tournament entry fee is invalid');
		if (tournament.tournament_status !== 'registration_open') return ctx.badRequest('Registration is not open');
		if (tournament.registration_closes_at && new Date(tournament.registration_closes_at).getTime() <= Date.now()) {
			return ctx.badRequest('Registration has closed');
		}
		if (tournament.game?.game_status !== 'active') return ctx.badRequest('This game is not active');
		if (!tournament.opentoall) {
			const eligibleCountries = tournament.countries ?? [];
			const userCountryId = Number(user.country?.id);
			if (eligibleCountries.length > 0) {
				if (!eligibleCountries.some((country: any) => Number(country.id) === userCountryId)) {
					return ctx.forbidden('This tournament is not available in your country');
				}
			} else if (tournament.country?.id) {
				if (Number(tournament.country.id) !== userCountryId) {
					return ctx.forbidden('This tournament is not available in your country');
				}
			} else {
				return ctx.forbidden('This tournament has no eligible countries configured');
			}
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

		let result;
		try {
			result = await createTournamentEntryWithPlapoCharge(strapi, {
				userId,
				tournamentId: tournament.id,
				amount: entryFee,
				idempotencyKey: `tournament-entry:${tournament.documentId ?? tournament.id}:${userId}`,
				entryData: {
					user: userId,
					tournament: tournament.documentId ?? tournament.id,
					in_game_name: inGameName,
					anon_label: `Player ${randomBytes(4).toString('hex').toUpperCase()}`,
					tournament_entry_status: 'registered',
				},
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Tournament entry failed';
			if (message.includes('Plapo balance')) return ctx.badRequest(message);
			if (message.includes('already charged')) return ctx.conflict(message);
			throw error;
		}

		return ctx.send({
			data: {
				documentId: result.entry.documentId,
				tournament_entry_status: result.entry.tournament_entry_status,
				plapo_balance: result.balance,
			},
		}, 201);
	},
}));
