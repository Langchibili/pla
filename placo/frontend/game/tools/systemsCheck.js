import assert from 'node:assert/strict';
import { resolvePhysics, resolveTraits } from '../core/params';
import { DT, World } from '../sim/world';

const POSITIONS = ['GK', 'FB', 'CB', 'CB', 'FB', 'DM', 'W', 'CM', 'ST', 'AM', 'W'];
function team(name) {
    return {
        clubName: name,
        players: POSITIONS.map((position, index) => ({
            playerId: `${name}-${index + 1}`,
            slot: `P-${index + 1}`,
            position,
            attributes: { sprintSpeed: 60, acceleration: 60, agility: 60, strength: 60, stamina: 60, jumping: 60, penalties: 60 },
            goalkeeperAttributes: index === 0 ? { reflexes: 60, diving: 60, handling: 60 } : null,
        })),
    };
}
function config(seed, extras = {}) {
    return {
        matchId: seed, matchCode: seed, mode: 'training', seed,
        controlledSide: 'home', opponentIsAI: true,
        home: team('Home'), away: team('Away'),
        physics: {}, rules: { halfLengthSeconds: 30 }, ai: {},
        hashes: { roster: '', physics: '' }, stadium: null, camera: 'tv',
        ...extras,
    };
}
function hooks() {
    let result = null;
    return {
        event() {}, banner() {}, score() {}, goal() {}, kick() {},
        finished(value) { result = value; },
        get result() { return result; },
    };
}

const dry = new World(config('surface-dry'), hooks(), 'systems-check');
const wet = new World(config('surface-wet', { weather: { wetness: 1 } }), hooks(), 'systems-check');
assert(wet.P.groundMu < dry.P.groundMu, 'wet turf should reduce ball-ground grip');
assert(wet.P.rollingResistance < dry.P.rollingResistance, 'wet turf should let a rolling ball travel farther');
assert(wet.P.tractionMu < dry.P.tractionMu, 'wet turf should reduce player traction');

const P = resolvePhysics({});
const tallDefender = resolveTraits({ height: 196, weight: 100, agility: 60 }, null, P, 'DEF');
const shortWinger = resolveTraits({ height: 165, weight: 60, agility: 60 }, null, P, 'FWD');
assert(tallDefender.height > shortWinger.height, 'height attributes should change player stature');
assert(tallDefender.mass > shortWinger.mass, 'weight attributes should change collision mass');
assert(tallDefender.bodyTurn < shortWinger.bodyTurn, 'larger players should turn less sharply');

const collisionWorld = new World(config('body-collision'), hooks(), 'systems-check');
const [first, second] = collisionWorld.players;
collisionWorld.players.slice(2).forEach(player => { player.sentOff = true; });
first.x = 0; first.z = 0; first.vx = 5; first.vz = 0;
second.x = 0.4; second.z = 0; second.vx = -5; second.vz = 0;
collisionWorld.moveAll(DT, true);
assert(first.stumbleT > 0 || second.stumbleT > 0, 'high-speed body contact should cause a procedural stumble');
assert(Math.hypot(first.x - second.x, first.z - second.z) >= 0.7, 'body collision should resolve overlap');

const refereeWorld = new World(config('advantage'), hooks(), 'systems-check');
const victim = refereeWorld.team[0][8], offender = refereeWorld.team[1][3];
victim.x = 12; victim.z = 0;
offender.x = 13; offender.z = 0;
refereeWorld.phase = 'live';
refereeWorld.owner = victim;
refereeWorld.callFoul(offender, victim);
assert(refereeWorld.advantage, 'the referee should play advantage for a clear attacking possession');
refereeWorld.owner = offender;
refereeWorld.resolveAdvantage();
assert.equal(refereeWorld.restart?.side, 0, 'lost advantage should return play to the fouled team');

function simulateShootout() {
    const callbacks = hooks();
    const world = new World(config('knockout', {
        mode: 'knockout',
        rules: { halfLengthSeconds: 30, knockout: true, extraTimeEnabled: true, extraTimeHalfLengthSeconds: 10 },
    }), callbacks, 'systems-check');
    world.autoPlay = true;
    world.period = 2;
    world.endHalf();
    assert.equal(world.period, 3, 'a drawn knockout should enter extra time');
    world.endHalf();
    assert.equal(world.period, 4, 'extra time should have two periods');
    world.endHalf();
    assert.equal(world.phase, 'shootout', 'a drawn knockout should enter a penalty shootout');
    for (let tick = 0; tick < 30000 && world.phase !== 'fulltime'; tick++)
        world.step(DT);
    assert.equal(world.phase, 'fulltime', 'the shootout should resolve within its simulation guard');
    assert(world.shootout.complete && world.shootout.winner !== undefined, 'the shootout should award a winner');
    assert(callbacks.result?.shootout_score, 'the final result should include the shootout score');
    return {
        score: callbacks.result.shootout_score,
        kicks: callbacks.result.events
            .filter(event => event.event_type === 'penalty_scored' || event.event_type === 'penalty_missed')
            .map(event => [event.event_type, event.team_side]),
    };
}
assert.deepEqual(simulateShootout(), simulateShootout(), 'seeded shootouts should be deterministic');

console.log('Simulation systems checks passed: wet/dry surfaces, player archetypes/collisions, advantage, extra time and penalties.');
