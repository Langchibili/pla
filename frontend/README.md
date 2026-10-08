# ProLeague Africa — main app (Next.js 16, JavaScript, MUI)

Install dependencies with `npm install`, set the `NEXT_PUBLIC_*` values in `.env.local`,
then run `npm run build` and `npm start` for a production-mode local run on port 3011.

## Custom Strapi routes this frontend expects

- `POST /auth/email-otp/send`, `/resend`, and `/verify` for email-based registration and sign-in.
- `POST /affiliate-impressions/track` and `/check` for browser-to-app referral attribution.
- `POST /tournament-entries/join` and `GET /tournament-entries/leaderboard?tournament_id=...`.
- `GET /tournament-stages/:id/schedule` for the public, anonymized stage schedule.
- `GET /me/matches` and `/me/matches/:id`; match actions use `POST /matches/:id/{postpone,forfeit,dispute}`.
- `POST /match-submissions/submit` with multipart field `screenshot`.
- `GET /me/wallet`, `/me/wallet/ledger`, and `POST /me/wallet/transfer` with `{to, amount, idempotency_key}`.
- `GET /me/referrals` returns the caller's code and aggregate invite statuses.

Socket.IO authentication uses `{token}`. Add `public/icon-192.png` and `public/icon-512.png`.
