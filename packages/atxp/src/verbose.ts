import { ConsoleLogger, LogLevel } from '@atxp/common';

export function isVerboseMode(): boolean {
  if (process.argv.includes('--verbose') || process.argv.includes('-v')) {
    return true;
  }
  const debug = process.env.DEBUG?.toLowerCase();
  return debug === '1' || debug === 'true' || debug?.includes('atxp') === true;
}

export function getCliLogger(): ConsoleLogger {
  return new ConsoleLogger({
    level: isVerboseMode() ? LogLevel.DEBUG : LogLevel.WARN,
  });
}
