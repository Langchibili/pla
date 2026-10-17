export default {
  routes: [
    { method: 'POST', path: '/auth/pla/exchange', handler: 'game-profile.exchangePla', config: { auth: false, policies: [], middlewares: ['plugin::users-permissions.rateLimit'] } },
    { method: 'GET', path: '/me/game-profile', handler: 'game-profile.mine', config: { auth: { scope: [] }, policies: [] } },
    { method: 'POST', path: '/me/game-profile/initialise', handler: 'game-profile.initialise', config: { auth: { scope: [] }, policies: [] } },
    { method: 'GET', path: '/game-profiles/:documentId/public-summary', handler: 'game-profile.publicSummary', config: { auth: false, policies: [] } },
  ],
};
