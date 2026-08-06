import { Injectable } from '@nestjs/common';
import { config } from '@cyberhub/shared';
import { HermesOllamaProvider } from './providers/hermes-ollama.provider';
import type { IAIProvider, IAIRequest } from './ai-provider';

// Fachada da IA. Ninguém chama provider direto — passa por aqui.
// Strategy: provider ativo por AI_PROVIDER (só hermes implementado; openai/openclaw = slot).
@Injectable()
export class AiService {
  private readonly provider: IAIProvider;

  constructor() {
    const kind = config().AI_PROVIDER;
    if (kind === 'hermes') this.provider = new HermesOllamaProvider();
    else {
      // ponytail: OpenAIProvider/OpenClawProvider quando chegarem.
      this.provider = new HermesOllamaProvider();
    }
  }

  async chat(req: IAIRequest) {
    const res = await this.provider.chat(req);
    return {
      answer: res.text,
      provider: res.provider,
      model: res.model ?? null,
      tokensUsed: res.tokensUsed ?? null,
    };
  }
}
