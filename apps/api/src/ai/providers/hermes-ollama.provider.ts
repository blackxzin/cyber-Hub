import { Injectable } from '@nestjs/common';
import { config } from '@cyberhub/shared';
import type { IAIProvider, IAIRequest, IAIResponse } from '../ai-provider';

// Provider padrão: Hermes via Ollama (http://localhost:11434). Se o Ollama
// não estiver de pé, responde com fallback útil (offline) em vez de quebrar.
@Injectable()
export class HermesOllamaProvider implements IAIProvider {
  readonly name = 'hermes';

  async chat(req: IAIRequest): Promise<IAIResponse> {
    const cfg = config();
    try {
      const res = await fetch(`${cfg.HERMES_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: cfg.HERMES_MODEL,
          stream: false,
          messages: [
            ...(req.system ? [{ role: 'system' as const, content: req.system }] : []),
            { role: 'user' as const, content: req.message },
          ],
          options: req.maxTokens ? { num_predict: req.maxTokens } : undefined,
        }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
      const body = (await res.json()) as { message?: { content?: string } };
      const text = body.message?.content?.trim();
      if (!text) throw new Error('Ollama resposta vazia');
      return { text, provider: this.name, model: cfg.HERMES_MODEL };
    } catch (err) {
      // Fallback offline: responde de forma útil sem IA, sinalizando que está off.
      const msg = (err as Error).message;
      return {
        text: `[IA offline — ${msg}]\n\nSou o CyberHub sem o Hermes (Ollama) de pé. Não consigo raciocinar agora, mas posso consultar intel, CVEs e notícias via /ip, /domain, /cve e /news. Suba o Ollama (docker compose) p/ ativar o chat.`,
        provider: this.name,
        model: `${cfg.HERMES_MODEL} (fallback)`,
      };
    }
  }
}
