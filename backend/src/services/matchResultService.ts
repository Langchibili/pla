import { resolveSettingsForCountry } from './settingsResolver';

const MATCH_UID = 'api::match.match';
const SUBMISSION_UID = 'api::match-submission.match-submission';
const ENTRY_UID = 'api::tournament-entry.tournament-entry';
const STAGE_UID = 'api::tournament-stage.tournament-stage';

const OPEN_MATCH_STATUSES = ['scheduled', 'postponed', 'awaiting_confirmation'];
const RESOLVED_MATCH_STATUSES = ['completed', 'forfeited', 'suspended'];
const REVIEW_FLAGS = new Set([
  'ambiguous_readings',
  'names_missing',
  'score_sources_disagree',
  'uncalibrated_layout',
]);

function normalizeName(value: unknown): string {
  return String(value ?? '').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function nameSimilarity(expected: string, actual: string): number {
  const left = normalizeName(expected);
  const right = normalizeName(actual);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.startsWith(right) && right.length >= 3) return right.length / left.length;
  if (right.startsWith(left) && left.length >= 3) return left.length / right.length;

  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const previous = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (left[i - 1] === right[j - 1] ? 0 : 1));
      diagonal = previous;
    }
  }
  return Math.max(0, 1 - row[right.length] / Math.max(left.length, right.length));
}

function getNameSimilarity(result: any, expected: string, side: 'left' | 'right'): number {
  const hint = (result.name_hints ?? []).find(
    (item: any) => normalizeName(item.expected) === normalizeName(expected),
  );
  if (hint && Number.isFinite(Number(hint[`${side}_similarity`]))) {
    return Number(hint[`${side}_similarity`]);
  }
  return nameSimilarity(expected, result.names?.[side]);
}

export function mapScoreToEntries(result: any, match: any): { player1: number; player2: number } | null {
  const left = Number(result.score?.left);
  const right = Number(result.score?.right);
  if (!Number.isInteger(left) || !Number.isInteger(right) || left < 0 || right < 0) return null;

  const player1Name = String(match.player1_entry?.in_game_name ?? '');
  const player2Name = String(match.player2_entry?.in_game_name ?? '');
  if (!player1Name || !player2Name) return null;

  const player1OnLeft = getNameSimilarity(result, player1Name, 'left');
  const player2OnRight = getNameSimilarity(result, player2Name, 'right');
  const player1OnRight = getNameSimilarity(result, player1Name, 'right');
  const player2OnLeft = getNameSimilarity(result, player2Name, 'left');
  const leftAssignment = Math.min(player1OnLeft, player2OnRight);
  const rightAssignment = Math.min(player1OnRight, player2OnLeft);

  if (leftAssignment >= 0.6 && leftAssignment - rightAssignment >= 0.15) {
    return { player1: left, player2: right };
  }
  if (rightAssignment >= 0.6 && rightAssignment - leftAssignment >= 0.15) {
    return { player1: right, player2: left };
  }
  return null;
}

function getFullTimeEvidence(result: any): boolean {
  const flags = new Set(result.flags ?? []);
  return flags.has('fulltime_banner') || flags.has('stats_screen');
}

function getReadableClockMinute(clockText: unknown): number | null {
  const match = String(clockText ?? '').match(/^\s*(\d{1,3})(?::\d{2}|\+(\d{1,2}))?\s*['’′`]?\s*$/);
  if (!match) return null;
  return Number(match[1]) + Number(match[2] ?? 0);
}

export function validateScoreResult(
  result: any,
  match: any,
  allowedZones: string[],
  confidenceThreshold: number,
  requireCompletedClock = true,
): { status: string; reason: string | null; score: { player1: number; player2: number } | null } {
  if (
    ['rejected', 'no_score_found', 'unsupported_game', 'error'].includes(result.status)
    || (result.flags ?? []).includes('match_not_finished')
  ) {
    return { status: 'invalid', reason: result.reject_reason ?? result.message ?? 'No valid score was found.', score: null };
  }
  if (!result.score || !allowedZones.includes(result.zone)) {
    return { status: 'invalid', reason: 'Score was not found in the permitted game zone.', score: null };
  }

  const clockMinute = getReadableClockMinute(result.clock_text);
  const fullTime = getFullTimeEvidence(result);
  if (requireCompletedClock && clockMinute !== null && clockMinute < 90) {
    return { status: 'invalid', reason: 'The match clock is below 90 minutes.', score: null };
  }
  if (requireCompletedClock && clockMinute === null && !fullTime) {
    return { status: 'invalid', reason: 'The screenshot does not prove that the match is complete.', score: null };
  }

  const flags = new Set(result.flags ?? []);
  const confidence = Number(result.confidence);
  if (
    !Number.isFinite(confidence)
    || confidence < confidenceThreshold
    || [...REVIEW_FLAGS].some((flag) => flags.has(flag))
  ) {
    return { status: 'needs_review', reason: 'The score needs an administrator review.', score: null };
  }

  const score = mapScoreToEntries(result, match);
  if (!score) {
    return { status: 'needs_review', reason: 'Player names could not be reliably matched to the score sides.', score: null };
  }
  return { status: 'valid', reason: null, score };
}

function readSavedScore(submission: any): { player1: number; player2: number } | null {
  const score = submission.extracted_json?.pla_adjudication;
  if (!Number.isInteger(score?.player1) || !Number.isInteger(score?.player2)) return null;
  return score;
}

async function resolveMatch(
  strapi: any,
  matchId: number,
  status: 'completed' | 'suspended',
  score: { player1: number; player2: number },
  resultSource: 'both_submissions' | 'single_submission' | 'suspension',
): Promise<boolean> {
  return strapi.db.transaction(async () => {
    const match = await strapi.db.query(MATCH_UID).findOne({
      where: { id: matchId },
      populate: {
        tournament: { populate: { country: { select: ['id'] } } },
        player1_entry: true,
        player2_entry: true,
      },
    });
    if (!match || !OPEN_MATCH_STATUSES.includes(match.match_status)) return false;

    const player1 = match.player1_entry;
    const player2 = match.player2_entry;
    const isDraw = score.player1 === score.player2;
    const player1Won = score.player1 > score.player2;
    const winner = isDraw ? null : player1Won ? player1 : player2;
    const settings = await resolveSettingsForCountry(strapi, match.tournament?.country?.id);
    const player1Points = status === 'suspended'
      ? Number(settings.suspended_match_points ?? 0)
      : isDraw ? Number(settings.draw_points ?? 1) : player1Won ? Number(settings.win_points ?? 3) : Number(settings.loss_points ?? 0);
    const player2Points = status === 'suspended'
      ? Number(settings.suspended_match_points ?? 0)
      : isDraw ? Number(settings.draw_points ?? 1) : player1Won ? Number(settings.loss_points ?? 0) : Number(settings.win_points ?? 3);

    const transitionedMatch = await strapi.db.query(MATCH_UID).update({
      where: { id: match.id, match_status: { $in: OPEN_MATCH_STATUSES } },
      data: {
        match_status: status,
        player1_score: score.player1,
        player2_score: score.player2,
        winner_entry: winner?.id ?? null,
        result_source: resultSource,
        resolved_at: new Date(),
      },
    });
    if (!transitionedMatch) return false;

    if (player1 && player2) {
      for (const [entry, goalsFor, goalsAgainst, points] of [
        [player1, score.player1, score.player2, player1Points],
        [player2, score.player2, score.player1, player2Points],
      ] as const) {
        const won = goalsFor > goalsAgainst;
        const lost = goalsFor < goalsAgainst;
        await strapi.db.query(ENTRY_UID).update({
          where: { id: entry.id },
          data: {
            matches_played: Number(entry.matches_played ?? 0) + 1,
            wins: Number(entry.wins ?? 0) + (won ? 1 : 0),
            draws: Number(entry.draws ?? 0) + (won || lost ? 0 : 1),
            losses: Number(entry.losses ?? 0) + (lost ? 1 : 0),
            points: Number(entry.points ?? 0) + points,
            goals_for: Number(entry.goals_for ?? 0) + goalsFor,
            goals_against: Number(entry.goals_against ?? 0) + goalsAgainst,
          },
        });
      }
    }
    return true;
  });
}

async function disputeMatch(strapi: any, matchId: number): Promise<void> {
  await strapi.db.query(MATCH_UID).update({
    where: { id: matchId, match_status: { $in: OPEN_MATCH_STATUSES } },
    data: { match_status: 'in_dispute', dispute_status: 'open' },
  });
}

async function adjudicateAvailableSubmissions(strapi: any, matchId: number): Promise<void> {
  const submissions = await strapi.db.query(SUBMISSION_UID).findMany({
    where: { match: matchId, match_submission_status: 'valid' },
    select: ['extracted_json'],
  });
  const scores = submissions.map(readSavedScore).filter(Boolean) as { player1: number; player2: number }[];
  if (scores.length < 2) return;
  const first = scores[0];
  if (scores.some((score) => score.player1 !== first.player1 || score.player2 !== first.player2)) {
    await disputeMatch(strapi, matchId);
    return;
  }
  await resolveMatch(strapi, matchId, 'completed', first, 'both_submissions');
}

export async function saveAndAdjudicateScoreResult(
  strapi: any,
  submissionId: number,
  result: any,
  allowedZones: string[],
  confidenceThreshold: number,
  requireCompletedClock = true,
): Promise<string> {
  const submission = await strapi.db.query(SUBMISSION_UID).findOne({
    where: { id: submissionId },
    populate: {
      match: {
        populate: {
          player1_entry: true,
          player2_entry: true,
        },
      },
    },
  });
  if (!submission?.match) return 'missing';
  if (submission.extracted_json) return submission.match_submission_status;

  const decision = validateScoreResult(
    result,
    submission.match,
    allowedZones,
    confidenceThreshold,
    requireCompletedClock,
  );
  const storedResult = decision.score
    ? { ...result, pla_adjudication: decision.score }
    : result;
  await strapi.db.query(SUBMISSION_UID).update({
    where: { id: submission.id },
    data: {
      extracted_json: storedResult,
      ocr_confidence: Number.isFinite(Number(result.confidence)) ? Number(result.confidence) : null,
      score_zone_found: typeof result.zone === 'string' ? result.zone : null,
      match_submission_status: decision.status,
      rejection_reason: decision.reason,
    },
  });
  if (decision.status === 'valid') {
    await adjudicateAvailableSubmissions(strapi, Number(submission.match.id));
  }
  return decision.status;
}

async function closeStage(strapi: any, stage: any, now: Date): Promise<boolean> {
  const matches = await strapi.db.query(MATCH_UID).findMany({
    where: { tournament_stage: stage.id },
    populate: {
      tournament: { populate: { country: { select: ['suspended_match_score'] } } },
      submissions: { select: ['match_submission_status', 'extracted_json'] },
    },
  });
  let waitingForScoreService = false;

  for (const match of matches) {
    if (!OPEN_MATCH_STATUSES.includes(match.match_status)) continue;
    const submissions = match.submissions ?? [];
    if (submissions.some((submission: any) => ['pending', 'processing'].includes(submission.match_submission_status))) {
      waitingForScoreService = true;
      continue;
    }
    const scores = submissions
      .filter((submission: any) => submission.match_submission_status === 'valid')
      .map(readSavedScore)
      .filter(Boolean) as { player1: number; player2: number }[];

    if (scores.length >= 2) {
      const first = scores[0];
      if (scores.some((score) => score.player1 !== first.player1 || score.player2 !== first.player2)) {
        await disputeMatch(strapi, Number(match.id));
        waitingForScoreService = true;
      } else {
        await resolveMatch(strapi, Number(match.id), 'completed', first, 'both_submissions');
      }
      continue;
    }
    if (scores.length === 1) {
      await resolveMatch(strapi, Number(match.id), 'completed', scores[0], 'single_submission');
      continue;
    }

    const settings = await resolveSettingsForCountry(strapi, match.tournament?.country?.id);
    const configuredScore = String(settings.suspended_match_score ?? '0:0')
      .split(':')
      .map((part: string) => Number(part.trim()));
    const fallback = configuredScore.length === 2 && configuredScore.every(Number.isInteger)
      ? { player1: configuredScore[0], player2: configuredScore[1] }
      : { player1: 0, player2: 0 };
    await resolveMatch(strapi, Number(match.id), 'suspended', fallback, 'suspension');
  }

  if (waitingForScoreService) return false;
  const freshMatches = await strapi.db.query(MATCH_UID).findMany({
    where: { tournament_stage: stage.id },
    select: ['match_status'],
  });
  if (freshMatches.some((match: any) =>
    !RESOLVED_MATCH_STATUSES.includes(match.match_status) && match.match_status !== 'invalid')) return false;

  await strapi.db.query(STAGE_UID).update({
    where: { id: stage.id, tournament_stage_status: 'in_progress', ends_at: { $lte: now } },
    data: { tournament_stage_status: 'completed' },
  });
  return true;
}

export async function closeExpiredTournamentStages(strapi: any, now = new Date()): Promise<void> {
  const stages = await strapi.db.query(STAGE_UID).findMany({
    where: {
      tournament_stage_status: 'in_progress',
      ends_at: { $lte: now.toISOString() },
    },
    populate: { tournament: { populate: { country: { select: ['id', 'suspended_match_score'] } } } },
  });
  for (const stage of stages) {
    try {
      await closeStage(strapi, stage, now);
    } catch (error) {
      strapi.log.error(`[MatchResolution] Could not close expired tournament stage ${stage.id}`, error);
    }
  }
}
