import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertDispatcher } from './alert-dispatcher';

@Module({
  controllers: [AlertsController],
  providers: [AlertsService, AlertDispatcher],
  exports: [AlertDispatcher],
})
export class AlertsModule {}