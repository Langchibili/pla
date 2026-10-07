# ProLeague Africa — main app (Next.js 14, JS, MUI)
npm i && cp .env.example .env.local && npm run dev

## Custom Strapi routes this frontend expects
POST /tournaments/:id/enter {in_game_name} · GET /me/matches · GET /me/matches/:id (adds opponent_label, match_code, submissions[{mine}])
POST /matches/:id/submit (multipart 'screenshot') · POST /matches/:id/{postpone,forfeit,dispute}
GET /me/wallet ({ledger}) · POST /me/wallet/transfer {to,amount} · GET /me/referrals ({pending,rewarded})
Register accepts device_hash + referral_code. Socket.IO auth: {token}. Add public/icon-192.png and icon-512.png.
