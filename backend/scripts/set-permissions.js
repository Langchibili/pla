'use strict';
/**
 * ProLeagueAfrica permissions matrix: the single source of truth.
 * Read by scripts/set-permissions.js (applies it) and by `--markdown` (prints PERMISSIONS.md tables).
 *
 * Deny by default. Anything not listed here is NOT granted to Public / Authenticated, and the
 * script removes it from those two roles unless you pass --no-prune.
 *
 * Two separate permission systems:
 *   1. Users & Permissions  -> what the app's API allows (Public = logged out, Authenticated = a player)
 *   2. Admin panel roles    -> what your staff can do in the Strapi admin
 * The Super Admin role (code "strapi-super-admin") is in neither list and is never touched.
 */

const UP = 'plugin::users-permissions';
const act = (api, ...names) => names.map((n) => `api::${api}.${api}.${n}`);

/** Prefix every role this script owns. It will only ever create/update roles with this prefix. */
const ADMIN_ROLE_PREFIX = 'pla-';

// ---------------------------------------------------------------------------------------------
// 1. USERS & PERMISSIONS (the API)
// ---------------------------------------------------------------------------------------------

/**
 * Default Strapi actions that are granted as-is. `guard` is what the controller MUST enforce,
 * because a bare `find` returns every record the table holds.
 */
const DEFAULT_GRANTS = [
  // --- Public (logged out) ---
  { role: 'public', actions: act('country', 'find', 'findOne'), resource: 'country',
    guard: 'Needed on the signup screen. Return only country_status = active.' },
  { role: 'public', actions: act('currency', 'find', 'findOne'), resource: 'currency',
    guard: 'Needed to show prices before login. Return only currency_status = active.' },

  // --- Authenticated (a signed-in player) ---
  { role: 'authenticated', actions: [`${UP}.user.me`], resource: 'user (self)',
    guard: '`me` returns only the caller; strip push_token, device data and role internals.' },
  { role: 'authenticated', actions: act('country', 'find', 'findOne'), resource: 'country', guard: 'Active only.' },
  { role: 'authenticated', actions: act('currency', 'find', 'findOne'), resource: 'currency', guard: 'Active only.' },
  { role: 'authenticated', actions: act('game', 'find', 'findOne'), resource: 'game',
    guard: 'game_status = active only. Strip score_service_key and parser_version.' },
  { role: 'authenticated', actions: act('tournament', 'find', 'findOne'), resource: 'tournament',
    guard: 'Hide draft, cancelled-before-publish and tournaments of inactive games. Strip config_snapshot, tournament_config, entries, prize_payouts.' },
  { role: 'authenticated', actions: act('tournament-stage', 'find', 'findOne'), resource: 'tournament-stage',
    guard: 'Only stages of visible tournaments.' },
  { role: 'authenticated', actions: act('plapo-package', 'find', 'findOne'), resource: 'plapo-package',
    guard: 'plapo_package_status = active only, in the player\'s currency via the conversion service.' },
];

/**
 * Custom routes you build. Players never get default create/update/delete on anything, because
 * those would let a player write any field. Each custom action does one narrow, validated job.
 * The script grants these only once the route exists (it skips and lists the ones not built yet).
 */
const CUSTOM_ACTIONS = [
  { action: `${UP}.user.updateMe`, method: 'PUT', path: '/api/users/me', resource: 'user (self)',
    purpose: 'Update own country, preferred_currency, in_game_names, push_token, has_completed_tutorial.',
    guard: 'Whitelist those fields only. Never role, balances, user_status, referral fields, free_plapo_granted.' },

  { action: act('tournament-entry', 'join')[0], method: 'POST', path: '/api/tournament-entries/join', resource: 'tournament-entry',
    purpose: 'Enter a tournament after validating the in-game name and eligibility; paid entries charge Plapo, never cash.',
    guard: 'Registration open, active game, country/capacity checks, no duplicate entry, server-derived fee, atomic idempotent ledger debit and entry creation.' },
  { action: act('tournament-entry', 'mine')[0], method: 'GET', path: '/api/tournament-entries/mine', resource: 'tournament-entry',
    purpose: 'My entries and standings.', guard: 'user = caller.' },
  { action: act('tournament-entry', 'leaderboard')[0], method: 'GET', path: '/api/tournament-entries/leaderboard', resource: 'tournament-entry',
    purpose: 'Per-stage and overall leaderboard with my position pinned.', guard: 'Return anon_label / display handle, never user ids or in-game names.' },

  { action: act('match', 'mine')[0], method: 'GET', path: '/api/matches/mine', resource: 'match',
    purpose: 'My matches with deadlines.', guard: 'Caller must be player1 or player2; opponent shown as anonymous label only.' },
  { action: act('match', 'room')[0], method: 'GET', path: '/api/matches/:id/room', resource: 'match',
    purpose: 'One match room: code, countdown, state, event history.', guard: 'Participants only; never expose opponent user, entry name or contact.' },

  { action: act('match-submission', 'submit')[0], method: 'POST', path: '/api/match-submissions/submit', resource: 'match-submission',
    purpose: 'Upload my result screenshot. The screenshot upload happens here, so players need no upload-plugin access.',
    guard: 'Participant, match open, image type/size, one live submission per player, then queue the score job.' },
  { action: act('match-submission', 'history')[0], method: 'GET', path: '/api/match-submissions/history/:matchId', resource: 'match-submission',
    purpose: 'Both screenshots and the final score of a resolved match.', guard: 'Participants only, and only after the match is resolved.' },

  { action: act('plapo-ledger', 'wallet')[0], method: 'GET', path: '/api/plapo-ledgers/wallet', resource: 'plapo-ledger',
    purpose: 'Spendable and transferable balance.', guard: 'Caller only; computed from the ledger.' },
  { action: act('plapo-ledger', 'mine')[0], method: 'GET', path: '/api/plapo-ledgers/mine', resource: 'plapo-ledger',
    purpose: 'My Plapo history.', guard: 'user = caller.' },
  { action: act('plapo-ledger', 'transfer')[0], method: 'POST', path: '/api/plapo-ledgers/transfer', resource: 'plapo-ledger',
    purpose: 'Send Plapo to another player.', guard: 'Transferable bucket only (purchased/received), transfers_enabled, caller not flagged, idempotency key, recipient resolved by referral code or handle.' },

  { action: act('payment', 'checkout')[0], method: 'POST', path: '/api/payments/checkout', resource: 'payment',
    purpose: 'Start a purchase: creates a pending payment and returns the gateway session. Credits nothing.', guard: 'Active package only; price taken from the package, never from the client.' },
  { action: act('payment', 'mine')[0], method: 'GET', path: '/api/payments/mine', resource: 'payment',
    purpose: 'My payment history.', guard: 'user = caller; strip webhook_payload and provider_reference.' },

  { action: act('referral', 'mine')[0], method: 'GET', path: '/api/referrals/mine', resource: 'referral',
    purpose: 'My code, link and the status of each invite.', guard: 'referrer = caller; show status only, not the invitee\'s identity.' },

  { action: act('prize-payout', 'mine')[0], method: 'GET', path: '/api/prize-payouts/mine', resource: 'prize-payout',
    purpose: 'My prize winnings and payout status.', guard: 'user = caller.' },

  { action: act('admn-settings', 'publicConfig')[0], method: 'GET', path: '/api/admn-settings/public-config', resource: 'admn-settings',
    purpose: 'Safe subset for the app: forfeit/suspended score display, transfers_enabled, time limits.', guard: 'Whitelist fields. Never expose referral caps, confidence thresholds or retention settings.' },
];

/** Routes that are NOT behind a login and need NO Users & Permissions row. */
const WEBHOOKS = [
  { route: 'POST /api/match-submissions/score-webhook', how: 'Route config `auth: false`. Verify X-Signature = sha256 HMAC of `timestamp + "." + rawBody` with WEBHOOK_SECRET; reject if older than 5 minutes; ignore repeats of a job_id already applied.' },
  { route: 'POST /api/payments/webhook', how: 'Route config `auth: false`. Verify the gateway signature; confirm the amount and reference against the pending payment; credit the ledger once (idempotency key = provider_reference).' },
];

/** Never granted to Public or Authenticated, and why. */
const NEVER_FOR_PLAYERS = [
  ['tournament-config, game-score-zone, admn-settings (full), device-registry', 'Internal rules and anti-fraud data.'],
  ['match-event (REST)', 'Postponement, forfeit and dispute travel over authenticated sockets, not open CRUD.'],
  ['Default create / update / delete on every type', 'Would let a player write any field (scores, balances, status).'],
  ['users: find, findOne, update, destroy, count', 'Would expose or change other players. Use `me` and `updateMe`.'],
  ['Upload plugin (all actions)', 'Screenshots go through `match-submission.submit`.'],
  ['plapo-ledger / payment / prize-payout default find', 'Would list every player\'s money. Use the `mine` routes.'],
];

const SOCKET_EVENTS = [
  { event: 'match:unavailable', from: 'Player', rule: 'Participant of that match; match open (scheduled / postponed / awaiting_confirmation).' },
  { event: 'match:postpone_request', from: 'Player', rule: 'Participant; postponements < maxPostponementsPerMatch; every proposed slot before the stage ends; max 3 slots.' },
  { event: 'match:postpone_response', from: 'Opponent only', rule: 'The other participant; request still open and not lapsed.' },
  { event: 'match:forfeit', from: 'Player', rule: 'Participant; match not already resolved. Applies scoreOnForfeit to the opponent.' },
  { event: 'match:dispute_opened', from: 'Player or server', rule: 'Participant, and at least one submission exists.' },
  { event: 'match:submission_received', from: 'Server only', rule: 'Client emits are dropped.' },
  { event: 'match:result_ready', from: 'Server only', rule: 'Client emits are dropped.' },
  { event: 'wallet:updated', from: 'Server only', rule: 'Sent to that user\'s private room only.' },
  { event: 'leaderboard:updated', from: 'Server only', rule: 'Sent to rooms of players viewing that leaderboard.' },
];
const SOCKET_GENERAL = [
  'Connection needs a valid player JWT and user_status = active.',
  'A player joins only the rooms of their own matches and their own wallet.',
  'Every event carries an idempotency key; a repeat never applies twice.',
  'Every accepted event is stored as a match_event record.',
];

const usersPermissions = {
  public: DEFAULT_GRANTS.filter((g) => g.role === 'public').flatMap((g) => g.actions),
  authenticated: [
    ...DEFAULT_GRANTS.filter((g) => g.role === 'authenticated').flatMap((g) => g.actions),
    ...CUSTOM_ACTIONS.map((c) => c.action),
  ],
};

// ---------------------------------------------------------------------------------------------
// 2. ADMIN PANEL ROLES (your staff). Super Admin is yours alone and is never edited.
// ---------------------------------------------------------------------------------------------

const USER_UID = 'plugin::users-permissions.user';
/** Staff can see players but never credentials or device push tokens. */
const USER_SAFE = { except: ['password', 'resetPasswordToken', 'confirmationToken', 'push_token'] };

/**
 * Entry shape: { type, read, create, update, delete }
 *   type    short api name ("match") or a full uid
 *   read / create / update:  'all' | { except: [...] } | [field, ...] | omitted (no access)
 *   delete: true | omitted
 * Updating or creating always requires read on the same type (checked at start-up).
 * draftAndPublish is off everywhere, so there is no publish action.
 */
const ADMIN_ROLES = [
  {
    code: 'pla-tournament-manager', name: 'PLA Tournament Manager',
    description: 'Creates and runs tournaments, stages and config templates. Cannot touch money, games or settings.',
    content: [
      { type: 'tournament', read: 'all', create: 'all', update: 'all' },
      { type: 'tournament-config', read: 'all', create: 'all', update: 'all', delete: true },
      { type: 'tournament-stage', read: 'all', create: 'all', update: 'all' },
      { type: 'tournament-entry', read: 'all' },
      { type: 'match', read: 'all' },
      { type: 'prize-payout', read: 'all' },
      { type: 'game', read: 'all' },
      { type: 'game-score-zone', read: 'all' },
      { type: 'country', read: 'all' },
      { type: 'currency', read: 'all' },
      { type: 'admn-settings', read: 'all' },
    ],
    plugins: ['plugin::upload.read', 'plugin::upload.assets.create', 'plugin::upload.assets.update', 'plugin::upload.assets.copy-link'],
  },
  {
    code: 'pla-dispute-moderator', name: 'PLA Dispute Moderator',
    description: 'Reviews screenshots and rules on disputed, invalid and low-confidence matches.',
    content: [
      { type: 'match', read: 'all',
        update: ['match_status', 'player1_score', 'player2_score', 'winner_entry', 'result_source', 'dispute_status', 'admin_ruling_note', 'resolved_at'] },
      { type: 'match-submission', read: 'all', update: ['match_submission_status', 'rejection_reason'] },
      { type: 'match-event', read: 'all' },
      { type: 'tournament-entry', read: 'all' },
      { type: 'tournament-stage', read: 'all' },
      { type: 'tournament', read: 'all' },
      { type: 'game', read: 'all' },
      { type: USER_UID, read: USER_SAFE },
    ],
    plugins: ['plugin::upload.read', 'plugin::upload.assets.download'],
  },
  {
    code: 'pla-finance-officer', name: 'PLA Finance Officer',
    description: 'Reads payments and the ledger, manages Plapo packages and rates, approves and pays prizes. Cannot edit the ledger.',
    content: [
      { type: 'payment', read: 'all' },
      { type: 'plapo-ledger', read: 'all' },
      { type: 'plapo-package', read: 'all', create: 'all', update: 'all' },
      { type: 'prize-payout', read: 'all', update: ['prize_payout_status', 'payout_reference', 'approved_at', 'paid_at'] },
      { type: 'currency', read: 'all', update: ['rate_to_base', 'rate_updated_at', 'currency_status'] },
      { type: 'referral', read: 'all' },
      { type: 'tournament', read: 'all' },
      { type: 'tournament-entry', read: 'all' },
      { type: 'country', read: 'all' },
      { type: 'admn-settings', read: 'all' },
      { type: USER_UID, read: USER_SAFE },
    ],
    plugins: [],
  },
  {
    code: 'pla-fraud-reviewer', name: 'PLA Fraud Reviewer',
    description: 'Reviews flagged devices and accounts, can flag or ban users and reject suspect screenshots.',
    content: [
      { type: 'device-registry', read: 'all', update: ['device_registry_status', 'flag_reason'] },
      { type: USER_UID, read: USER_SAFE, update: ['user_status'] },
      { type: 'referral', read: 'all' },
      { type: 'plapo-ledger', read: 'all' },
      { type: 'payment', read: 'all' },
      { type: 'match-submission', read: 'all', update: ['match_submission_status'] },
      { type: 'match', read: 'all' },
      { type: 'tournament-entry', read: 'all' },
    ],
    plugins: ['plugin::upload.read', 'plugin::upload.assets.download'],
  },
  {
    code: 'pla-support-agent', name: 'PLA Support Agent',
    description: 'Read-only view of players, matches, wallets and payments to answer support questions.',
    content: [
      { type: USER_UID, read: USER_SAFE },
      { type: 'tournament', read: 'all' },
      { type: 'tournament-stage', read: 'all' },
      { type: 'tournament-entry', read: 'all' },
      { type: 'match', read: 'all' },
      { type: 'match-submission', read: 'all' },
      { type: 'plapo-ledger', read: 'all' },
      { type: 'payment', read: 'all' },
      { type: 'referral', read: 'all' },
      { type: 'prize-payout', read: 'all' },
      { type: 'plapo-package', read: 'all' },
      { type: 'game', read: 'all' },
      { type: 'country', read: 'all' },
      { type: 'currency', read: 'all' },
    ],
    plugins: [],
  },
];

/** What only the Super Admin (you) can do, for the document. */
const SUPER_ADMIN_ONLY = [
  'Edit admn_settings, game (including switching a game on/off) and game_score_zone',
  'Create or edit plapo_ledger entries from the admin (the ledger is append-only; corrections go through the ledger service)',
  'Delete anything financial or competitive: payment, plapo_ledger, prize_payout, match, match_submission, match_event, tournament_entry, tournament',
  'Edit or delete device_registry rows, referral rows and users (other than user_status for the fraud reviewer)',
  'Create admin users, assign admin roles, manage API tokens, webhooks, Users & Permissions roles and plugin settings',
];

const markdownCell = (value) => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');

function renderMarkdown() {
  const lines = ['# ProLeague Africa Permissions', '', '## API Grants', '', '| Role | Resource | Actions | Controller guard |', '| --- | --- | --- | --- |'];
  for (const grant of DEFAULT_GRANTS) {
    lines.push(`| ${markdownCell(grant.role)} | ${markdownCell(grant.resource)} | ${markdownCell(grant.actions.join(', '))} | ${markdownCell(grant.guard)} |`);
  }

  lines.push('', '## Custom Actions', '', '| Action | Method | Path | Purpose | Guard |', '| --- | --- | --- | --- | --- |');
  for (const item of CUSTOM_ACTIONS) {
    lines.push(`| ${markdownCell(item.action)} | ${markdownCell(item.method)} | ${markdownCell(item.path)} | ${markdownCell(item.purpose)} | ${markdownCell(item.guard)} |`);
  }

  lines.push('', '## Public Webhooks', '', '| Route | Verification |', '| --- | --- |');
  for (const webhook of WEBHOOKS) lines.push(`| ${markdownCell(webhook.route)} | ${markdownCell(webhook.how)} |`);

  lines.push('', '## Never Granted To Players', '', '| Surface | Reason |', '| --- | --- |');
  for (const [surface, reason] of NEVER_FOR_PLAYERS) lines.push(`| ${markdownCell(surface)} | ${markdownCell(reason)} |`);

  lines.push('', '## Admin Roles', '', '| Role | Access | Plugins |', '| --- | --- | --- |');
  for (const role of ADMIN_ROLES) {
    const access = role.content.map((item) => `${item.type}: ${Object.keys(item).filter((key) => key !== 'type').join(', ')}`).join('; ');
    lines.push(`| ${markdownCell(role.name)} (${markdownCell(role.code)}) | ${markdownCell(access)} | ${markdownCell(role.plugins.join(', '))} |`);
  }

  lines.push('', '## Socket Rules', '', '| Event | Sender | Rule |', '| --- | --- | --- |');
  for (const item of SOCKET_EVENTS) lines.push(`| ${markdownCell(item.event)} | ${markdownCell(item.from)} | ${markdownCell(item.rule)} |`);
  lines.push('', '## Super Admin Only', '', ...SUPER_ADMIN_ONLY.map((item) => `- ${item}`), '');
  return lines.join('\n');
}

module.exports = {
  ADMIN_ROLE_PREFIX,
  SUPER_ADMIN_CODE: 'strapi-super-admin',
  usersPermissions,
  DEFAULT_GRANTS,
  CUSTOM_ACTIONS,
  WEBHOOKS,
  NEVER_FOR_PLAYERS,
  SOCKET_EVENTS,
  SOCKET_GENERAL,
  ADMIN_ROLES,
  SUPER_ADMIN_ONLY,
  USER_UID,
  renderMarkdown,
};

if (require.main === module) {
  if (process.argv.includes('--markdown')) {
    process.stdout.write(`${renderMarkdown()}\n`);
  } else {
    process.stderr.write('This file is the permissions matrix and read-only report generator. Role changes must be applied manually in Strapi Admin. Use --markdown to print the matrix.\n');
    process.exitCode = 2;
  }
}