export default {
  routes: [
    { method: 'POST', path: '/club-players/:documentId/develop', handler: 'club-player.develop', config: { auth: { scope: [] }, policies: [] } },
    { method: 'POST', path: '/club-players/:documentId/rename', handler: 'club-player.rename', config: { auth: { scope: [] }, policies: [] } },
  ],
};
