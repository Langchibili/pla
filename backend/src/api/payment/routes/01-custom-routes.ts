export default {
  routes: [
    {
      method: 'GET',
      path: '/payments/mine',
      handler: 'payment.mine',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/payments/checkout',
      handler: 'payment.checkout',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/payments/webhook',
      handler: 'payment.webhook',
      config: { auth: false },
    },
  ],
};
