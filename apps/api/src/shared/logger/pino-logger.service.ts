import { Injectable, LoggerService } from '@nestjs/common';
import { createLogger } from '@cyberhub/shared';

// Adapta o logger pino do @cyberhub/shared à interface LoggerService do Nest.
// Para usar como logger global: app.useLogger(new PinoLoggerService()).
@Injectable()
export class PinoLoggerService implements LoggerService {
  private readonly logger = createLogger('api');

  log(message: string, context?: string) {
    this.logger.info({ ctx: context }, message);
  }
  error(message: string, trace?: string, context?: string) {
    this.logger.error({ ctx: context, trace }, message);
  }
  warn(message: string, context?: string) {
    this.logger.warn({ ctx: context }, message);
  }
  debug(message: string, context?: string) {
    this.logger.debug({ ctx: context }, message);
  }
  verbose(message: string, context?: string) {
    this.logger.trace({ ctx: context }, message);
  }
  fatal(message: string, context?: string) {
    this.logger.fatal({ ctx: context }, message);
  }
}
