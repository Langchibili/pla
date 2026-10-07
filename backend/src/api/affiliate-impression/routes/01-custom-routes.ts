export default {
  routes: [
    {
      method: 'POST',
      path: '/affiliate-impressions/track',
      handler: 'affiliate-impression.track',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/affiliate-impressions/check',
      handler: 'affiliate-impression.check',
      config: { auth: false },
    },
  ],
};
