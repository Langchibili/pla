export default {
  routes: [
    {
      method: 'GET',
      path: '/admn-settings/public-config',
      handler: 'admn-settings.publicConfig',
      config: { policies: [] },
    },
  ],
};
