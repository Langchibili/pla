export default {
  routes: [
    { method: 'GET', path: '/leaderboards/xp', handler: 'leaderboard-entry.topXp', config: { auth: false, policies: [] } },
  ],
};
