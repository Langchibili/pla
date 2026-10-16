import { randomCode } from './security';
import { UID } from './ids';
import { getProfileForUser } from './walletService';
import { resolveSettingsForCountry } from './settingsResolver';
import { createCanonicalMatch } from './matchService';

export async function startTrainingSession(strapi:any,userId:number,input:any,idempotencyKey:string) {
  const profile = await getProfileForUser(strapi,userId);
  if (!profile || profile.profile_game_status !== 'active') throw new Error('An active game profile is required');
  const settings:any = await resolveSettingsForCountry(strapi,profile.country?.id);
  const active = await strapi.db.query(UID.training).count({where:{player:profile.id,training_game_status:{$in:['created','ready','in_progress']}}});
  if (active >= Number(settings.max_active_training_sessions ?? 1)) throw new Error('You already have an active training session');
  const prior = idempotencyKey ? await strapi.db.query(UID.training).findOne({where:{idempotency_key:idempotencyKey},populate:{match:true}}) : null;
  if (prior) return {duplicate:true,session:prior,match:prior.match};
  const club = await strapi.db.query(UID.club).findOne({where:{owner:profile.id,club_game_status:'active'}});
  if (!club) throw new Error('An active club is required before starting training');
  const teamKey = String(input.ai_team_code ?? 'training-opponent-alpha');
  const difficultyCode = String(input.difficulty_code ?? 'easy');
  const team = await strapi.db.query(UID.aiTeam).findOne({where:{team_code:teamKey,team_game_status:'active'},populate:{preferred_formation:true,tactical_profile:true,ai_behaviour_profile:true}});
  if (!team) throw new Error('AI training team not found or inactive');
  const difficulty = await strapi.db.query(UID.difficulty).findOne({where:{difficulty_code:difficultyCode,difficulty_game_status:'active',ai_team:team.id}})
    ?? await strapi.db.query(UID.difficulty).findOne({where:{difficulty_code:difficultyCode,difficulty_game_status:'active'}});
  if (!difficulty) throw new Error('AI difficulty profile not found or inactive');
  const sessionCode = randomCode('TRAIN');
  const now = new Date(); const dayKey = now.toISOString().slice(0,10);
  const session = await strapi.db.query(UID.training).create({data:{
    session_code:sessionCode,idempotency_key:idempotencyKey || undefined,player:profile.id,ai_team:team.id,difficulty_profile:difficulty.id,player_club:club.id,
    training_game_status:'created',training_day_key:dayKey,rewards_granted:false,session_metadata:{requestIdempotencyKey:idempotencyKey || null},
  }});
  const aiOpponent = {
    teamCode:team.team_code,name:team.team_name,baseRating:team.base_team_rating,basePlayerAttributes:team.base_player_attributes,
    rosterTemplate:team.roster_template,formation:team.preferred_formation?.formation_layout ?? null,
    tacticalProfile:team.tactical_profile ?? null,aiBehaviourProfile:team.ai_behaviour_profile ?? null,
    difficulty:{code:difficulty.difficulty_code,name:difficulty.difficulty_name,level:difficulty.difficulty_level,reactionTimeMs:difficulty.reaction_time_ms,decisionTemperatureMultiplier:difficulty.decision_temperature_multiplier,
      passShotErrorMultiplier:difficulty.pass_shot_error_multiplier,firstTouchQualityShift:difficulty.first_touch_quality_shift,pressingIntensityCap:difficulty.pressing_intensity_cap,
      defensiveLineCoordination:difficulty.defensive_line_coordination,offBallRunTimingJitterSeconds:difficulty.off_ball_run_timing_jitter_seconds,
      awarenessAdjustmentPercent:difficulty.awareness_adjustment_percent,goalkeeperPerceptionMultiplier:difficulty.goalkeeper_perception_multiplier,tackleProbabilityThreshold:difficulty.tackle_probability_threshold,
      teamAttributeOverrides:difficulty.team_attribute_overrides},
  };
  const match = await createCanonicalMatch(strapi,{mode:'training',homeProfile:profile,homeClub:club,aiOpponent,trainingSessionId:session.id});
  await strapi.db.query(UID.training).update({where:{id:session.id},data:{match:match.id,training_game_status:'ready'}});
  return {duplicate:false,session:{...session,match:match.id,training_game_status:'ready'},match};
}
