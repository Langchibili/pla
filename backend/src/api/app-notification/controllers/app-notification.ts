import { factories } from '@strapi/strapi';

const NOTIFICATION_UID = 'api::app-notification.app-notification';

export default factories.createCoreController(NOTIFICATION_UID, ({ strapi }) => ({
	async mine(ctx: any) {
		const userId = Number(ctx.state.user?.id);
		if (!Number.isSafeInteger(userId) || userId < 1) return ctx.unauthorized();
		const requestedStart = Number(ctx.query.start ?? 0);
		const start = Number.isSafeInteger(requestedStart) && requestedStart > 0 ? requestedStart : 0;
		const limit = 50;

		const [notifications, total, unread] = await Promise.all([
			strapi.db.query(NOTIFICATION_UID).findMany({
				where: { user: userId },
				select: ['documentId', 'title', 'body', 'notification_type', 'data', 'read_at', 'createdAt'],
				orderBy: { createdAt: 'desc' },
				limit,
				offset: start,
			}),
			strapi.db.query(NOTIFICATION_UID).count({ where: { user: userId } }),
			strapi.db.query(NOTIFICATION_UID).count({ where: { user: userId, read_at: null } }),
		]);
		return ctx.send({
			data: {
				notifications,
				unread,
				pagination: { start, limit, total },
			},
		});
	},

	async markRead(ctx: any) {
		const userId = Number(ctx.state.user?.id);
		if (!Number.isSafeInteger(userId) || userId < 1) return ctx.unauthorized();
		const documentId = String(ctx.params.documentId ?? '');
		const notification = await strapi.db.query(NOTIFICATION_UID).findOne({
			where: { documentId, user: userId },
			select: ['id', 'read_at'],
		});
		if (!notification) return ctx.notFound('Notification not found');
		if (!notification.read_at) {
			await strapi.db.query(NOTIFICATION_UID).update({
				where: { id: notification.id },
				data: { read_at: new Date() },
			});
		}
		return ctx.send({ data: { documentId, read_at: notification.read_at ?? new Date() } });
	},

	async setReadState(ctx: any) {
		const userId = Number(ctx.state.user?.id);
		if (!Number.isSafeInteger(userId) || userId < 1) return ctx.unauthorized();
		if (typeof ctx.request.body?.read !== 'boolean') {
			return ctx.badRequest('read must be a boolean');
		}
		const documentId = String(ctx.params.documentId ?? '');
		const notification = await strapi.db.query(NOTIFICATION_UID).findOne({
			where: { documentId, user: userId },
			select: ['id'],
		});
		if (!notification) return ctx.notFound('Notification not found');
		const readAt = ctx.request.body.read ? new Date() : null;
		await strapi.db.query(NOTIFICATION_UID).update({
			where: { id: notification.id },
			data: { read_at: readAt },
		});
		return ctx.send({ data: { documentId, read_at: readAt } });
	},

	async markAllRead(ctx: any) {
		const userId = Number(ctx.state.user?.id);
		if (!Number.isSafeInteger(userId) || userId < 1) return ctx.unauthorized();
		const readAt = new Date();
		await strapi.db.query(NOTIFICATION_UID).updateMany({
			where: { user: userId, read_at: null },
			data: { read_at: readAt },
		});
		return ctx.send({ data: { read_at: readAt } });
	},
}));
