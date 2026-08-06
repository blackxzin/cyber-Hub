import { Injectable } from '@nestjs/common';
import { config } from '@cyberhub/shared';
import { prisma } from '@cyberhub/database';
import { isIP, isCVE, normalizeDomain } from '@cyberhub/utils';
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

  // /ai/explain — reúne o que sabemos sobre a entidade e pede à IA um resumo pt-BR.
  async explain(query: string): Promise<{ answer: string; entity: string; model: string | null }> {
    const entity = query.trim();
    const context = await this.gatherContext(entity);
    const system =
      'Você é o analista do CyberHub AI. Explique em português claro e objetivo o que é este alvo, ' +
      'pontos de atenção e riscos, baseado SÓ nos dados fornecidos. Não invente fatos além deles. ' +
      'Se não houver dados específicos, diga isso e dê um resumo genérico. Use bullets curtos.';
    const res = await this.provider.chat({ system, message: context, maxTokens: 600 });
    return { answer: res.text, entity, model: res.model ?? null };
  }

  private async gatherContext(query: string): Promise<string> {
    const q = query.trim().toLowerCase();

    // CVE
    if (isCVE(q)) {
      const cve = await prisma.cve.findUnique({
        where: { id: q.toUpperCase() },
        include: { references: true },
      });
      if (cve) {
        return [
          `Alvo: CVE ${cve.id}`,
          `Severidade CVSS v3: ${cve.cvss ?? 'não informado'} (${severityLabel(cve.cvss)})`,
          `Publicação: ${cve.publishedAt?.toISOString() ?? '-'}`,
          `Descrição: ${cve.description}`,
          cve.references.length ? `Referências: ${cve.references.slice(0, 5).map((r) => r.url).join(', ')}` : '',
        ]
          .filter(Boolean)
          .join('\n');
      }
      return `Alvo: CVE ${q.toUpperCase()}. Não temos registro local deste CVE.`;
    }

    // IP
    if (isIP(q)) {
      const intel = await this.intel(fetch, `/intel/ip/${q}`);
      return `Alvo: IP ${q}.\nDados de intel:\n${JSON.stringify(intel, null, 2)}`;
    }

    // Domínio
    const domain = normalizeDomain(q);
    if (domain) {
      const intel = await this.intel(fetch, `/intel/domain/${domain}`);
      return `Alvo: domínio ${domain}.\nDados de intel:\n${JSON.stringify(intel, null, 2)}`;
    }

    // Notícia por título (aproximação).
    const news = await prisma.news.findFirst({ where: { title: { contains: q } }, orderBy: { publishedAt: 'desc' } });
    if (news) {
      return `Alvo: notícia "${news.title}"\nFonte: ${news.source ?? '-'} · ${news.publishedAt?.toISOString() ?? '-'}\nResumo: ${news.summary ?? news.body ?? '-'}`;
    }

    return `Alvo genérico: "${query}". Não reconhecemos como CVE, IP, domínio ou notícia conhecida.`;
  }

  private async intel(fetcher: typeof fetch, path: string): Promise<unknown> {
    try {
      const res = await fetcher(`http://localhost:3001${path}`);
      if (res.ok) return await res.json();
      return { http: res.status };
    } catch {
      return { error: 'serviço externo indisponível' };
    }
  }
}

function severityLabel(score: number | null): string {
  if (score == null) return 'não informado';
  if (score >= 9) return 'CRÍTICA';
  if (score >= 7) return 'ALTA';
  if (score >= 4) return 'MÉDIA';
  return 'BAIXA';
}
