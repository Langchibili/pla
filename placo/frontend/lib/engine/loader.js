/** Lazy-load the Babylon engine so it never lands in the main bundle or runs during SSR. */
export const loadEngine = async () => {
    const mod = await import('@/game/createEngine');
    return mod.createEngine;
};
/** Convert the server-issued, frozen match into the engine's MatchConfig. */
export function buildMatchConfig(m, opts = {}) {
    const snap = m.roster_snapshot;
    const aiSide = snap.away?.ai;
    return {
        matchId: m.documentId, matchCode: m.match_code, mode: m.match_mode, seed: m.simulation_seed,
        controlledSide: opts.controlledSide ?? 'home',
        opponentIsAI: Boolean(aiSide),
        home: snap.home.club,
        away: aiSide ? aiTeamToSetup(aiSide) : snap.away.club,
        physics: m.physics_snapshot, rules: m.rules_snapshot, ai: m.ai_snapshot,
        hashes: { roster: m.roster_snapshot_hash, physics: m.physics_snapshot_hash },
        stadium: snap.home.club.stadium ?? null,
        camera: opts.camera ?? 'tv',
        difficulty: aiSide?.difficulty,
    };
}
function aiTeamToSetup(ai) {
    const tpl = ai.rosterTemplate?.players ?? [];
    return {
        clubName: ai.name ?? 'AI Opponent',
        formationCode: ai.rosterTemplate?.formationCode ?? '4-3-3',
        formation: ai.formation,
        kit: { code: 'pla-away', primary: '#FFFFFF', secondary: '#17202A', trim: '#147A3B' },
        players: tpl.map((p) => ({
            playerId: `ai-${p.slot}`, slot: `P-${p.slot}`, position: p.role,
            attributes: { ...(ai.basePlayerAttributes ?? {}), ...(p.attributes ?? {}), ...(ai.difficulty?.teamAttributeOverrides ?? {}) },
            goalkeeperAttributes: null, traits: [], appearance: {},
        })),
    };
}
