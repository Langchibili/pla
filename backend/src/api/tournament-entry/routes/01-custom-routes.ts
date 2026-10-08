export default {
  routes: [
    {
      method: 'GET',
      path: '/tournament-entries/mine',
      handler: 'tournament-entry.mine',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/tournament-entries/leaderboard',
      handler: 'tournament-entry.leaderboard',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/tournament-entries/join',
      handler: 'tournament-entry.join',
      config: { policies: [] },
    },
  ],
};
