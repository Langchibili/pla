export default {
	routes: [
		{
			method: 'GET',
			path: '/me/wallet',
			handler: 'plapo-ledger.wallet',
			config: { policies: [] },
		},
		{
			method: 'GET',
			path: '/me/wallet/ledger',
			handler: 'plapo-ledger.mine',
			config: { policies: [] },
		},
		{
			method: 'POST',
			path: '/me/wallet/transfer',
			handler: 'plapo-ledger.transfer',
			config: { policies: [] },
		},
	],
};
