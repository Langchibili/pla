/**
 * Synchronises the Users & Permissions Public and Authenticated roles for PLACO.
 *
 * Deliberately only manages `api::` permission rows. Built-in plugin actions
 * (including auth/register/login actions) are preserved.
 *
 * Run once by starting Strapi with PLACO_SYNC_API_PERMISSIONS=true. The sync is
 * idempotent: it removes unapproved API actions, removes duplicate action rows,
 * and creates missing allowlisted actions. It does not change Admin RBAC roles.
 */

const ROLE_UID = 'plugin::users-permissions.role';
const PERMISSION_UID = 'plugin::users-permissions.permission';

type PermissionRole = 'public' | 'authenticated';
type PlacoStrapi = {
  db: { query: (uid: string) => any };
  log: { info: (message: string) => void; warn: (message: string) => void };
};

const readActions = (contentTypeUids: string[]): string[] =>
  contentTypeUids.flatMap((uid) => [`${uid}.find`, `${uid}.findOne`]);

/** Public users may only read the country/currency selectors needed before login. */
const PUBLIC_ACTIONS = new Set<string>([
  ...readActions([
    'api::country.country',
    'api::currency.currency',
  ]),
]);

/**
 * Authenticated players receive read-only access to game configuration and
 * only the purpose-built endpoints that enforce ownership or service checks.
 * No generic CRUD access is granted to players, clubs, matches, wallets,
 * ledgers, purchases, ad impressions, or PLA integration records.
 */
const AUTHENTICATED_ACTIONS = new Set<string>([
  ...PUBLIC_ACTIONS,
  ...readActions([
    'api::formation.formation',
    'api::kit-preset.kit-preset',
    'api::manager-template.manager-template',
    'api::player-template.player-template',
    'api::stadium-preset.stadium-preset',
    'api::game-ruleset.game-ruleset',
    'api::physics-curve-set.physics-curve-set',
    'api::physics-profile.physics-profile',
    'api::tactical-profile.tactical-profile',
    'api::ai-behaviour-profile.ai-behaviour-profile',
    'api::ai-difficulty-profile.ai-difficulty-profile',
    'api::ai-team.ai-team',
  ]),

  // Account/profile setup and player-safe, curated read endpoints.
  'api::game-profile.game-profile.mine',
  'api::game-profile.game-profile.initialise',
  'api::club.club.mine',
  'api::club.club.squad',
  'api::club-manager.club-manager.mine',

  // Ownership-checked club customisation actions.
  'api::club.club.chooseFormation',
  'api::club.club.chooseManager',
  'api::club.club.chooseStadium',
  'api::club.club.chooseKit',
  'api::club-player.club-player.develop',
  'api::club-player.club-player.rename',
  'api::club-manager.club-manager.rename',

  // User-safe wallet summary, price conversion and country-specific game config.
  'api::coin-wallet.coin-wallet.mine',
  'api::currency.currency.convertPrice',
  'api::admn-settings.admn-settings.publicConfig',

  // Online and training flows. Results are finalised only by the trusted engine.
  'api::matchmaking-ticket.matchmaking-ticket.enqueue',
  'api::matchmaking-ticket.matchmaking-ticket.cancel',
  'api::match.match.start',
  'api::match.match.mine',
  'api::training-session.training-session.start',

  // Store checkout intent and rewarded-ad start. The callbacks themselves use
  // auth:false plus server-side HMAC verification and are not role permissions.
  'api::store-purchase.store-purchase.offers',
  'api::store-purchase.store-purchase.intent',
  'api::market-offer.market-offer.purchase',
  'api::rewarded-ad-impression.rewarded-ad-impression.start',
]);

const ALLOWLISTS: Record<PermissionRole, Set<string>> = {
  public: PUBLIC_ACTIONS,
  authenticated: AUTHENTICATED_ACTIONS,
};

async function getRole(strapi: PlacoStrapi, type: PermissionRole) {
  const role = await strapi.db.query(ROLE_UID).findOne({
    where: { type },
    select: ['id', 'name', 'type'],
  });
  if (!role) {
    throw new Error(
      `Users & Permissions role "${type}" was not found. Confirm that the users-permissions plugin is enabled and has completed its bootstrap.`,
    );
  }
  return role;
}

async function synchroniseRole(
  strapi: PlacoStrapi,
  roleType: PermissionRole,
  dryRun: boolean,
): Promise<{ added: number; removed: number; retained: number }> {
  const role = await getRole(strapi, roleType);
  const allowed = ALLOWLISTS[roleType];
  const current: Array<{ id: number; action: string }> =
    await strapi.db.query(PERMISSION_UID).findMany({
      where: { role: role.id },
      select: ['id', 'action'],
      limit: 10000,
    });

  // Only touch this project's Content API permission rows. Plugin permissions
  // and other non-api actions (e.g. auth providers) are deliberately preserved.
  const apiRows = current.filter((row) => typeof row.action === 'string' && row.action.startsWith('api::'));
  const rowsByAction = new Map<string, Array<{ id: number; action: string }>>();
  for (const row of apiRows) {
    const group = rowsByAction.get(row.action) ?? [];
    group.push(row);
    rowsByAction.set(row.action, group);
  }

  let added = 0;
  let removed = 0;
  let retained = 0;

  for (const [action, rows] of rowsByAction) {
    // Keep one approved action row; remove unapproved actions and duplicates.
    const keepOne = allowed.has(action);
    const rowsToRemove = keepOne ? rows.slice(1) : rows;
    if (keepOne) retained += 1;
    for (const row of rowsToRemove) {
      removed += 1;
      if (!dryRun) {
        await strapi.db.query(PERMISSION_UID).delete({ where: { id: row.id } });
      }
    }
  }

  for (const action of allowed) {
    if (rowsByAction.has(action)) continue;
    added += 1;
    if (!dryRun) {
      await strapi.db.query(PERMISSION_UID).create({
        data: { action, role: role.id },
      });
    }
  }

  strapi.log.info(
    `[permissions] ${dryRun ? 'DRY RUN ' : ''}${role.name} role: ${added} action(s) to add, ${removed} API permission row(s) to remove, ${retained} approved action(s) retained.`,
  );
  return { added, removed, retained };
}

export async function synchronisePlacoApiPermissions(strapi: PlacoStrapi) {
  const dryRun = process.env.PLACO_PERMISSION_SYNC_DRY_RUN === 'true';
  strapi.log.info(`[permissions] Starting PLACO Content API permission sync${dryRun ? ' (dry run)' : ''}.`);

  // Run serially to avoid contention against the permissions relation table.
  const publicResult = await synchroniseRole(strapi, 'public', dryRun);
  const authenticatedResult = await synchroniseRole(strapi, 'authenticated', dryRun);

  strapi.log.info(
    `[permissions] PLACO permission sync complete. Public: +${publicResult.added}/-${publicResult.removed}; Authenticated: +${authenticatedResult.added}/-${authenticatedResult.removed}.`,
  );
}
