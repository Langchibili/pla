export default {
  routes: [
    {
      method: 'GET',
      path: '/prize-payouts/mine',
      handler: 'prize-payout.mine',
      config: { policies: [] },
    },
  ],
};
