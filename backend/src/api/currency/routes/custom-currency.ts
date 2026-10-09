export default {
	routes: [
		{
			method: 'POST',
			path: '/currencies/convert-price',
			handler: 'currency.convertPrice',
			config: { auth: {} },
		},
	],
};
