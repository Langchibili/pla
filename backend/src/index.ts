import type { Core } from '@strapi/strapi';
import { awardReferralAfterTournamentEntry } from './services/referralService';
import { queueScoreSubmission } from './services/scoreSubmissionService';

function getRelationReference(value: any): { id?: number; documentId?: string } | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return { id: value };
  if (typeof value === 'string') {
    if (/^\d+$/.test(value)) return { id: Number(value) };
    return value ? { documentId: value } : null;
  }
  if (Array.isArray(value)) return getRelationReference(value[0]);
  if (!value || typeof value !== 'object') return null;

  if (Number.isSafeInteger(Number(value.id)) && Number(value.id) > 0) return { id: Number(value.id) };
  if (typeof value.documentId === 'string' && value.documentId) return { documentId: value.documentId };
  return getRelationReference(value.connect ?? value.set ?? value.disconnect);
}

async function getRelatedUserId(strapi: Core.Strapi, value: any): Promise<number | null> {
  const reference = getRelationReference(value);
  if (!reference) return null;
  if (reference.id) return reference.id;

  const user = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { documentId: reference.documentId },
    select: ['id'],
  });
  return user?.id ? Number(user.id) : null;
}

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
        try {
          const userId = await getRelatedUserId(strapi, userValue);
          if (!userId) {
            strapi.log.error('[Affiliate] Could not resolve the tournament-entry user');
            return;
          }
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
