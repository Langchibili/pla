export default {
  routes: [
    { method: 'POST', path: '/training-sessions/start', handler: 'training-session.start', config: { auth: { scope: [] }, policies: [] } },
  ],
};
