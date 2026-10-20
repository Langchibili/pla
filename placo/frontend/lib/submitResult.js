import { getToken } from './api';
import { SIM_BUILD } from './config';
const SERVER_METRIC_FIELDS = ['possession_percent', 'pass_accuracy_percent', 'shots', 'shots_on_target', 'passes_completed', 'passes_attempted', 'fouls', 'corners', 'saves'];
function persistedMetrics(metrics) {
    return Object.fromEntries(['home', 'away'].map(side => [
        side,
        Object.fromEntries(SERVER_METRIC_FIELDS.map(field => [field, metrics[side][field]])),
    ]));
}
export async function submitResult(cfg, r) {
    const res = await fetch('/api/match/finalise', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
            match_document_id: cfg.matchId,
            home_score: r.home_score, away_score: r.away_score,
            roster_snapshot_hash: cfg.hashes.roster, physics_snapshot_hash: cfg.hashes.physics,
            simulation_seed: cfg.seed, simulation_build: r.simulation_build || SIM_BUILD,
            metrics: persistedMetrics(r.metrics), events: r.events.slice(0, 2000), input_log: r.input_log, match_ended_at: r.match_ended_at,
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
