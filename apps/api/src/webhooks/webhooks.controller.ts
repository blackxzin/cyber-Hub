import { Body, Controller, Headers, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '@cyberhub/shared';
import { Public } from '../shared/decorators/decorators';
import { IngestService, type IngestCve, type IngestNews } from './ingest.service';

// Endpoints de ingestão vindo do n8n. Assinados com HMAC (N8N_WEBHOOK_SECRET):
// header `x-webhook-signature: sha256=<hex>`. Sem assinatura válida → 401.
@Public()
@Controller('webhooks/n8n')
export class WebhooksController {
  constructor(private readonly ingest: IngestService) {}

  @Post('cve-ingest')
  @HttpCode(200)
  async cveIngest(
    @Headers('x-webhook-signature') signature: string,
    @Body() body: { items?: IngestCve[]; cveIds?: string[] },
  ) {
    this.verify(signature, body);
    const count = await this.ingest.cves(body.items ?? [], body.cveIds);
    return { ok: true, ingested: count };
  }

  @Post('news-ingest')
  @HttpCode(200)
  async newsIngest(@Headers('x-webhook-signature') sig: string, @Body() body: { items?: IngestNews[] }) {
    this.verify(sig, body);
    const count = await this.ingest.news(body.items ?? []);
    return { ok: true, ingested: count };
  }

  private verify(signature: string | undefined, body: unknown): void {
    const secret = config().N8N_WEBHOOK_SECRET;
    if (!secret) throw new UnauthorizedException('webhook HMAC não configurado');
    if (!signature?.startsWith('sha256=')) throw new UnauthorizedException('assinatura ausente');
    const raw = JSON.stringify(body);
    const computed = createHmac('sha256', secret).update(raw).digest('hex');
    const given = Buffer.from(signature.slice('sha256='.length), 'hex');
    const expected = Buffer.from(computed, 'hex');
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      throw new UnauthorizedException('assinatura HMAC inválida');
    }
  }
}