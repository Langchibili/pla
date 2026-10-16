export default {
  routes: [
    { method: 'GET', path: '/me/coin-wallet', handler: 'coin-wallet.mine', config: { auth: { scope: [] }, policies: [] } },
  ],
};
