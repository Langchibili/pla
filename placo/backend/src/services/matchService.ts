import crypto from 'node:crypto';
import { UID, type CoinType } from './ids';
import { sha256Json, randomCode } from './security';
import { resolveSettingsForCountry } from './settingsResolver';
import { changeCoins } from './walletService';

const MAX_SCORE = 30;
const ref = (record: any) => String(record?.documentId ?? record?.id ?? '');
const asNumber = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

async function findMatch(strapi: any, key: string) {
  return strapi.db.query(UID.match).findOne({ where: { $or: [{ documentId: key }, { match_code: key }] }, populate: { home_player: { populate: { country: true } }, away_player: { populate: { country: true } }, home_club: true, away_club: true } });
}

async function getClubSnapshot(strapi: any, clubId: number) {
  const club = await strapi.db.query(UID.club).findOne({
    where: { id: clubId },
    populate: { selected_formation: true, selected_stadium: true, selected_kit: true },
  });
  if (!club) throw new Error('Club not found');
  const players = await strapi.db.query(UID.clubPlayer).findMany({
    where: { club: clubId, player_game_status: 'owned' },
    populate: { player_template: true }, orderBy: { display_position_number: 'asc' }, limit: 30,
  });
  const goalkeeperOnly = new Set(['reflexes','diving','handling','kicking','throwing','gkPositioning','oneOnOnes','commandOfArea','aerialReach','penaltySaving','sweepingSpeed']);
  const roster = players.map((player: any) => {
    const rawAttributes = player.current_attributes ?? player.player_template?.attributes ?? {};
    const attributes = Object.fromEntries(Object.entries(rawAttributes).filter(([key]) => player.primary_position === 'GK' || !goalkeeperOnly.has(key)));
    return {
      playerId: ref(player), slot: player.display_position_number, position: player.primary_position,
      attributes,
      goalkeeperAttributes: player.primary_position === 'GK' ? (player.player_template?.goalkeeper_attributes ?? {}) : null,
      traits: player.player_template?.traits ?? [], appearance: player.appearance_config ?? player.player_template?.appearance_defaults ?? {},
      templateId: ref(player.player_template), premium: Boolean(player.is_premium),
    };
  });
  return {
    clubId: ref(club), clubName: club.club_name, formation: club.selected_formation?.formation_layout ?? null,
    formationCode: club.selected_formation?.formation_code ?? null, stadium: club.selected_stadium?.stadium_code ?? null,
    kit: club.selected_kit ? { code: club.selected_kit.kit_code, primary: club.selected_kit.primary_color, secondary: club.selected_kit.secondary_color, trim: club.selected_kit.trim_color } : null,
    players: roster,
  };
}

async function activeRecord(strapi: any, uid: string, statusField: string) {
  return strapi.db.query(uid).findOne({ where: { [statusField]: 'active' }, orderBy: { updatedAt: 'desc' } });
}

export async function createCanonicalMatch(strapi: any, input: {
  mode: 'casual' | 'ranked' | 'training' | 'pla_tournament'; homeProfile: any; homeClub: any;
  awayProfile?: any; awayClub?: any; aiOpponent?: any; trainingSessionId?: number; plaFixtureLinkId?: number; matchCode?: string;
}) {
  const [homeRoster, awayRoster, ruleset, physics, curves, aiProfile, settings] = await Promise.all([
    getClubSnapshot(strapi, input.homeClub.id),
    input.awayClub ? getClubSnapshot(strapi, input.awayClub.id) : Promise.resolve(input.aiOpponent ?? { clubName: 'AI Opponent', players: [] }),
    activeRecord(strapi, UID.ruleset, 'ruleset_game_status'),
    activeRecord(strapi, UID.physics, 'profile_game_status'),
    activeRecord(strapi, UID.curves, 'curve_game_status'),
    activeRecord(strapi, UID.aiProfile, 'profile_game_status'),
    resolveSettingsForCountry(strapi, input.homeProfile.country?.id),
  ]);
  if (!ruleset || !physics || !curves || !aiProfile) throw new Error('Active game rules, physics, curves and AI behaviour configuration must exist before creating a match');
  const rosterSnapshot = {
    schemaVersion: '1.0.0',
    home: { profileId: ref(input.homeProfile), club: homeRoster },
    away: input.awayProfile ? { profileId: ref(input.awayProfile), club: awayRoster } : { ai: awayRoster },
    generatedAt: new Date().toISOString(),
  };
  const physicsSnapshot = {
    profileCode: physics.profile_code, profileVersion: physics.profile_version,
    pitch: physics.pitch_spec, ball: physics.ball_spec, playerMotion: physics.player_motion_spec,
    contacts: physics.contact_spec, camera: physics.camera_spec, scales: physics.global_scales,
    curveSetCode: curves.curve_set_code, curveSetVersion: curves.curve_set_version, curves: curves.curve_definitions,
  };
  const aiSnapshot = { profileCode: aiProfile.profile_code, profileVersion: aiProfile.profile_version, teamBrain: aiProfile.team_brain_config, decisions: aiProfile.decision_weights, perception: aiProfile.perception_config, roleBehaviours: aiProfile.role_behaviours, keeper: aiProfile.keeper_config, referee: aiProfile.referee_config, determinism: aiProfile.determinism_config };
  const simulationSeed = crypto.randomBytes(16).toString('hex');
  const matchCode = input.matchCode ?? randomCode(input.mode === 'training' ? 'TRN' : input.mode === 'pla_tournament' ? 'PLA' : 'MAT');
  const match = await strapi.db.query(UID.match).create({
    data: {
      match_code: matchCode, match_mode: input.mode, match_status: 'ready', home_player: input.homeProfile.id,
      away_player: input.awayProfile?.id, home_club: input.homeClub.id, away_club: input.awayClub?.id,
      game_ruleset: ruleset.id, physics_profile: physics.id, physics_curve_set: curves.id, ai_behaviour_profile: aiProfile.id,
      roster_snapshot: rosterSnapshot, roster_snapshot_hash: sha256Json(rosterSnapshot), rules_snapshot: {
        rulesetCode: ruleset.ruleset_code, version: ruleset.ruleset_version, matchLengthMinutes: ruleset.match_length_minutes,
        periodCount: ruleset.period_count, addedTimeEnabled: ruleset.added_time_enabled, offsideEnabled: ruleset.offside_enabled,
        foulsEnabled: ruleset.fouls_enabled, cardsEnabled: ruleset.cards_enabled, substitutionLimit: ruleset.substitution_limit, restarts: ruleset.restart_rules,
      },
      physics_snapshot: physicsSnapshot, physics_snapshot_hash: sha256Json(physicsSnapshot), ai_snapshot: aiSnapshot,
      simulation_seed: simulationSeed, result_validation_status: 'not_submitted', finalisation_idempotency_key: undefined,
      match_metadata: { trainingSessionId: input.trainingSessionId ?? null, plaFixtureLinkId: input.plaFixtureLinkId ?? null, countryId: input.homeProfile.country?.id ?? null, createdFromSettings: settings.api_config_revision ?? 1 },
    },
  });
  return match;
}

export async function createOnlineMatch(strapi: any, homeTicket: any, awayTicket: any) {
  if (Number(homeTicket.player?.id ?? homeTicket.player) === Number(awayTicket.player?.id ?? awayTicket.player)) throw new Error('A player cannot be matched against their own profile');
  const [homeProfile, awayProfile, homeClub, awayClub] = await Promise.all([
    strapi.db.query(UID.profile).findOne({ where: { id: homeTicket.player?.id ?? homeTicket.player }, populate: { country: true } }),
    strapi.db.query(UID.profile).findOne({ where: { id: awayTicket.player?.id ?? awayTicket.player }, populate: { country: true } }),
    strapi.db.query(UID.club).findOne({ where: { id: homeTicket.club?.id ?? homeTicket.club } }),
    strapi.db.query(UID.club).findOne({ where: { id: awayTicket.club?.id ?? awayTicket.club } }),
  ]);
  if (!homeProfile || !awayProfile || !homeClub || !awayClub) throw new Error('Both queued players must have active profiles and clubs');
  const settings = await resolveSettingsForCountry(strapi, homeProfile.country?.id);
  if (homeTicket.match_mode === 'ranked' && settings.ranked_matches_enabled === false) throw new Error('Ranked matches are disabled');
  const matchCode = `QM-${sha256Json([homeTicket.ticket_code, awayTicket.ticket_code].sort()).slice(0, 24)}`;
  const existing = await strapi.db.query(UID.match).findOne({ where: { match_code: matchCode } });
  if (existing) return existing;
  return createCanonicalMatch(strapi, {
    mode: homeTicket.match_mode === 'ranked' ? 'ranked' : 'casual', homeProfile, homeClub, awayProfile, awayClub, matchCode,
  });
}

export async function startMatchForUser(strapi: any, key: string, userId: number) {
  const profile = await strapi.db.query(UID.profile).findOne({ where: { user: userId } });
  if (!profile) throw new Error('Create a PLACO game profile before starting a match');
  const match = await findMatch(strapi, key);
  if (!match) throw new Error('Match not found');
  if (Number(match.home_player?.id) !== Number(profile.id) && Number(match.away_player?.id) !== Number(profile.id)) throw new Error('You are not a participant in this match');
  if (match.match_status === 'in_progress') return { duplicate: true, match };
  if (match.match_status !== 'ready') throw new Error(`Match cannot be started from ${match.match_status}`);
  const updated = await strapi.db.query(UID.match).update({ where: { id: match.id }, data: { match_status: 'in_progress', match_started_at: new Date() } });
  if (match.match_mode === 'training') {
    const training = await strapi.db.query(UID.training).findOne({ where: { match: match.id } });
    if (training) await strapi.db.query(UID.training).update({ where: { id: training.id }, data: { training_game_status: 'in_progress', started_at: new Date() } });
  }
  return { duplicate: false, match: updated };
}

function validateMetrics(metrics: any) {
  for (const side of ['home','away']) {
    const item = metrics?.[side] ?? {};
    for (const key of ['possession_percent','pass_accuracy_percent']) {
      if (item[key] !== undefined && (!Number.isFinite(Number(item[key])) || Number(item[key]) < 0 || Number(item[key]) > 100)) throw new Error(`metrics.${side}.${key} must be between 0 and 100`);
    }
    for (const key of ['shots','shots_on_target','passes_completed','passes_attempted','fouls','corners','saves']) {
      if (item[key] !== undefined && (!Number.isSafeInteger(Number(item[key])) || Number(item[key]) < 0 || Number(item[key]) > 1000)) throw new Error(`metrics.${side}.${key} must be an integer between 0 and 1000`);
    }
  }
}

async function awardXp(strapi: any, profileId: number, match: any, scoreFor: number, scoreAgainst: number, metrics: any, isTraining: boolean) {
  const idempotencyKey = `xp:${ref(match)}:${profileId}`;
  const prior = await strapi.db.query(UID.xpLedger).findOne({ where: { idempotency_key: idempotencyKey } });
  if (prior) return { duplicate: true, xp: Number(prior.xp_delta) };
  const profile = await strapi.db.query(UID.profile).findOne({ where: { id: profileId }, populate: { country: true } });
  if (!profile) throw new Error('Could not resolve player profile for XP award');
  const settings: any = await resolveSettingsForCountry(strapi, profile.country?.id);
  const outcome = scoreFor > scoreAgainst ? 'win' : scoreFor < scoreAgainst ? 'loss' : 'draw';
  let maxCap = Number(outcome === 'win' ? settings.max_xp_win : outcome === 'draw' ? settings.max_xp_draw : settings.max_xp_loss) || 0;
  let base = Number(outcome === 'win' ? settings.xp_base_win : outcome === 'draw' ? settings.xp_base_draw : settings.xp_base_loss) || 0;
  if (isTraining) { maxCap = Number(settings.max_xp_training ?? 40); base = 8; }
  const possession = Math.max(0, Math.min(100, asNumber(metrics?.possession_percent, 50)));
  const passAccuracy = Math.max(0, Math.min(100, asNumber(metrics?.pass_accuracy_percent, 75)));
  const cleanSheetBonus = scoreAgainst === 0 ? Number(settings.xp_clean_sheet_bonus ?? 8) : 0;
  const raw = base + scoreFor * Number(settings.xp_goal_scored_weight ?? 3) - scoreAgainst * Number(settings.xp_goal_conceded_penalty ?? 1.5)
    + (possession - 50) * Number(settings.xp_possession_weight ?? 0.15)
    + passAccuracy * Number(settings.xp_pass_accuracy_weight ?? 0.08)
    + cleanSheetBonus + (scoreFor - scoreAgainst) * Number(settings.xp_goal_difference_weight ?? 2);
  let xp = Math.max(0, Math.min(maxCap, Math.round(raw)));
  let trainingLimitReached = false;
  if (isTraining) {
    const now = new Date(); const start = new Date(now); start.setHours(0,0,0,0);
    const count = await strapi.db.query(UID.xpLedger).count({ where: { player: profileId, xp_reason: 'training', createdAt: { $gte: start.toISOString() } } });
    if (count >= Number(settings.max_training_rewards_per_day ?? 5)) { xp = 0; trainingLimitReached = true; }
  }
  await strapi.db.transaction(async () => {
    const check = await strapi.db.query(UID.xpLedger).findOne({ where: { idempotency_key: idempotencyKey } });
    if (check) return;
    const lockedProfile = await strapi.db.query(UID.profile).findOne({ where: { id: profileId } });
    const priorXp = Number(lockedProfile?.app_xp ?? 0);
    const nextXp = priorXp + xp;
    await strapi.db.query(UID.xpLedger).create({ data: {
      player: profileId, match: match.id, xp_delta: xp, balance_after: nextXp,
      xp_reason: isTraining ? 'training' : outcome === 'win' ? 'match_win' : outcome === 'draw' ? 'match_draw' : 'match_loss',
      idempotency_key: idempotencyKey, calculation_breakdown: { outcome, base, scoreFor, scoreAgainst, possession, passAccuracy, cleanSheetBonus, raw, cap:maxCap, trainingLimitReached }, created_by_system:'placo',
    } });
    await strapi.db.query(UID.profile).update({ where: { id: profileId }, data: {
      app_xp: nextXp, matches_played: Number(lockedProfile?.matches_played ?? 0) + 1,
      wins: Number(lockedProfile?.wins ?? 0) + (outcome === 'win' ? 1 : 0), draws: Number(lockedProfile?.draws ?? 0) + (outcome === 'draw' ? 1 : 0),
      losses: Number(lockedProfile?.losses ?? 0) + (outcome === 'loss' ? 1 : 0), goals_scored: Number(lockedProfile?.goals_scored ?? 0) + scoreFor,
      goals_conceded: Number(lockedProfile?.goals_conceded ?? 0) + scoreAgainst,
      clean_sheets: Number(lockedProfile?.clean_sheets ?? 0) + (scoreAgainst === 0 ? 1 : 0), last_match_at: new Date(),
    } });
  });
  return { duplicate: false, xp, outcome, trainingLimitReached };
}

async function rewardCoinsForMatch(strapi: any, profile: any, match: any, scoreFor: number, scoreAgainst: number, isTraining: boolean) {
  const settings: any = await resolveSettingsForCountry(strapi, profile.country?.id);
  let amount = isTraining ? Number(settings.training_bronze_reward ?? 0) : scoreFor > scoreAgainst ? Number(settings.bronze_win_reward ?? 35) : scoreFor === scoreAgainst ? Number(settings.bronze_draw_reward ?? 15) : Number(settings.bronze_loss_reward ?? 5);
  if (isTraining) {
    const now = new Date(); const start = new Date(now); start.setHours(0,0,0,0);
    const count = await strapi.db.query(UID.coinLedger).count({ where: { player: profile.id, ledger_type: 'training_reward', createdAt: { $gte: start.toISOString() } } });
    if (count >= Number(settings.max_training_rewards_per_day ?? 5)) amount = 0;
  }
  if (amount > 0) await changeCoins(strapi, {
    profileId: profile.id, coinType: 'bronze', delta: amount, ledgerType: isTraining ? 'training_reward' : 'match_reward',
    sourceType: isTraining ? 'training_match' : 'match', sourceReference: ref(match), idempotencyKey:`coins:${ref(match)}:${profile.id}:bronze`,
    metadata:{ scoreFor, scoreAgainst, mode:match.match_mode },
  });
  return amount;
}

async function upsertLeaderboard(strapi: any, profileId: number) {
  const profile = await strapi.db.query(UID.profile).findOne({ where: { id: profileId }, populate: { country: true } });
  if (!profile) return;
  const where = { player: profileId, leaderboard_code:'xp_all_time', season_key:'all_time' };
  const data = { player:profileId, leaderboard_code:'xp_all_time', season_key:'all_time', country:profile.country?.id, app_xp:Number(profile.app_xp ?? 0), matches_played:Number(profile.matches_played ?? 0), wins:Number(profile.wins ?? 0), goal_difference:Number(profile.goals_scored ?? 0)-Number(profile.goals_conceded ?? 0), last_calculated_at:new Date() };
  const current = await strapi.db.query('api::leaderboard-entry.leaderboard-entry').findOne({ where });
  if (current) await strapi.db.query('api::leaderboard-entry.leaderboard-entry').update({ where:{id:current.id}, data });
  else await strapi.db.query('api::leaderboard-entry.leaderboard-entry').create({ data });
}

export async function finaliseVerifiedMatch(strapi: any, payload: any, signatureDigest: string) {
  const key = String(payload.match_document_id ?? payload.match_code ?? '');
  if (!key) throw new Error('match_document_id or match_code is required');
  const match = await findMatch(strapi, key);
  if (!match) throw new Error('Match not found');
  if (match.match_status === 'verified' && match.xp_granted && match.coin_rewards_granted) return { duplicate: true, match };
  if (!['in_progress','ready','awaiting_verification','verified'].includes(match.match_status)) throw new Error(`Match cannot be finalised from ${match.match_status}`);
  const submissionId = String(payload.result_submission_id ?? '');
  if (!submissionId || submissionId.length > 180) throw new Error('result_submission_id is required');
  const duplicateSubmission = await strapi.db.query(UID.resultVerification).findOne({ where: { result_submission_id: submissionId }, populate: { match: true } });
  if (duplicateSubmission && Number(duplicateSubmission.match?.id ?? duplicateSubmission.match) !== Number(match.id)) throw new Error('result_submission_id has already been submitted for another match');
  if (match.match_status === 'verified') {
    const existingVerification = duplicateSubmission ?? await strapi.db.query(UID.resultVerification).findOne({ where: { match: match.id }, orderBy: { createdAt: 'desc' } });
    if (!existingVerification || existingVerification.result_submission_id !== submissionId) throw new Error('A verified match may only resume reward finalisation with its original result_submission_id');
  }
  const homeScore = Number(payload.home_score); const awayScore = Number(payload.away_score);
  if (!Number.isSafeInteger(homeScore) || !Number.isSafeInteger(awayScore) || homeScore < 0 || awayScore < 0 || homeScore > MAX_SCORE || awayScore > MAX_SCORE) throw new Error(`Scores must be integers from 0 to ${MAX_SCORE}`);
  if (String(payload.roster_snapshot_hash ?? '') !== String(match.roster_snapshot_hash)) throw new Error('Roster snapshot hash does not match the frozen match roster');
  if (String(payload.physics_snapshot_hash ?? '') !== String(match.physics_snapshot_hash)) throw new Error('Physics snapshot hash does not match the frozen match configuration');
  if (String(payload.simulation_seed ?? '') !== String(match.simulation_seed)) throw new Error('Simulation seed does not match the issued seed');
  validateMetrics(payload.metrics ?? {});
  if (payload.match_ended_at && Number.isNaN(Date.parse(payload.match_ended_at))) throw new Error('match_ended_at must be a valid ISO timestamp');
  const computedDigest = sha256Json({homeScore,awayScore,metrics:payload.metrics??{},seed:match.simulation_seed});
  if (match.match_status === 'verified' && String(match.result_digest ?? '') !== computedDigest) throw new Error('Retry payload differs from the already verified match result');

  const verification = duplicateSubmission ?? await strapi.db.query(UID.resultVerification).create({ data: {
    match:match.id,result_submission_id:submissionId,result_validation_status:'verified',signature_key_id:payload.signature_key_id ?? 'match-engine-v1',signature_digest:signatureDigest,
    received_at:new Date(),verified_at:new Date(),submitted_result:payload,computed_result_digest:sha256Json({homeScore,awayScore,metrics:payload.metrics??{},seed:match.simulation_seed}),
    roster_hash_match:true,snapshot_hash_match:true,event_sequence_valid:Array.isArray(payload.events),validation_errors:[],
  } });
  const endedAt = payload.match_ended_at ? new Date(payload.match_ended_at) : new Date();
  await strapi.db.query(UID.match).update({ where:{id:match.id}, data:{
    match_status:'verified',result_validation_status:'verified',home_score:homeScore,away_score:awayScore,
    match_ended_at:endedAt,verified_at:new Date(),result_metrics:payload.metrics??{},result_digest:verification.computed_result_digest,
    simulation_build:String(payload.simulation_build ?? 'unspecified').slice(0,100),finalisation_idempotency_key:`finalise:${ref(match)}`,
  } });
  if (Array.isArray(payload.events)) {
    const events = payload.events.slice(0, 2000);
    for (let i=0;i<events.length;i++) {
      const event = events[i] ?? {};
      if (!Number.isSafeInteger(Number(event.event_sequence ?? i)) || Number(event.event_sequence ?? i) < 0) continue;
      const existed = await strapi.db.query('api::match-event.match-event').findOne({ where:{match:match.id,event_sequence:Number(event.event_sequence ?? i)} });
      if (!existed) await strapi.db.query('api::match-event.match-event').create({ data:{
        match:match.id,event_sequence:Number(event.event_sequence ?? i),event_type:event.event_type ?? 'other',simulation_time_seconds:Math.max(0,asNumber(event.simulation_time_seconds,0)),
        period_number:Math.max(1,Math.min(5,Math.floor(asNumber(event.period_number,1)))),team_side:['home','away','neutral'].includes(event.team_side)?event.team_side:'neutral',
        actor_player_id:event.actor_player_id?String(event.actor_player_id):undefined,target_player_id:event.target_player_id?String(event.target_player_id):undefined,
        position_payload:event.position_payload??{},event_payload:event.event_payload??event,event_hash:sha256Json(event),
      } });
    }
  }

  const training = match.match_mode === 'training';
  const participants: Array<{profileId:number;scoreFor:number;scoreAgainst:number;side:'home'|'away'}> = [];
  if (match.home_player?.id) participants.push({profileId:Number(match.home_player.id),scoreFor:homeScore,scoreAgainst:awayScore,side:'home'});
  if (match.away_player?.id) participants.push({profileId:Number(match.away_player.id),scoreFor:awayScore,scoreAgainst:homeScore,side:'away'});
  const rewards: any[] = [];
  for (const participant of participants) {
    const metrics = payload.metrics?.[participant.side] ?? {};
    const xp = await awardXp(strapi, participant.profileId, match, participant.scoreFor, participant.scoreAgainst, metrics, training);
    const profile = await strapi.db.query(UID.profile).findOne({ where:{id:participant.profileId}, populate:{country:true} });
    const coins = profile ? await rewardCoinsForMatch(strapi,profile,match,participant.scoreFor,participant.scoreAgainst,training) : 0;
    await upsertLeaderboard(strapi, participant.profileId);
    rewards.push({ profileId:participant.profileId, ...xp, bronzeCoins:coins });
  }
  if (training) {
    const trainingSession = await strapi.db.query(UID.training).findOne({ where:{match:match.id} });
    if (trainingSession) await strapi.db.query(UID.training).update({ where:{id:trainingSession.id},data:{training_game_status:'completed',completed_at:new Date(),rewards_granted:true} });
  }
  if (match.match_mode === 'pla_tournament') {
    const fixture = await strapi.db.query(UID.plaFixture).findOne({ where:{match:match.id} });
    if (fixture) {
      const outboxCode = `match-verified:${fixture.pla_fixture_id}`;
      const exists = await strapi.db.query(UID.plaOutbox).findOne({ where:{idempotency_key:outboxCode} });
      if (!exists) await strapi.db.query(UID.plaOutbox).create({ data:{
        event_code:randomCode('PLAOUT'),event_type:'match_verified',pla_fixture_link:fixture.id,match:match.id,
        event_payload:{event:'placo.match.verified',pla_fixture_id:fixture.pla_fixture_id,pla_tournament_id:fixture.pla_tournament_id,placo_match_code:match.match_code,home_score:homeScore,away_score:awayScore,metrics:payload.metrics??{},result_digest:sha256Json({homeScore,awayScore,metrics:payload.metrics??{}}),verified_at:new Date().toISOString()},
        event_payload_hash:sha256Json({homeScore,awayScore,metrics:payload.metrics??{}}),delivery_game_status:'pending',attempt_count:0,idempotency_key:outboxCode,next_attempt_at:new Date(),
      } });
      await strapi.db.query(UID.plaFixture).update({where:{id:fixture.id},data:{fixture_game_status:'result_pending'}});
    }
  }
  await strapi.db.query(UID.match).update({ where:{id:match.id}, data:{xp_granted:true,coin_rewards_granted:true} });
  const final = await findMatch(strapi, ref(match));
  return { duplicate:Boolean(duplicateSubmission), match:final, rewards, verificationId:verification.documentId ?? verification.id };
}

export async function xpLeaderboard(strapi: any, input: { countryId?: number; limit?: number }) {
  const filters: any = { profile_game_status:'active' };
  if (input.countryId) filters.country = input.countryId;
  const records = await strapi.db.query(UID.profile).findMany({
    where:filters,select:['id','documentId','public_handle','app_xp','matches_played','wins','draws','losses','goals_scored','goals_conceded'],
    populate:{country:{select:['id','name','iso_code']}},orderBy:[{app_xp:'desc'},{wins:'desc'},{goals_scored:'desc'},{id:'asc'}],limit:Math.max(1,Math.min(100,Number(input.limit??50))),
  });
  return records.map((p:any,index:number)=>({rank:index+1,player:{documentId:p.documentId,handle:p.public_handle},country:p.country?.name??null,app_xp:Number(p.app_xp??0),matches_played:Number(p.matches_played??0),wins:Number(p.wins??0),draws:Number(p.draws??0),losses:Number(p.losses??0),goal_difference:Number(p.goals_scored??0)-Number(p.goals_conceded??0)}));
}
