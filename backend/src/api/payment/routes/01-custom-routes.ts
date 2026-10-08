export default {
  routes: [
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
