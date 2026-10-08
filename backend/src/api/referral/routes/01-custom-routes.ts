export default {
	routes: [
		{
			method: 'GET',
			path: '/me/referrals',
			handler: 'referral.mine',
			config: { policies: [] },
		},
	],
};
