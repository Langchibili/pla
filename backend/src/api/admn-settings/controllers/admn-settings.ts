import { factories } from '@strapi/strapi';
import { resolveSettingsForCountry } from '../../../services/settingsResolver';

export default factories.createCoreController('api::admn-settings.admn-settings', ({ strapi }) => ({
	async publicConfig(ctx: any) {
		const userId = Number(ctx.state.user?.id);
		if (!Number.isInteger(userId) || userId < 1) return ctx.unauthorized();
		const user = await strapi.db.query('plugin::users-permissions.user').findOne({
			where: { id: userId },
			select: ['id'],
			populate: { country: { select: ['id'] } },
		});
		const settings = await resolveSettingsForCountry(strapi, user?.country?.id);
		return ctx.send({
			data: {
				score_on_forfeit: settings.score_on_forfeit,
				suspended_match_score: settings.suspended_match_score,
				suspended_match_points: settings.suspended_match_points,
				win_points: settings.win_points,
				draw_points: settings.draw_points,
				loss_points: settings.loss_points,
				transfers_enabled: settings.transfers_enabled,
				default_match_time_limit_hours: settings.default_match_time_limit_hours,
				postponement_response_hours: settings.postponement_response_hours,
				max_postponements_per_match: settings.max_postponements_per_match,
				single_submission_grace_hours: settings.single_submission_grace_hours,
			},
		});
	},
}));
