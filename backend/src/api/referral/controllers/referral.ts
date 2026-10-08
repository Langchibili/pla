import { factories } from '@strapi/strapi';

const REFERRAL_UID = 'api::referral.referral';

export default factories.createCoreController(REFERRAL_UID, ({ strapi }) => ({
	async mine(ctx: any) {
		const userId = Number(ctx.state.user?.id);
		if (!Number.isInteger(userId) || userId < 1) return ctx.unauthorized();

		const [user, referrals] = await Promise.all([
			strapi.db.query('plugin::users-permissions.user').findOne({
				where: { id: userId },
				select: ['referral_code'],
			}),
			strapi.db.query(REFERRAL_UID).findMany({
				where: { referrer: userId },
				select: ['referral_status', 'reward_plapo', 'rewarded_at', 'createdAt'],
				orderBy: { createdAt: 'desc' },
			}),
		]);

		return ctx.send({
			data: {
				code: user?.referral_code ?? null,
				pending: referrals.filter((referral: any) => referral.referral_status === 'pending').length,
				rewarded: referrals.filter((referral: any) => referral.referral_status === 'rewarded').length,
				referrals,
			},
		});
	},
}));
