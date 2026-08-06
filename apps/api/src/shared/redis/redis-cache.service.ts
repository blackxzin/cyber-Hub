import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

// Cache JSON com TTL sobre Redis. Métodos anulam erros de Redis (o cache nunca
// derruba a requisição — em queda de Redis, cai pra empty e segue).
@Injectable()
export class RedisCacheService {
  constructor(@Inject(Redis) private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSec = 60): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSec);
    } catch {
      // silencioso
    }
  }

  // getOrSet: tenta cache, se miss chama loader e grava. Útil p/ consultas externas.
  async getOrSet<T>(key: string, ttlSec: number, loader: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await loader();
    await this.set(key, value, ttlSec);
    return value;
  }
}