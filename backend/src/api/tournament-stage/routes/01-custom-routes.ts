export default {
  routes: [
    {
      method: 'GET',
      path: '/tournament-stages/:id/schedule',
      handler: 'tournament-stage.schedule',
      config: { auth: false },
    },
  ],
};
