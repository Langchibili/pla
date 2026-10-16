export default {
  routes: [
    { method: 'POST', path: '/rewarded-ads/start', handler: 'rewarded-ad-impression.start', config: { auth: { scope: [] }, policies: [] } },
    { method: 'POST', path: '/integration/ads/reward-callback', handler: 'rewarded-ad-impression.providerCallback', config: { auth: false, policies: [] } },
  ],
};
