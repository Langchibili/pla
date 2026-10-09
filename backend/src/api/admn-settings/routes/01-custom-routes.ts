export default {
  routes: [
    {
      method: 'GET',
      path: '/admn-settings/frontend-mode',
      handler: 'admn-settings.frontendMode',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/admn-settings/public-config',
      handler: 'admn-settings.publicConfig',
      config: { policies: [] },
    },
  ],
};
