export default {
	routes: [
		{
			method: 'GET',
			path: '/me/notifications',
			handler: 'app-notification.mine',
			config: { policies: [] },
		},
		{
			method: 'POST',
			path: '/me/notifications/:documentId/read',
			handler: 'app-notification.markRead',
			config: { policies: [] },
		},
		{
			method: 'POST',
			path: '/me/notifications/:documentId/read-state',
			handler: 'app-notification.setReadState',
			config: { policies: [] },
		},
		{
			method: 'POST',
			path: '/me/notifications/read-all',
			handler: 'app-notification.markAllRead',
			config: { policies: [] },
		},
	],
};
