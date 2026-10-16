export default {
  routes: [
    { method: 'GET', path: '/market-offers/catalog', handler: 'market-offer.catalog', config: { auth: false, policies: [] } },
    { method: 'POST', path: '/market-offers/:offerCode/purchase', handler: 'market-offer.purchase', config: { auth: { scope: [] }, policies: [] } },
  ],
};
