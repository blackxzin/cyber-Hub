import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { config } from '@cyberhub/shared';
import { SharedModule } from './shared/shared.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RedisModule } from './shared/redis/redis.module';
import { CvesModule } from './cves/cves.module';
import { NewsModule } from './news/news.module';
import { AiModule } from './ai/ai.module';
import { IntelModule } from './intel/intel.module';
import { ReportsModule } from './reports/reports.module';
import { AlertsModule } from './alerts/alerts.module';
import { LogsModule } from './logs/logs.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { StatsModule } from './stats/stats.module';
import { JwtAuthGuard } from './shared/guards/jwt-auth.guard';
import { RolesGuard } from './shared/guards/roles.guard';

@Module({
  imports: [
    // ConfigModule valida process.env contra zod; credentialAccess p/ DI.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env', // .env vive na raiz do monorepo
      // Valida env cedo (lança se inválido). env validated é reusado via @cyberhub/shared/config().
      validate: () => config(),
    }),
ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 120 },
      { name: 'auth', ttl: 60_000, limit: 10 },
      { name: 'ingest', ttl: 60_000, limit: 30 },
    ]),
    SharedModule,
    DatabaseModule,
    RedisModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CvesModule,
    NewsModule,
    AiModule,
    IntelModule,
    ReportsModule,
    AlertsModule,
    LogsModule,
    WebhooksModule,
    StatsModule,
  ],
  providers: [
    // Guarda JWT global: tudo exige auth.exceto @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Rate limit global.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // RBAC depois do JWT.
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
