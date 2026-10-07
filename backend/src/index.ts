import type { Core } from '@strapi/strapi';
import { awardReferralAfterTournamentEntry } from './services/referralService';
import { queueScoreSubmission } from './services/scoreSubmissionService';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap({ strapi }: { strapi: Core.Strapi }) {
    strapi.db.lifecycles.subscribe({
      models: ['api::tournament-entry.tournament-entry'],
      async afterCreate(event: any) {
        const userValue = event.result?.user ?? event.params?.data?.user;
        const userId = Number(userValue?.id ?? userValue);
        if (!Number.isInteger(userId) || userId < 1) return;
        try {
          await awardReferralAfterTournamentEntry(strapi, userId);
        } catch (error) {
          strapi.log.error('[Affiliate] Referral reward evaluation failed', error);
        }
      },
    });

    strapi.db.lifecycles.subscribe({
      models: ['api::match-submission.match-submission'],
      async afterCreate(event: any) {
        const submissionId = Number(event.result?.id);
        if (!Number.isInteger(submissionId) || submissionId < 1) return;
        await queueScoreSubmission(strapi, submissionId);
      },
    });
  },
};
