export default {
	routes: [
		{
			method: 'GET',
			path: '/me/matches',
			handler: 'match.mine',
			config: { policies: [] },
		},
		{
			method: 'GET',
			path: '/me/matches/:id',
			handler: 'match.room',
			config: { policies: [] },
		},
		{
			method: 'POST',
			path: '/matches/:id/postpone',
			handler: 'match.postpone',
			config: { policies: [] },
		},
		{
			method: 'POST',
			path: '/matches/:id/forfeit',
			handler: 'match.forfeit',
			config: { policies: [] },
		},
		{
			method: 'POST',
			path: '/matches/:id/dispute',
			handler: 'match.dispute',
			config: { policies: [] },
		},
	],
};
