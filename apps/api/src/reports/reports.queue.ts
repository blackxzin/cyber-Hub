import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { config } from '@cyberhub/shared';

// Fila BullMQ p/ geração de relatórios. O worker (worker.ts) consome.
// Redis: mesma conexão do resto (config REDIS_*).
@Injectable()
export class ReportsQueue implements OnModuleDestroy {
  private readonly queue: Queue;

  constructor() {
    const cfg = config();
    this.queue = new Queue('reports', {
      connection: {
        host: cfg.REDIS_HOST,
        port: cfg.REDIS_PORT,
        password: cfg.REDIS_PASSWORD,
      },
      defaultJobOptions: { removeOnComplete: 100, attempts: 2 },
    });
  }

  async add(reportId: string, target: { ip?: string; domain?: string; cveId?: string }): Promise<void> {
    await this.queue.add('generate', { reportId, target });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
