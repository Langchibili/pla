export default {
  routes: [
    { method: 'POST', path: '/integration/pla/fixtures/assign', handler: 'pla-fixture-link.assign', config: { auth: false, policies: [] } },
    { method: 'POST', path: '/integration/pla/outbox/flush', handler: 'pla-fixture-link.flushOutbox', config: { auth: false, policies: [] } },
  ],
};
