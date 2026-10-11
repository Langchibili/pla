import { closeExpiredTournamentStages } from '../src/services/matchResultService';

const cronTasks = {
  closeExpiredTournamentStages: {
    task: async ({ strapi }: { strapi: any }) => {
      await closeExpiredTournamentStages(strapi);
    },
    options: { rule: '* * * * *', tz: 'UTC' },
  },
};

export default cronTasks;
