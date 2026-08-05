import { pino, type Logger } from 'pino';

// Dev: pretty; prod: JSON. Level por NODE_ENV.
const isDev = process.env.NODE_ENV !== 'production';

const base = pino({
  level: isDev ? 'debug' : 'info',
  ...(isDev
    ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } } }
    : {}),
});

/** Logger root — usar direto ou via createLogger(name) p/ child com bound. */
export const logger: Logger = base;

export function createLogger(name: string): Logger {
  return base.child({ module: name });
}
// ponytail: trocar por transport thread quando volume crescer; pino-pretty em devDep só.
