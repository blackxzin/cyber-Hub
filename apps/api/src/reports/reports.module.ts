import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsQueue } from './reports.queue';
import { ReportsWorker } from './reports.worker';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsQueue, ReportsWorker],
  exports: [ReportsService],
})
export class ReportsModule {}