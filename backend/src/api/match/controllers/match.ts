import { factories } from '@strapi/strapi';
import { createHash } from 'crypto';
import { resolveSettingsForCountry } from '../../../services/settingsResolver';

const MATCH_UID = 'api::match.match';
const ENTRY_UID = 'api::tournament-entry.tournament-entry';
const EVENT_UID = 'api::match-event.match-event';
const OPEN_MATCH_STATUSES = ['scheduled', 'postponed', 'awaiting_confirmation'];

async function findMatch(strapi: any, id: string) {
	return strapi.db.query(MATCH_UID).findOne({
		where: /^\d+$/.test(id)
			? { $or: [{ id: Number(id) }, { documentId: id }] }
			: { documentId: id },
		populate: {
			tournament: {
				populate: {
					country: { select: ['id'] },
					game: { populate: { screenshotExample: true } },
				},
			},
			tournament_stage: true,
			player1_entry: { populate: { user: { select: ['id'] } } },
			player2_entry: { populate: { user: { select: ['id'] } } },
			submissions: { populate: { user: { select: ['id'] }, screenshot: true } },
			events: true,
		},
	});
}

function participantView(match: any, userId: number) {
	const isPlayer1 = Number(match.player1_entry?.user?.id) === userId;
	const ownEntry = isPlayer1 ? match.player1_entry : match.player2_entry;
	const opponentEntry = isPlayer1 ? match.player2_entry : match.player1_entry;
	return {
		documentId: match.documentId,
		match_status: match.match_status,
		match_deadline: match.match_deadline,
		match_code: match.match_code,
		postponement_count: match.postponement_count,
		dispute_status: match.dispute_status,
		is_bye: match.is_bye,
		screenshot_example: match.tournament?.game?.screenshotExample
			? {
				url: match.tournament.game.screenshotExample.url,
				alternativeText: match.tournament.game.screenshotExample.alternativeText,
			}
			: null,
		opponent_label: opponentEntry?.anon_label ?? 'Opponent',
		player1_score: isPlayer1 ? match.player1_score : match.player2_score,
		player2_score: isPlayer1 ? match.player2_score : match.player1_score,
		submissions: (match.submissions ?? []).map((submission: any) => ({
			documentId: submission.documentId,
			mine: Number(submission.user?.id) === userId,
			match_submission_status: submission.match_submission_status,
			screenshot: submission.screenshot
				? { url: submission.screenshot.url, mime: submission.screenshot.mime }
				: null,
		})),
		events: (match.events ?? []).map((event: any) => ({
			event_type: event.event_type,
			match_event_status: event.match_event_status,
			proposed_slots: event.proposed_slots,
			response_due_at: event.response_due_at,
		})),
		own_entry: ownEntry?.documentId,
	};
}

function isParticipant(match: any, userId: number): boolean {
	return [match.player1_entry?.user?.id, match.player2_entry?.user?.id]
		.some((participantId) => Number(participantId) === userId);
}

export default factories.createCoreController(MATCH_UID, ({ strapi }) => ({
	async mine(ctx: any) {
		const userId = Number(ctx.state.user?.id);
		if (!Number.isInteger(userId) || userId < 1) return ctx.unauthorized();

		const matches = await strapi.db.query(MATCH_UID).findMany({
			where: {
				$or: [
					{ player1_entry: { user: { id: userId } } },
					{ player2_entry: { user: { id: userId } } },
				],
			},
			populate: {
				player1_entry: { populate: { user: { select: ['id'] } } },
				player2_entry: { populate: { user: { select: ['id'] } } },
				submissions: { populate: { user: { select: ['id'] } } },
			},
			orderBy: { match_deadline: 'asc' },
		});

		return ctx.send({
			data: matches
				.filter((match: any) => isParticipant(match, userId))
				.map((match: any) => participantView(match, userId)),
		});
	},

	async room(ctx: any) {
		const userId = Number(ctx.state.user?.id);
		if (!Number.isInteger(userId) || userId < 1) return ctx.unauthorized();
		const match = await findMatch(strapi, String(ctx.params.id ?? ''));
		if (!match) return ctx.notFound('Match not found');
		if (!isParticipant(match, userId)) return ctx.forbidden('Only match participants can view this room');
		return ctx.send({ data: participantView(match, userId) });
	},

	async postpone(ctx: any) {
		const userId = Number(ctx.state.user?.id);
		if (!Number.isInteger(userId) || userId < 1) return ctx.unauthorized();
		const match = await findMatch(strapi, String(ctx.params.id ?? ''));
		if (!match) return ctx.notFound('Match not found');
		if (!isParticipant(match, userId)) return ctx.forbidden('Only match participants can request a postponement');
		if (!OPEN_MATCH_STATUSES.includes(match.match_status)) return ctx.badRequest('This match cannot be postponed');

		const settings = await resolveSettingsForCountry(strapi, match.tournament?.country?.id);
		if (Number(match.postponement_count ?? 0) >= Number(settings.max_postponements_per_match ?? 1)) {
			return ctx.badRequest('The postponement limit for this match has been reached');
		}

		const slots = ctx.request.body?.proposed_slots;
		if (!Array.isArray(slots) || slots.length < 1 || slots.length > 3) {
			return ctx.badRequest('Provide one to three proposed match times');
		}
		const parsedSlots = slots.map((slot: unknown) => new Date(String(slot)));
		if (parsedSlots.some((slot: Date) => !Number.isFinite(slot.getTime()) || slot.getTime() <= Date.now())) {
			return ctx.badRequest('Proposed match times must be valid future dates');
		}
		const reasonCode = ctx.request.body?.reason_code;
		if (reasonCode !== undefined && !['technical_difficulty', 'emergency', 'other'].includes(reasonCode)) {
			return ctx.badRequest('The postponement reason is invalid');
		}
		if (match.tournament_stage?.ends_at) {
			const stageEnd = new Date(match.tournament_stage.ends_at).getTime();
			if (parsedSlots.some((slot: Date) => slot.getTime() > stageEnd)) {
				return ctx.badRequest('Proposed match times must be before the stage ends');
			}
		}

		const slotSignature = createHash('sha256')
			.update(parsedSlots.map((slot: Date) => slot.toISOString()).join('|'))
			.digest('hex')
			.slice(0, 16);
		const idempotencyKey = `postpone:${match.documentId}:${userId}:${slotSignature}`;
		const existing = await strapi.db.query(EVENT_UID).findOne({
			where: { idempotency_key: idempotencyKey },
			select: ['documentId', 'match_event_status'],
		});
		if (existing?.match_event_status === 'open') {
			return ctx.send({ data: { documentId: existing.documentId, match_event_status: 'open' } });
		}

		const event = await strapi.documents(EVENT_UID).create({
			data: {
				match: match.documentId ?? match.id,
				actor: userId,
				event_type: 'postpone_request',
				reason_code: reasonCode,
				proposed_slots: parsedSlots.map((slot: Date) => slot.toISOString()),
				proposed_time: parsedSlots[0].toISOString(),
				response_due_at: new Date(
					Date.now() + Number(settings.postponement_response_hours ?? 6) * 60 * 60 * 1000,
				).toISOString(),
				match_event_status: 'open',
				idempotency_key: idempotencyKey,
			},
		});
		return ctx.send({ data: { documentId: event.documentId, match_event_status: 'open' } }, 201);
	},

	async forfeit(ctx: any) {
		const userId = Number(ctx.state.user?.id);
		if (!Number.isInteger(userId) || userId < 1) return ctx.unauthorized();
		const match = await findMatch(strapi, String(ctx.params.id ?? ''));
		if (!match) return ctx.notFound('Match not found');
		if (!isParticipant(match, userId)) return ctx.forbidden('Only match participants can forfeit');
		if (!match.player1_entry || !match.player2_entry) return ctx.badRequest('A bye cannot be forfeited');
		if (!OPEN_MATCH_STATUSES.includes(match.match_status)) return ctx.badRequest('This match is already resolved');

		const forfeitingEntry = Number(match.player1_entry.user.id) === userId
			? match.player1_entry
			: match.player2_entry;
		const winningEntry = forfeitingEntry.id === match.player1_entry.id
			? match.player2_entry
			: match.player1_entry;
		const settings = await resolveSettingsForCountry(strapi, match.tournament?.country?.id);
		const [winnerScore, loserScore] = String(settings.score_on_forfeit ?? '2:0')
			.split(':')
			.map((value: string) => Number(value.trim()));
		if (!Number.isInteger(winnerScore) || !Number.isInteger(loserScore)) {
			return ctx.internalServerError('The configured forfeit score is invalid');
		}

		const player1Won = winningEntry.id === match.player1_entry.id;
		const player1Score = player1Won ? winnerScore : loserScore;
		const player2Score = player1Won ? loserScore : winnerScore;
		const player1Entry = match.player1_entry;
		const player2Entry = match.player2_entry;
		const winnerPoints = Number(settings.win_points ?? 3);
		const loserPoints = Number(settings.loss_points ?? 0);
		await strapi.db.transaction(async () => {
			await strapi.db.query(MATCH_UID).update({
				where: { id: match.id },
				data: {
					match_status: 'forfeited',
					result_source: 'forfeit',
					winner_entry: winningEntry.id,
					player1_score: player1Score,
					player2_score: player2Score,
					resolved_at: new Date(),
				},
			});
			for (const [entry, won, goalsFor, goalsAgainst] of [
				[player1Entry, player1Won, player1Score, player2Score],
				[player2Entry, !player1Won, player2Score, player1Score],
			] as const) {
				await strapi.db.query(ENTRY_UID).update({
					where: { id: entry.id },
					data: {
						matches_played: Number(entry.matches_played ?? 0) + 1,
						wins: Number(entry.wins ?? 0) + (won ? 1 : 0),
						losses: Number(entry.losses ?? 0) + (won ? 0 : 1),
						points: Number(entry.points ?? 0) + (won ? winnerPoints : loserPoints),
						goals_for: Number(entry.goals_for ?? 0) + goalsFor,
						goals_against: Number(entry.goals_against ?? 0) + goalsAgainst,
					},
				});
			}
			await strapi.db.query(EVENT_UID).create({
				data: {
					match: match.id,
					actor: userId,
					event_type: 'forfeit',
					match_event_status: 'applied',
					idempotency_key: `forfeit:${match.documentId}:${userId}`,
				},
			});
		});
		return ctx.send({ data: { match_status: 'forfeited', winner_entry: winningEntry.documentId } });
	},

	async dispute(ctx: any) {
		const userId = Number(ctx.state.user?.id);
		if (!Number.isInteger(userId) || userId < 1) return ctx.unauthorized();
		const match = await findMatch(strapi, String(ctx.params.id ?? ''));
		if (!match) return ctx.notFound('Match not found');
		if (!isParticipant(match, userId)) return ctx.forbidden('Only match participants can dispute this match');
		if (match.match_status === 'in_dispute' && match.dispute_status === 'open') {
			return ctx.send({ data: { match_status: 'in_dispute', dispute_status: 'open' } });
		}
		if (!OPEN_MATCH_STATUSES.includes(match.match_status)) return ctx.badRequest('This match cannot be disputed');
		if (!(match.submissions ?? []).length) return ctx.badRequest('Submit result evidence before opening a dispute');

		const idempotencyKey = `dispute:${match.documentId}:${userId}`;
		await strapi.db.transaction(async () => {
			const existingEvent = await strapi.db.query(EVENT_UID).findOne({
				where: { idempotency_key: idempotencyKey },
				select: ['id'],
			});
			if (!existingEvent) {
				await strapi.db.query(EVENT_UID).create({
					data: {
						match: match.id,
						actor: userId,
						event_type: 'dispute_opened',
						match_event_status: 'applied',
						idempotency_key: idempotencyKey,
					},
				});
			}
			await strapi.db.query(MATCH_UID).update({
				where: { id: match.id },
				data: { match_status: 'in_dispute', dispute_status: 'open', dispute_opened_by: userId },
			});
		});
		return ctx.send({ data: { match_status: 'in_dispute', dispute_status: 'open' } });
	},
}));
