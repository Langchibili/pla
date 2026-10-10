import type { Core } from '@strapi/strapi';
import { publishSocketEvent } from './socketRelayService';
import { sendExpoPushNotification } from './notificationService';

const NOTIFICATION_UID = 'api::app-notification.app-notification';

export async function createUserNotification(
	strapi: Core.Strapi,
	params: {
		userId: number;
		title: string;
		body: string;
		type: string;
		data?: Record<string, unknown>;
		idempotencyKey: string;
	},
): Promise<void> {
	if (!Number.isSafeInteger(params.userId) || params.userId < 1) {
		throw new Error('A valid notification recipient is required');
	}
	if (!params.title.trim() || !params.body.trim() || !params.type.trim()) {
		throw new Error('Notification title, body, and type are required');
	}

	let notification: any;
	try {
		notification = await strapi.db.query(NOTIFICATION_UID).create({
			data: {
				user: params.userId,
				title: params.title,
				body: params.body,
				notification_type: params.type,
				data: params.data ?? {},
				idempotency_key: params.idempotencyKey,
			},
		});
	} catch (error) {
		const existing = await strapi.db.query(NOTIFICATION_UID).findOne({
			where: { idempotency_key: params.idempotencyKey },
			select: ['id'],
		});
		if (existing) return;
		throw error;
	}

	const payload = {
		documentId: notification.documentId,
		title: params.title,
		body: params.body,
		type: params.type,
		data: params.data ?? {},
		createdAt: notification.createdAt,
	};
	try {
		await publishSocketEvent(strapi, 'notification:new', { type: 'user', id: params.userId }, payload);
	} catch (error) {
		strapi.log.warn(`[AppNotification] Socket delivery failed for user ${params.userId}`, error);
	}
	try {
		await sendExpoPushNotification(strapi, params.userId, {
			title: params.title,
			body: params.body,
			data: { ...params.data, notificationId: notification.documentId },
		});
	} catch (error) {
		strapi.log.warn(`[AppNotification] Push delivery failed for user ${params.userId}`, error);
	}
}
