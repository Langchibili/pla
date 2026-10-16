export default {
  routes: [
    { method: 'GET', path: '/store/offers', handler: 'store-purchase.offers', config: { auth: { scope: [] }, policies: [] } },
    { method: 'POST', path: '/store/purchase-intents', handler: 'store-purchase.intent', config: { auth: { scope: [] }, policies: [] } },
    { method: 'POST', path: '/integration/store/fulfil', handler: 'store-purchase.fulfil', config: { auth: false, policies: [] } },
  ],
};
