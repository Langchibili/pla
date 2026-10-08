import { factories } from '@strapi/strapi';

const PAYOUT_UID = 'api::prize-payout.prize-payout';

export default factories.createCoreController(PAYOUT_UID, ({ strapi }) => ({
	async mine(ctx: any) {
		const userId = Number(ctx.state.user?.id);
		if (!Number.isInteger(userId) || userId < 1) return ctx.unauthorized();

		const payouts = await strapi.db.query(PAYOUT_UID).findMany({
			where: { user: userId },
			select: ['documentId', 'place', 'amount', 'prize_payout_status', 'approved_at', 'paid_at', 'createdAt'],
			populate: {
				tournament: { select: ['documentId', 'title'] },
				currency: { select: ['code', 'symbol'] },
			},
			orderBy: { createdAt: 'desc' },
			limit: 100,
		});
		return ctx.send({ data: payouts });
	},
}));
