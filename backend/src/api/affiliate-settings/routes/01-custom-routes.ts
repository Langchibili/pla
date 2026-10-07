export default {
  routes: [
    {
      method: 'GET',
      path: '/affiliate-settings/conditions-template',
      handler: 'affiliate-settings.conditionsTemplate',
      config: { auth: false },
    },
  ],
};
