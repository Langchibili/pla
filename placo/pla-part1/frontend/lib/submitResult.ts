import { getToken } from './api';
import { SIM_BUILD } from './config';
import type { MatchConfig, MatchResult } from './engine/contract';

export async function submitResult(cfg: MatchConfig, r: MatchResult) {
  const res = await fetch('/api/match/finalise', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({
      match_document_id: cfg.matchId,
      home_score: r.home_score, away_score: r.away_score,
      roster_snapshot_hash: cfg.hashes.roster, physics_snapshot_hash: cfg.hashes.physics,
      simulation_seed: cfg.seed, simulation_build: r.simulation_build || SIM_BUILD,
      metrics: r.metrics, events: r.events.slice(0, 2000), match_ended_at: r.match_ended_at,
    }),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out?.error?.message ?? out?.error ?? `Result rejected (${res.status})`);
  return out.data as { rewards: { profileId: number; xp: number; bronzeCoins: number; outcome?: string }[] };
}
