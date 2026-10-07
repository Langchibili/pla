export default {
  routes: [
    {
      method: 'POST',
      path: '/tournament-entries/join',
      handler: 'tournament-entry.join',
      config: { policies: [] },
    },
  ],
};
