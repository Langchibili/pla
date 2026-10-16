import crypto from 'node:crypto';
import { UID } from './ids';
import { randomCode, sha256Json } from './security';
import { getProfileForUser } from './walletService';
import { resolveSettingsForCountry } from './settingsResolver';
import { createOnlineMatch } from './matchService';

export async function enqueuePlayer(strapi: any, userId: number, input: any, idempotencyKey: string) {
  const profile = await getProfileForUser(strapi, userId);
  if (!profile || profile.profile_game_status !== 'active') throw new Error('An active PLACO game profile is required');
  const mode = input.match_mode === 'ranked' ? 'ranked' : 'casual';
  const settings: any = await resolveSettingsForCountry(strapi, profile.country?.id);
  if (!settings.online_matches_enabled) throw new Error('Online matches are currently disabled');
  if (mode === 'ranked' && !settings.ranked_matches_enabled) throw new Error('Ranked matches are currently disabled');
  if (!idempotencyKey || idempotencyKey.length > 160) throw new Error('X-Idempotency-Key header is required');
  const duplicate = await strapi.db.query(UID.ticket).findOne({ where:{idempotency_key:idempotencyKey}, populate:{match:true} });
  if (duplicate) return { duplicate:true, ticket:duplicate, match:duplicate.match ?? null };

  const club = await strapi.db.query(UID.club).findOne({ where:{owner:profile.id,club_game_status:'active'} });
  if (!club) throw new Error('An active club is required before entering matchmaking');
  const now = new Date(); const ttl = Math.max(15,Number(settings.matchmaking_ticket_ttl_seconds ?? 120));
  const ticket = await strapi.db.query(UID.ticket).create({ data:{
    ticket_code:randomCode('QUEUE'),player:profile.id,club:club.id,match_mode:mode,region_code:String(input.region_code ?? profile.country?.iso_code ?? '').slice(0,20),country:profile.country?.id,
    rating_at_queue:Number(profile.app_xp ?? 0),search_range:Math.max(0,Math.min(10000,Number(input.search_range ?? 200))),ticket_game_status:'queued',idempotency_key:idempotencyKey,
    expires_at:new Date(now.getTime()+ttl*1000),queued_at:now,
  } });
  const candidates = await strapi.db.query(UID.ticket).findMany({
    where:{ticket_game_status:'queued',match_mode:mode},populate:{player:true,club:true,country:true},orderBy:{createdAt:'asc'},limit:50,
  });
  const candidate = candidates.find((item:any) => item.id !== ticket.id && Number(item.player?.id ?? item.player) !== profile.id && new Date(item.expires_at).getTime() > Date.now()
    && (!ticket.region_code || !item.region_code || ticket.region_code === item.region_code));
  if (!candidate) return { duplicate:false,ticket,match:null,queue_position:Math.max(1,candidates.length) };

  const homeTicket = new Date(candidate.queued_at ?? candidate.createdAt).getTime() <= now.getTime() ? candidate : ticket;
  const awayTicket = homeTicket.id === ticket.id ? candidate : ticket;
  let match: any;
  try { match = await createOnlineMatch(strapi,homeTicket,awayTicket); }
  catch (error) {
    const pairCode = `QM-${sha256Json([homeTicket.ticket_code,awayTicket.ticket_code].sort()).slice(0,24)}`;
    match = await strapi.db.query(UID.match).findOne({where:{match_code:pairCode}});
    if (!match) throw error;
  }
  const pairedAt = new Date();
  await strapi.db.transaction(async () => {
    await strapi.db.query(UID.ticket).update({where:{id:homeTicket.id},data:{ticket_game_status:'paired',match:match.id}});
    await strapi.db.query(UID.ticket).update({where:{id:awayTicket.id},data:{ticket_game_status:'paired',match:match.id}});
  });
  return { duplicate:false,ticket:{...ticket,ticket_game_status:'paired',match:match.id},match };
}

export async function cancelTicket(strapi:any,userId:number,key:string) {
  const profile = await getProfileForUser(strapi,userId);
  if (!profile) throw new Error('Game profile not found');
  const ticket = await strapi.db.query(UID.ticket).findOne({where:{$or:[{documentId:key},{ticket_code:key}]},populate:{player:true}});
  if (!ticket || Number(ticket.player?.id ?? ticket.player) !== Number(profile.id)) throw new Error('Queued ticket not found for this player');
  if (ticket.ticket_game_status !== 'queued') throw new Error(`Ticket cannot be cancelled from ${ticket.ticket_game_status}`);
  const updated = await strapi.db.query(UID.ticket).update({where:{id:ticket.id},data:{ticket_game_status:'cancelled'}});
  return updated;
}
