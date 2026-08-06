import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { WebhooksController } from './webhooks.controller';
import { IngestService } from './ingest.service';

@Module({
  imports: [AlertsModule],
  controllers: [WebhooksController],
  providers: [IngestService],
})
export class WebhooksModule {}