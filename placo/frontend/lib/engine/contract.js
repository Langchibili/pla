/**
 * The boundary between the web shell and the Babylon match engine.
 * The shell passes a frozen match config in and receives a match result out.
 *
 * @typedef {'side' | 'tv' | 'sideline' | 'ball' | 'goal_to_goal' | 'top_down'} CameraMode
 * @typedef {{
 *   clubName: string,
 *   formationCode: string | null,
 *   formation: { players: { shirtNumber: number, role: string, x: number, z: number }[] } | null,
 *   kit: { code: string, primary: string, secondary: string, trim: string } | null,
 *   players: {
 *     playerId: string, slot: string, position: string, attributes: Record<string, number>,
 *     goalkeeperAttributes?: Record<string, number> | null, traits: string[], appearance: Record<string, unknown>
 *   }[]
 * }} TeamSetup
 * @typedef {{
 *   matchId: string, matchCode: string, mode: string, seed: string,
 *   controlledSide: 'home' | 'away', opponentIsAI: boolean,
 *   home: TeamSetup, away: TeamSetup,
 *   physics: object, rules: object, ai: object, weather?: object | string | null,
 *   hashes: { roster: string, physics: string }, stadium: string | null,
 *   camera: CameraMode, difficulty?: object
 * }} MatchConfig
 * @typedef {{
 *   possession_percent: number, pass_accuracy_percent: number, expected_goals: number,
 *   shots: number, shots_on_target: number, passes_completed: number,
 *   passes_attempted: number, fouls: number, corners: number, saves: number,
 *   yellow_cards: number, red_cards: number
 * }} MatchMetrics
 * @typedef {{
 *   event_sequence: number, event_type: string, simulation_time_seconds: number,
 *   period_number: number, team_side: 'home' | 'away' | 'neutral',
 *   actor_player_id?: string, position_payload?: unknown
 * }} MatchEventOut
 * @typedef {{
 *   home_score: number, away_score: number,
 *   metrics: { home: MatchMetrics, away: MatchMetrics },
 *   events: MatchEventOut[], input_log: { tick: number, input: TouchInput }[],
 *   shootout_score?: { home: number, away: number, winner: number },
 *   match_ended_at: string, simulation_build: string
 * }} MatchResult
 * @typedef {{
 *   move: { x: number, y: number }, sprint: boolean,
 *   action: 'pass' | 'shoot' | 'through' | 'lob' | 'cross' | 'tackle' | 'slide' | null,
 *   actionHeld: boolean, modifier: 'finesse' | null, switch?: boolean
 * }} TouchInput
 * @typedef {{ signal?: AbortSignal, onProgress?: (progress: { asset: string, loaded: number, total: number }) => void }} EngineOptions
 * @typedef {{
 *   start(): void, pause(): void, resume(): void, setInput(input: TouchInput): void,
 *   setCamera(mode: CameraMode): void, switchPlayer(): void,
 *   replay(): boolean,
 *   on(event: string, callback: (...args: unknown[]) => void): () => void,
 *   dispose(): void
 * }} MatchEngine
 * @typedef {(canvas: HTMLCanvasElement, config: MatchConfig, options?: EngineOptions) => Promise<MatchEngine>} EngineFactory
 */
export {};
