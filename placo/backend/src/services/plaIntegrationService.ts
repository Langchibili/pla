import crypto from 'node:crypto';
import { UID } from './ids';
import { createCanonicalMatch } from './matchService';
import { randomCode, sha256Json, signatureFor } from './security';
import { resolveSettingsForCountry } from './settingsResolver';

export async function assignPlaFixture(strapi:any,payload:any) {
  const fixtureId=String(payload.fixture_id??'').trim(); const tournamentId=String(payload.tournament_id??'').trim();
  const homePlaUserId=String(payload.home_pla_user_id??'').trim(); const awayPlaUserId=String(payload.away_pla_user_id??'').trim();
  if (!fixtureId || !tournamentId || !homePlaUserId || !awayPlaUserId) throw new Error('fixture_id, tournament_id, home_pla_user_id and away_pla_user_id are required');
  if (homePlaUserId===awayPlaUserId) throw new Error('A fixture must have two distinct PLA users');
  const assignmentKey=`pla-fixture:${fixtureId}`;
  const prior=await strapi.db.query(UID.plaFixture).findOne({where:{pla_fixture_id:fixtureId},populate:{match:true}});
  if (prior) {
    if (prior.home_pla_user_id!==homePlaUserId || prior.away_pla_user_id!==awayPlaUserId || prior.pla_tournament_id!==tournamentId) throw new Error('Fixture ID already exists with conflicting participant data');
    return {duplicate:true,fixture:prior,match:prior.match??null};
  }
  const [homeProfile,awayProfile]=await Promise.all([
    strapi.db.query(UID.profile).findOne({where:{pla_user_id:homePlaUserId},populate:{country:true}}),
    strapi.db.query(UID.profile).findOne({where:{pla_user_id:awayPlaUserId},populate:{country:true}}),
  ]);
  if (!homeProfile || !awayProfile) throw new Error('Both PLA users must have linked PLACO profiles before assigning a fixture');
  const [homeClub,awayClub]=await Promise.all([
    strapi.db.query(UID.club).findOne({where:{owner:homeProfile.id,club_game_status:'active'}}),
    strapi.db.query(UID.club).findOne({where:{owner:awayProfile.id,club_game_status:'active'}}),
  ]);
  if (!homeClub || !awayClub) throw new Error('Both fixture participants must have an active club');
  const settingsHome:any=await resolveSettingsForCountry(strapi,homeProfile.country?.id);
  const settingsAway:any=await resolveSettingsForCountry(strapi,awayProfile.country?.id);
  if (payload.cash_prize_tournament===true && (!settingsHome.cash_tournaments_enabled || !settingsAway.cash_tournaments_enabled)) throw new Error('Cash-prize tournament play is disabled for one or both countries');
  const fixture=await strapi.db.query(UID.plaFixture).create({data:{
    pla_fixture_id:fixtureId,pla_tournament_id:tournamentId,pla_stage_id:payload.stage_id?String(payload.stage_id):undefined,home_pla_user_id:homePlaUserId,away_pla_user_id:awayPlaUserId,
    home_player:homeProfile.id,away_player:awayProfile.id,fixture_game_status:'assigned',assignment_idempotency_key:assignmentKey,pla_signed_payload_hash:sha256Json(payload),
    match_rules:payload.match_rules??{},scheduled_at:payload.scheduled_at?new Date(payload.scheduled_at):undefined,cash_prize_managed_by_pla:true,fixture_metadata:{cashPrizeTournament:Boolean(payload.cash_prize_tournament),plaPayloadVersion:payload.payload_version??'1.0.0'},
  }});
  const matchCode=`PLA-${crypto.createHash('sha256').update(fixtureId).digest('hex').slice(0,24)}`;
  const match=await createCanonicalMatch(strapi,{mode:'pla_tournament',homeProfile,homeClub,awayProfile,awayClub,plaFixtureLinkId:fixture.id,matchCode});
  const updated=await strapi.db.query(UID.plaFixture).update({where:{id:fixture.id},data:{match:match.id,fixture_game_status:'ready'}});
  return {duplicate:false,fixture:updated,match};
}

export async function flushPlaOutbox(strapi:any,limit=20) {
  const base=(process.env.PLA_BASE_URL??'').trim().replace(/\/$/,'');
  const path=process.env.PLA_RESULT_PATH||'/api/integration/placo/results';
  const secret=process.env.PLA_INTEGRATION_HMAC_SECRET?.trim();
  if (!base || !secret || base.includes('example.invalid')) throw new Error('PLA_BASE_URL and PLA_INTEGRATION_HMAC_SECRET must be configured before delivery');
  const events=await strapi.db.query(UID.plaOutbox).findMany({where:{delivery_game_status:{$in:['pending','retryable_error']},next_attempt_at:{$lte:new Date().toISOString()}},orderBy:{createdAt:'asc'},limit:Math.max(1,Math.min(100,limit))});
  const results:any[]=[];
  for (const event of events) {
    const now=new Date();
    await strapi.db.query(UID.plaOutbox).update({where:{id:event.id},data:{delivery_game_status:'sending',attempt_count:Number(event.attempt_count??0)+1,last_attempt_at:now}});
    try {
      const timestamp=String(Date.now()); const signature=signatureFor(secret,timestamp,'POST',path,event.event_payload);
      const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),10_000);
      let response:Response;
      try { response=await fetch(`${base}${path}`,{method:'POST',headers:{'content-type':'application/json','x-placo-timestamp':timestamp,'x-placo-signature':signature,'idempotency-key':event.idempotency_key},body:JSON.stringify(event.event_payload),signal:controller.signal}); }
      finally { clearTimeout(timeout); }
      if (!response.ok) throw new Error(`PLA returned HTTP ${response.status}`);
      await strapi.db.query(UID.plaOutbox).update({where:{id:event.id},data:{delivery_game_status:'delivered',delivered_at:new Date(),last_error:null}});
      if (event.pla_fixture_link) await strapi.db.query(UID.plaFixture).update({where:{id:event.pla_fixture_link?.id??event.pla_fixture_link},data:{fixture_game_status:'result_sent',result_sent_at:new Date(),last_sync_error:null}});
      results.push({event_code:event.event_code,delivered:true});
    } catch (error:any) {
      const attempts=Number(event.attempt_count??0)+1; const dead=attempts>=10; const delayMs=Math.min(60*60*1000,Math.pow(2,Math.min(attempts,10))*1000);
      await strapi.db.query(UID.plaOutbox).update({where:{id:event.id},data:{delivery_game_status:dead?'dead_letter':'retryable_error',last_error:String(error?.message??error).slice(0,1000),next_attempt_at:new Date(Date.now()+delayMs)}});
      results.push({event_code:event.event_code,delivered:false,error:String(error?.message??error),dead_letter:dead});
    }
  }
  return {processed:results.length,results};
}
