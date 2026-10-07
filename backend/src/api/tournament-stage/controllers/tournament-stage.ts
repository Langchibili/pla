import { factories } from '@strapi/strapi';
import { createHash } from 'crypto';

export default factories.createCoreController('api::tournament-stage.tournament-stage', ({ strapi }) => ({
	async schedule(ctx: any) {
		const stageId = String(ctx.params.id ?? '');
		const stage = await strapi.db.query('api::tournament-stage.tournament-stage').findOne({
			where: /^\d+$/.test(stageId)
				? { $or: [{ id: Number(stageId) }, { documentId: stageId }] }
				: { documentId: stageId },
			populate: {
				tournament: { select: ['documentId', 'title', 'tournament_status'] },
				matches: {
					populate: {
						player1_entry: { select: ['documentId', 'anon_label'] },
						player2_entry: { select: ['documentId', 'anon_label'] },
					},
				},
			},
		});

		if (!stage) return ctx.notFound('Stage not found');
		if (!['published', 'registration_open', 'registration_closed', 'in_progress', 'completed'].includes(stage.tournament?.tournament_status)) {
			return ctx.notFound('Schedule not found');
		}

		const anonymousLabel = (entry: any) => {
			if (!entry) return null;
			if (entry.anon_label) return entry.anon_label;
			const suffix = createHash('sha256').update(String(entry.documentId)).digest('hex').slice(0, 7).toUpperCase();
			return `Player ${suffix}`;
		};

		return ctx.send({
			data: {
				stage: {
					documentId: stage.documentId,
					name: stage.stage_name,
					order: stage.stage_order,
					starts_at: stage.starts_at,
					ends_at: stage.ends_at,
					status: stage.tournament_stage_status,
				},
				matches: (stage.matches ?? []).map((match: any) => ({
					status: match.match_status,
					deadline: match.match_deadline,
					player1: anonymousLabel(match.player1_entry),
					player2: anonymousLabel(match.player2_entry),
					player1_score: match.player1_score,
					player2_score: match.player2_score,
					is_bye: match.is_bye,
				})),
			},
		});
	},
}));
