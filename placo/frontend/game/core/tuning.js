export const TUNE_DEFAULTS = {
    shootThreshold: 1,
    tackleAttempt: 1,
    foulScale: 1,
    errorScale: 1,
    gkCatchBonus: 0,
    touchShift: 0,
};

export const TUNE = { ...TUNE_DEFAULTS };

export const applyTune = (overrides) => {
    Object.assign(TUNE, overrides);
};
