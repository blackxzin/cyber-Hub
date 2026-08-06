import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Public } from '../shared/decorators/decorators';
import { AlertsService } from './alerts.service';

// por ora público (rota do bot). Alerta = regra p/ notificar.
@Public()
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  list() {
    return this.alerts.list();
  }

  @Post()
  create(@Body() body: { rule: unknown; channel?: 'DISCORD' | 'EMAIL' | 'WEBHOOK' }) {
    return this.alerts.create(body);
  }

  @Patch(':id')
  setActive(@Param('id') id: string, @Body() body: { active?: boolean }) {
    return this.alerts.setActive(id, Boolean(body.active));
  }
}