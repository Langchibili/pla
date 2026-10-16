export default {
  routes: [
    { method: 'GET', path: '/me/club', handler: 'club.mine', config: { auth: { scope: [] }, policies: [] } },
    { method: 'GET', path: '/clubs/:documentId/squad', handler: 'club.squad', config: { auth: { scope: [] }, policies: [] } },
    { method: 'POST', path: '/clubs/:documentId/formation', handler: 'club.chooseFormation', config: { auth: { scope: [] }, policies: [] } },
    { method: 'POST', path: '/clubs/:documentId/manager', handler: 'club.chooseManager', config: { auth: { scope: [] }, policies: [] } },
    { method: 'POST', path: '/clubs/:documentId/stadium', handler: 'club.chooseStadium', config: { auth: { scope: [] }, policies: [] } },
    { method: 'POST', path: '/clubs/:documentId/kit', handler: 'club.chooseKit', config: { auth: { scope: [] }, policies: [] } },
  ],
};
