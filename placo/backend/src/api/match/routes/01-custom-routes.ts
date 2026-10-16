export default {
  routes: [
    { method: 'POST', path: '/matches/:documentId/start', handler: 'match.start', config: { auth: { scope: [] }, policies: [] } },
    { method: 'GET', path: '/me/matches', handler: 'match.mine', config: { auth: { scope: [] }, policies: [] } },
    { method: 'POST', path: '/matches/engine-finalise', handler: 'match.engineFinalise', config: { auth: false, policies: [] } },
  ],
};
