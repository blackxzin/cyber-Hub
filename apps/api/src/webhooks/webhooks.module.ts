import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { IngestService } from './ingest.service';

@Module({
  controllers: [WebhooksController],
  providers: [IngestService],
})
export class WebhooksModule {}