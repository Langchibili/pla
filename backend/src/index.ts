import type { Core } from '@strapi/strapi';
import { awardReferralAfterTournamentEntry } from './services/referralService';
import { queueScoreSubmission } from './services/scoreSubmissionService';
import { publishSocketEvent } from './services/socketRelayService';
import { createUserNotification } from './services/appNotificationService';
import { creditPlapoTournamentPrize } from './services/plapoLedgerService';
import { createTournamentPrizePayouts } from './services/prizePayoutService';

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

function getRelationRoomId(value: any): string | null {
  const reference = getRelationReference(value);
  return reference?.documentId ?? (reference?.id ? String(reference.id) : null);
}

async function publishSafely(
  strapi: Core.Strapi,
  event: string,
  target: { type: 'user' | 'tournament' | 'match'; id: string | number },
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await publishSocketEvent(strapi, event, target, payload);
  } catch (error) {
    strapi.log.warn(`[SocketRelay] Failed to publish ${event}`, error);
  }
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
          const tournamentId = getRelationRoomId(event.result?.tournament ?? event.params?.data?.tournament);
          const entryId = event.result?.documentId ?? event.result?.id;
          if (entryId) {
            await createUserNotification(strapi, {
              userId,
              title: 'Tournament entry confirmed',
              body: 'You are registered. Good luck in the tournament!',
              type: 'tournament_entry',
              data: { route: tournamentId ? `/tournaments/${tournamentId}` : '/tournaments', tournamentId },
              idempotencyKey: `tournament-entry-notification:${entryId}`,
            });
          }
          if (tournamentId) {
            await publishSafely(strapi, 'leaderboard:updated', { type: 'tournament', id: tournamentId }, {
              tournamentId,
            });
          }
        } catch (error) {
          strapi.log.error('[Affiliate] Referral reward evaluation failed', error);
        }
      },
    });

    strapi.db.lifecycles.subscribe({
      models: ['api::plapo-ledger.plapo-ledger'],
      async afterCreate(event: any) {
        const userId = await getRelatedUserId(
          strapi,
          event.result?.user ?? event.params?.data?.user,
        );
        if (!userId) {
          strapi.log.error('[SocketRelay] Could not resolve the wallet-ledger user');
          return;
        }
        await publishSafely(strapi, 'wallet:updated', { type: 'user', id: userId }, {});
      },
    });

    strapi.db.lifecycles.subscribe({
      models: ['api::prize-payout.prize-payout'],
      async afterCreate(event: any) {
        const payoutId = Number(event.result?.id);
        if (!Number.isSafeInteger(payoutId) || payoutId < 1) return;
        try {
          await creditPlapoTournamentPrize(strapi, payoutId);
        } catch (error) {
          strapi.log.error('[PrizePayout] Could not credit a paid Plapo prize', error);
        }
      },
      async afterUpdate(event: any) {
        const payoutId = Number(event.result?.id ?? event.params?.where?.id);
        if (!Number.isSafeInteger(payoutId) || payoutId < 1) return;
        try {
          await creditPlapoTournamentPrize(strapi, payoutId);
        } catch (error) {
          strapi.log.error('[PrizePayout] Could not credit a paid Plapo prize', error);
        }
      },
    });

    strapi.db.lifecycles.subscribe({
      models: ['api::tournament.tournament'],
      async afterUpdate(event: any) {
        const status = event.params?.data?.tournament_status ?? event.result?.tournament_status;
        if (status !== 'completed') return;
        const tournamentId = Number(event.result?.id ?? event.params?.where?.id);
        if (!Number.isSafeInteger(tournamentId) || tournamentId < 1) return;
        try {
          await createTournamentPrizePayouts(strapi, tournamentId);
        } catch (error) {
          strapi.log.error('[PrizePayout] Could not generate tournament prize payouts', error);
        }
      },
    });

    strapi.db.lifecycles.subscribe({
      models: ['api::match-submission.match-submission'],
      async afterCreate(event: any) {
        const submissionId = Number(event.result?.id);
        if (!Number.isInteger(submissionId) || submissionId < 1) return;
        try {
          await queueScoreSubmission(strapi, submissionId);
          const submission = await strapi.db.query('api::match-submission.match-submission').findOne({
            where: { id: submissionId },
            populate: {
              match: {
                populate: {
                  player1_entry: { populate: { user: { select: ['id'] } } },
                  player2_entry: { populate: { user: { select: ['id'] } } },
                },
              },
            },
          });
          const matchId = getRelationRoomId(submission?.match);
          if (!matchId) return;
          const userIds = new Set([
            submission.match.player1_entry?.user?.id,
            submission.match.player2_entry?.user?.id,
          ].filter((id) => Number.isSafeInteger(Number(id))).map(Number));
          await Promise.all([...userIds].map((userId) => publishSafely(
            strapi,
            'match:submission_received',
            { type: 'user', id: userId },
            { matchId },
          )));
          await Promise.all([...userIds].map((userId) => createUserNotification(strapi, {
            userId,
            title: 'Match screenshot received',
            body: 'A player submitted a result for your match.',
            type: 'match_submission',
            data: { route: `/matches/${matchId}`, matchId },
            idempotencyKey: `match-submission:${submission.documentId ?? submission.id}:user:${userId}`,
          })));
        } catch (error) {
          strapi.log.error('[ScoreSubmission] Could not queue or publish the submission event', error);
        }
      },
    });

    strapi.db.lifecycles.subscribe({
      models: ['api::match.match'],
      async afterUpdate(event: any) {
        const statusTransition = event.params?.data?.match_status;
        if (statusTransition !== 'completed' && statusTransition !== 'in_dispute') return;
        const matchId = Number(event.result?.id ?? event.params?.where?.id);
        if (!Number.isSafeInteger(matchId) || matchId < 1) return;
        try {
          const match = await strapi.db.query('api::match.match').findOne({
            where: { id: matchId },
            select: ['id', 'documentId', 'match_status'],
            populate: {
              tournament: { select: ['id', 'documentId'] },
              player1_entry: { populate: { user: { select: ['id'] } } },
              player2_entry: { populate: { user: { select: ['id'] } } },
            },
          });
          if (!match) return;
          const userIds = new Set([
            match.player1_entry?.user?.id,
            match.player2_entry?.user?.id,
          ].filter((id) => Number.isSafeInteger(Number(id))).map(Number));
          if (match.match_status === 'completed') {
            const matchRoomId = match.documentId ?? String(match.id);
            const tournamentRoomId = getRelationRoomId(match.tournament);
            await Promise.all([
              ...[...userIds].map((userId) => publishSafely(
                strapi,
                'match:result_ready',
                { type: 'user', id: userId },
                { matchId: matchRoomId },
              )),
              ...[...userIds].map((userId) => createUserNotification(strapi, {
                userId,
                title: 'Match result ready',
                body: 'Your match result is ready to view.',
                type: 'match_result',
                data: { route: `/matches/${matchRoomId}`, matchId: matchRoomId },
                idempotencyKey: `match-result:${match.documentId ?? match.id}:user:${userId}`,
              })),
              ...(tournamentRoomId ? [publishSafely(
                strapi,
                'leaderboard:updated',
                { type: 'tournament', id: tournamentRoomId },
                { tournamentId: tournamentRoomId },
              )] : []),
            ]);
          } else if (match.match_status === 'in_dispute') {
            const matchRoomId = match.documentId ?? String(match.id);
            await Promise.all([...userIds].map((userId) => publishSafely(
              strapi,
              'match:dispute_opened',
              { type: 'user', id: userId },
              { matchId: matchRoomId },
            )));
            await Promise.all([...userIds].map((userId) => createUserNotification(strapi, {
              userId,
              title: 'Match dispute opened',
              body: 'A dispute was opened for your match.',
              type: 'match_dispute',
              data: { route: `/matches/${matchRoomId}`, matchId: matchRoomId },
              idempotencyKey: `match-dispute:${match.documentId ?? match.id}:user:${userId}`,
            })));
          }
        } catch (error) {
          strapi.log.error('[SocketRelay] Match update notification failed', error);
        }
      },
    });
  },
};
