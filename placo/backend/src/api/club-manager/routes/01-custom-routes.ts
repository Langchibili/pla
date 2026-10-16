export default {
  routes: [
    { method: 'GET', path: '/me/managers', handler: 'club-manager.mine', config: { auth: { scope: [] }, policies: [] } },
    { method: 'POST', path: '/club-managers/:documentId/rename', handler: 'club-manager.rename', config: { auth: { scope: [] }, policies: [] } },
  ],
};
