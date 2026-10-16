import { World, DT } from '../sim/world';
import { TUNE, TUNE_DEFAULTS, applyTune } from '../core/tuning';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const option = (name, fallback) => {
    const index = argv.indexOf(`--${name}`);
    return index < 0 ? fallback : argv[index + 1];
};
const numberOption = (name, fallback) => {
    const value = option(name, undefined);
    if (value === undefined)
        return fallback;
    const parsed = Number(value);
    if (!Number.isFinite(parsed))
        throw new Error(`--${name} must be a finite number.`);
    return parsed;
};

const N = numberOption('n', 60);
const HALF = numberOption('half', 180);
const BOOST = numberOption('boost', 0);
const ROUNDS = numberOption('rounds', 2);
const K = numberOption('k', Math.min(1, ((2 * HALF) / 5400) * 3));

if (!Number.isInteger(N) || N < 1)
    throw new Error('--n must be a positive integer.');
if (HALF < 30)
    throw new Error('--half must be at least 30 seconds; the simulation enforces that minimum.');
if (!Number.isInteger(ROUNDS) || ROUNDS < 1)
    throw new Error('--rounds must be a positive integer.');
if (K < 0)
    throw new Error('--k cannot be negative.');

const BASE = {
    sprintSpeed: 65, acceleration: 65, agility: 60, balance: 60, strength: 60, stamina: 65, jumping: 60,
    dribbling: 55, ballControl: 55, shortPassing: 55, longPassing: 50, crossing: 45, finishing: 45, shotPower: 60,
    longShots: 45, volleys: 40, curve: 45, freeKickAccuracy: 40, penalties: 50, headingAccuracy: 50,
    standingTackle: 45, slideTackle: 40, interceptions: 45, marking: 45, aggression: 55, vision: 50, composure: 50,
    reactions: 55, attackPositioning: 50, defendPositioning: 45, anticipation: 50, decisions: 50, workRate: 60, weakFoot: 50,
};
const GK = { reflexes: 60, diving: 60, handling: 58, gkPositioning: 60, kicking: 50 };
const POSITIONS = ['GK', 'FB', 'CB', 'CB', 'FB', 'DM', 'W', 'CM', 'ST', 'AM', 'W'];

function makeTeam(name, boost = 0) {
    return {
        clubName: name,
        formationCode: '4-3-3',
        formation: null,
        kit: null,
        players: POSITIONS.map((position, index) => {
            const attributes = {};
            for (const [key, value] of Object.entries(BASE))
                attributes[key] = Math.max(1, Math.min(100, value + boost));
            return {
                playerId: `${name}-${index + 1}`,
                slot: `P-${index + 1}`,
                position,
                attributes,
                goalkeeperAttributes: index === 0 ? GK : null,
                traits: [],
                appearance: {},
            };
        }),
    };
}

function playMatch(seed) {
    const config = {
        matchId: seed,
        matchCode: seed,
        mode: 'training',
        seed,
        controlledSide: 'home',
        opponentIsAI: true,
        home: makeTeam('H', BOOST),
        away: makeTeam('A'),
        physics: {},
        rules: { halfLengthSeconds: HALF },
        ai: {},
        hashes: { roster: '', physics: '' },
        stadium: null,
        camera: 'tv',
    };
    let result = null;
    const hooks = {
        event() {},
        banner() {},
        score() {},
        goal() {},
        finished(value) { result = value; },
        kick() {},
    };
    const world = new World(config, hooks, 'calibrate');
    world.autoPlay = true;
    world.controlled = null;
    let guard = 0;
    while (!result && guard++ < 60 * 60 * 40)
        world.step(DT);
    if (!result)
        throw new Error(`Match ${seed} did not finish within the simulation guard.`);
    return { result, world };
}

function newAggregate() {
    return { matches: 0, goals: 0, shots: 0, shotsOnTarget: 0, passes: 0, completedPasses: 0, fouls: 0, corners: 0, offsides: 0, tackles: 0, tacklesWon: 0, saves: 0, homeWins: 0, draws: 0, awayWins: 0, goalless: 0, fivePlus: 0 };
}

function evaluate(count) {
    const aggregate = newAggregate();
    for (let index = 0; index < count; index++) {
        const { result, world } = playMatch(`cal-${index}`);
        const { home, away } = result.metrics;
        const goals = result.home_score + result.away_score;
        aggregate.matches++;
        aggregate.goals += goals;
        for (const metrics of [home, away]) {
            aggregate.shots += metrics.shots;
            aggregate.shotsOnTarget += metrics.shots_on_target;
            aggregate.passes += metrics.passes_attempted;
            aggregate.completedPasses += metrics.passes_completed;
            aggregate.fouls += metrics.fouls;
            aggregate.corners += metrics.corners;
            aggregate.saves += metrics.saves;
        }
        aggregate.offsides += result.events.filter(event => event.event_type === 'offside').length;
        aggregate.tackles += world.extra.tackles[0] + world.extra.tackles[1];
        aggregate.tacklesWon += world.extra.tacklesWon[0] + world.extra.tacklesWon[1];
        if (result.home_score > result.away_score)
            aggregate.homeWins++;
        else if (result.home_score < result.away_score)
            aggregate.awayWins++;
        else
            aggregate.draws++;
        if (goals === 0)
            aggregate.goalless++;
        if (goals >= 5)
            aggregate.fivePlus++;
    }
    return aggregate;
}

const rows = [
    { label: 'Goals / match (both)', target: 2.7, tolerance: 0.3, weight: 3, value: a => a.goals / a.matches },
    { label: 'Shots / team', target: 12.5, tolerance: 1.5, weight: 3, value: a => a.shots / (2 * a.matches) },
    { label: 'Shots on target / team', target: 4.2, tolerance: 0.55, weight: 2, value: a => a.shotsOnTarget / (2 * a.matches) },
    { label: 'GK save % (saves/(saves+goals))', target: 70, tolerance: 5, weight: 2, value: a => 100 * a.saves / Math.max(1, a.saves + a.goals) },
    { label: 'Pass accuracy %', target: 82, tolerance: 3, weight: 1, value: a => 100 * a.completedPasses / Math.max(1, a.passes) },
    { label: `Passes / team (x${K.toFixed(2)})`, target: 450 * K, tolerance: 75 * K, weight: 1, value: a => a.passes / (2 * a.matches) },
    { label: `Fouls / team (x${K.toFixed(2)})`, target: 11.5 * K, tolerance: Math.max(0.5, 1.75 * K), weight: 1, value: a => a.fouls / (2 * a.matches) },
    { label: `Corners / team (x${K.toFixed(2)})`, target: 5 * K, tolerance: Math.max(0.4, 0.8 * K), weight: 1, value: a => a.corners / (2 * a.matches) },
    { label: `Offsides / team (x${K.toFixed(2)})`, target: 2 * K, tolerance: Math.max(0.3, 0.6 * K), weight: 1, value: a => a.offsides / (2 * a.matches) },
    { label: `Tackles / team (x${K.toFixed(2)})`, target: 18 * K, tolerance: Math.max(0.8, 3 * K), weight: 1, value: a => a.tackles / (2 * a.matches) },
    { label: 'Tackle win %', target: 60, tolerance: 7, weight: 1, value: a => 100 * a.tacklesWon / Math.max(1, a.tackles) },
];

const loss = aggregate => rows.reduce((total, row) => total + row.weight * ((row.value(aggregate) - row.target) / row.tolerance) ** 2, 0);

function report(aggregate) {
    console.log(`\n${aggregate.matches} matches | half=${HALF}s | k=${K.toFixed(2)} | boost=${BOOST}`);
    console.log('tune', JSON.stringify(TUNE));
    console.log('-'.repeat(78));
    for (const row of rows) {
        const value = row.value(aggregate);
        const status = Math.abs(value - row.target) <= row.tolerance ? 'OK  ' : value < row.target ? 'LOW ' : 'HIGH';
        console.log(`${status}  ${row.label.padEnd(36)} ${value.toFixed(2).padStart(8)}   target ${row.target.toFixed(2)} +/- ${row.tolerance.toFixed(2)}`);
    }
    console.log('-'.repeat(78));
    console.log(`H/D/A ${(100 * aggregate.homeWins / aggregate.matches).toFixed(0)}% / ${(100 * aggregate.draws / aggregate.matches).toFixed(0)}% / ${(100 * aggregate.awayWins / aggregate.matches).toFixed(0)}% (reference: 45/25/30)`);
    console.log(`0-0 ${(100 * aggregate.goalless / aggregate.matches).toFixed(0)}% (reference ~7) | 5+ goals ${(100 * aggregate.fivePlus / aggregate.matches).toFixed(0)}% (reference ~13) | loss ${loss(aggregate).toFixed(2)}`);
}

const knobs = [
    { key: 'shootThreshold', multiplicative: true, min: 0.4, max: 2.5, step: 0.2 },
    { key: 'tackleAttempt', multiplicative: true, min: 0.3, max: 2.5, step: 0.2 },
    { key: 'foulScale', multiplicative: true, min: 0.3, max: 3, step: 0.25 },
    { key: 'errorScale', multiplicative: true, min: 0.4, max: 2, step: 0.15 },
    { key: 'gkCatchBonus', multiplicative: false, min: -0.3, max: 0.3, step: 0.05 },
    { key: 'touchShift', multiplicative: false, min: -0.2, max: 0.2, step: 0.03 },
];

function tune() {
    let best = loss(evaluate(N));
    console.log(`Starting loss ${best.toFixed(2)}`);
    for (let round = 0; round < ROUNDS; round++) {
        for (const knob of knobs) {
            const current = TUNE[knob.key];
            for (const direction of [-1, 1]) {
                const candidate = Math.min(knob.max, Math.max(knob.min, knob.multiplicative
                    ? current * (1 + direction * knob.step)
                    : current + direction * knob.step));
                if (candidate === current)
                    continue;
                applyTune({ [knob.key]: candidate });
                const candidateLoss = loss(evaluate(N));
                if (candidateLoss < best) {
                    best = candidateLoss;
                    console.log(`  ${knob.key} -> ${candidate.toFixed(3)} | loss ${candidateLoss.toFixed(2)}`);
                    break;
                }
                applyTune({ [knob.key]: current });
            }
        }
    }
    console.log('\nBest knobs (copy into TUNE_DEFAULTS in game/core/tuning.js):');
    console.log(JSON.stringify(TUNE, null, 2));
}

function checkDeterminism() {
    const first = playMatch('det-1');
    const second = playMatch('det-1');
    const normalize = ({ result, world }) => JSON.stringify({ ...result, match_ended_at: '', extra: world.extra });
    if (normalize(first) !== normalize(second))
        throw new Error('Same seed produced different matches; locate non-seeded randomness before relying on replay verification.');
    console.log('PASS: identical replay for the same seed');
}

function applySet(value) {
    const overrides = {};
    for (const item of value.split(',')) {
        const [key, raw] = item.split('=');
        if (!Object.hasOwn(TUNE_DEFAULTS, key) || raw === undefined || raw.trim() === '')
            throw new Error(`Invalid --set item "${item}". Use a known tuning key=value pair.`);
        const parsed = Number(raw);
        if (!Number.isFinite(parsed))
            throw new Error(`Tuning value for ${key} must be a finite number.`);
        overrides[key] = parsed;
    }
    applyTune(overrides);
}

const setValues = option('set', undefined);
if (setValues === undefined)
    applyTune(TUNE_DEFAULTS);
else
    applySet(setValues);

if (flag('determinism'))
    checkDeterminism();
else if (flag('tune')) {
    tune();
    report(evaluate(N));
}
else
    report(evaluate(N));
