import { getToken } from './api';
import { SIM_BUILD } from './config';
export async function submitResult(cfg, r) {
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
    const responseText = await res.text();
    let out = {};
    if (responseText) {
        try {
            out = JSON.parse(responseText);
        }
        catch {
            throw new Error('Match result service returned invalid JSON.');
        }
    }
    if (!res.ok)
        throw new Error(out?.error?.message ?? out?.error ?? `Result rejected (${res.status})`);
    return out.data;
}
