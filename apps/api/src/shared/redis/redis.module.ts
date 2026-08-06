import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { config } from '@cyberhub/shared';
import { RedisCacheService } from './redis-cache.service';

// Conexão Redis única (singleton global) + RedisCacheService.
const REDIS_PROVIDER = Symbol('REDIS');

@Global()
@Module({
  providers: [
    {
      provide: REDIS_PROVIDER,
      useFactory: () => {
        const cfg = config();
        return new Redis({
          host: cfg.REDIS_HOST,
          port: cfg.REDIS_PORT,
          password: cfg.REDIS_PASSWORD,
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableReadyCheck: true,
        });
      },
    },
    {
      provide: Redis,
      useExisting: REDIS_PROVIDER,
    },
    RedisCacheService,
  ],
  exports: [Redis, RedisCacheService],
})
export class RedisModule {}