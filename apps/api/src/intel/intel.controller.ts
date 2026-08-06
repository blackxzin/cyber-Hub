import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../shared/decorators/decorators';
import { IntelService } from './intel.service';
import { isIP, normalizeDomain } from '@cyberhub/utils';
import { ValidationError } from '@cyberhub/shared';

// por ora público (sem auth p/ o bot). ponytail: @UseGuards(ApiKeyAuthGuard) quando reativar modelo de rota.
@Public()
@Controller('intel')
export class IntelController {
  constructor(private readonly intel: IntelService) {}

  @Get('ip/:ip')
  ip(@Param('ip') ip: string) {
    if (!isIP(ip)) throw new ValidationError(`IP inválido: ${ip}`);
    return this.intel.ip(ip);
  }

  @Get('domain/:domain')
  domain(@Param('domain') domain: string) {
    const d = normalizeDomain(domain);
    if (!d) throw new ValidationError('Domínio inválido');
    return this.intel.domain(d);
  }
}
