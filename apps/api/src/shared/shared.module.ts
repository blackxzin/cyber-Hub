import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PinoLoggerService } from './logger/pino-logger.service';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ApiKeyStrategy } from './strategies/api-key.strategy';
// RolesGuard é provida via APP_GUARD no AppModule; não repetir aqui.

@Global()
@Module({
  providers: [
    PinoLoggerService,
    JwtStrategy,
    ApiKeyStrategy,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [PinoLoggerService, JwtStrategy, ApiKeyStrategy],
})
export class SharedModule {}
