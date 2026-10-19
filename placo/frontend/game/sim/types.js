export class Player {
    id;
    side;
    slot;
    num;
    role;
    playerId;
    traits;
    x = 0;
    z = 0;
    vx = 0;
    vz = 0;
    heading = 0;
    stamina = 1;
    /** formation anchor in normalised units: depth 0 (own goal) … 1 (opp goal), lat −1…1 (z) */
    depth = 0.5;
    lat = 0;
    // intent written by AI / human each tick
    tx = 0;
    tz = 0;
    speedFrac = 0.65;
    sprint = false;
    // timers
    touchCd = 0;
    tackleCd = 0;
    stun = 0;
    thinkCd = 0;
    holdT = 0;
    touchT = 0;
    touchFoot = 1;
    lastStep = 0;
    // animation hints for the renderer
    phase = 0;
    kickT = 0;
    // goalkeeper dive state
    dive = null;
    gkHolding = false;
    constructor(id, side, slot, num, role, playerId, traits) {
        this.id = id;
        this.side = side;
        this.slot = slot;
        this.num = num;
        this.role = role;
        this.playerId = playerId;
        this.traits = traits;
    }
    get speed() { return Math.hypot(this.vx, this.vz); }
}
