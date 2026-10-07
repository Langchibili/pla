export async function queueScoreSubmission(strapi: any, submissionId: number): Promise<void> {
  const submission = await strapi.db.query('api::match-submission.match-submission').findOne({
    where: { id: submissionId },
    populate: {
      screenshot: true,
      match: {
        populate: {
          tournament: { populate: { game: true } },
          player1_entry: { select: ['in_game_name'] },
          player2_entry: { select: ['in_game_name'] },
        },
      },
    },
  });
  if (!submission || submission.score_job_id || !submission.screenshot?.url) return;

  const serviceUrl = process.env.SCORE_SERVICE_URL?.replace(/\/$/, '');
  const callbackUrl = process.env.SCORE_SERVICE_WEBHOOK_URL;
  const scoreServiceApiKey = process.env.SCORE_SERVICE_API_KEY;
  if (!serviceUrl || !callbackUrl || !scoreServiceApiKey) {
    await strapi.db.query('api::match-submission.match-submission').update({
      where: { id: submissionId },
      data: {
        match_submission_status: 'needs_review',
        rejection_reason: 'Score service URL, API key, and callback URL must be configured.',
      },
    });
    return;
  }

  const mediaUrl = submission.screenshot.url.startsWith('http')
    ? submission.screenshot.url
    : `${process.env.PUBLIC_URL ?? 'http://localhost:1377'}${submission.screenshot.url}`;
  const gameKey = submission.match?.tournament?.game?.score_service_key;
  if (!gameKey) {
    await strapi.db.query('api::match-submission.match-submission').update({
      where: { id: submissionId },
      data: {
        match_submission_status: 'needs_review',
        rejection_reason: 'The tournament game has no score service key configured.',
      },
    });
    return;
  }

  try {
    const screenshotResponse = await fetch(mediaUrl);
    if (!screenshotResponse.ok) throw new Error(`Could not fetch stored screenshot: HTTP ${screenshotResponse.status}`);
    const screenshotBytes = new Uint8Array(await screenshotResponse.arrayBuffer());
    const form = new FormData();
    form.set('job_id', String(submissionId));
    form.set('game_key', gameKey);
    form.set('callback_url', callbackUrl);
    form.set('expected_names', JSON.stringify([
      submission.match?.player1_entry?.in_game_name,
      submission.match?.player2_entry?.in_game_name,
    ].filter(Boolean)));
    form.set('image', new Blob([screenshotBytes], { type: submission.screenshot.mime ?? 'image/jpeg' }), submission.screenshot.name ?? 'match-screenshot.jpg');

    const response = await fetch(`${serviceUrl}/v1/jobs`, {
      method: 'POST',
      headers: { 'X-Api-Key': scoreServiceApiKey },
      body: form,
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) throw new Error(`Score service returned HTTP ${response.status}`);
    const result = await response.json() as { job_id?: string; id?: string };
    const jobId = result.job_id ?? result.id;
    if (!jobId) throw new Error('Score service response did not include a job ID');

    await strapi.db.query('api::match-submission.match-submission').update({
      where: { id: submissionId },
      data: { score_job_id: String(jobId), match_submission_status: 'processing' },
    });
  } catch (error) {
    strapi.log.error(`[ScoreService] Could not queue submission ${submissionId}`, error);
    await strapi.db.query('api::match-submission.match-submission').update({
      where: { id: submissionId },
      data: {
        match_submission_status: 'needs_review',
        rejection_reason: 'The screenshot could not be queued for score processing.',
      },
    });
  }
}
