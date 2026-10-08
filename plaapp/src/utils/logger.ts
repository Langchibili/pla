type LogArgs = unknown[];

export const logger = {
  debug(message: string, ...args: LogArgs) {
    if (__DEV__) console.debug(`[${APP_LABEL}]`, message, ...args);
  },
  info(message: string, ...args: LogArgs) {
    console.info(`[${APP_LABEL}]`, message, ...args);
  },
  warn(message: string, ...args: LogArgs) {
    console.warn(`[${APP_LABEL}]`, message, ...args);
  },
  error(message: string, ...args: LogArgs) {
    console.error(`[${APP_LABEL}]`, message, ...args);
  },
};

const APP_LABEL = 'PLA';
