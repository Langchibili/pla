export default {
  routes: [
    {
      method: 'POST',
      path: '/match-submissions/submit',
      handler: 'match-submission.submit',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/match-submissions/score-webhook',
      handler: 'match-submission.scoreWebhook',
      config: { auth: false },
    },
  ],
};
