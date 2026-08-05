# CyberHub AI — Architecture Decision Record

> **Status**: Aprovado (Fase 0 — Planejamento)
> **Data**: 2026-08-04
> **Autor**: Tech Lead
> **Escopo**: Documento de arquitetura completo — sem código. Primeira artefato antes de qualquer implementação.

---

## 0. Sumário Executivo

**CyHub AI** é uma central de **automação, inteligência artificial e cibersegurança**. O sistema expõe uma API própria (o "cérebro"), consome integrações externas de threat intelligence (VirusTotal, AbuseIPDB, Shodan, NVD, CISA…), agrega tudo num banco PostgreSQL, orquestra automações no n8n, aplica uma camada de IA (Hermes via Ollama, futuramente um agente OpenClaw) para resumir/explicar/gerar relatórios, e entrega o resultado via **Dashboard Web (Next.js)** e **Bot Discord**.

Princípios norteadores:

- **Modularidade total**: cada módulo é independente, conversa só por interfaces bem definidas.
- **Desacoplamento**: nada acessa banco/modelo de IA/API externa diretamente — sempre por uma camada de serviço (Service Layer + Repository + Adapter).
- **Crescimento sem retrabalho**: adicionar nova integração, novo bot, novo workflow, novo modelo de IA = classe nova + registro, **zero modificação em código existente** (Open/Closed).
- **Pronto para SaaS**: multi-tenant por design (mesmo que single-tenant na Fase 1), RBAC, rate limit, auditoria.

O documento está organizado como uma série de ADRs numerados (AD-01, AD-02…), cada um com **Contexto → Decisão → Consequências (vantagens/desvantagens)**.

---

## AD-01 — Stack Tecnológica

| Camada | Tecnologia | Por quê |
|---|---|---|
| Frontend | Next.js 14 (App Router) + React + TypeScript + TailwindCSS + shadcn/ui | SSR/RSC para SEO e performance,рентabilidade de componentes via shadcn sobre Radix, Tailwind para design system consistente. |
| Backend | NestJS + TypeScript | DI madura, module system explícito mapeia 1:1 para "módulos independentes", decoratorsexpressivos pra guards/interceptors, ótimo para RBAC/auditoria. |
| Banco | PostgreSQL 16 | Relacional robusto, JSONB para dados semi-estruturados (respostas de APIs externas), índices GIN, estabilidade. |
| ORM | Prisma | Schema como fonte da verdade, type-safe end-to-end, migrations versionadas, bom DX. |
| Cache/Fila | Redis 7 + BullMQ | BullMQ roda sobre o mesmo Redis do cache; moderno, tipado, retries/delays/flows. |
| Auth | JWT access+refresh, RBAC | Stateless, escalável horizontalmente; refresh em Redis para revogação. |
| Automação | n8n | Visual, versionável (workflows em JSON), conecta APIs externas sem código. |
| Bot | discord.js | Padrão de facto, slash commands, tipado. |
| IA | Hermes (Ollama) + adapters | Roda local, sem custo de API, privacidade; Strategy permite trocar/adiicionar OpenClaw/OpenAI depois. |
| Infra | Docker Compose | Dev local reproduzível. |

### AD-01.1 — Backend: NestJS em vez de Fastify (justificada)

**Contexto**: o briefing original oferecia "Fastify ou NestJS caso justifique".

**Decisão**: **NestJS**.

**Justificativa**:
- O requisito central — "módulos independentes, nada acoplado, DI, RBAC, auditoria" — é exatamente o modelo do NestJS (`@Module`, providers, guards, interceptors). Replicar isso no Fastify exigiria construir um framework em torno dele.
- DI por construtor (`constructor(private readonly repo: UserRepository)`) torna o desacoplamento explícito e testável sem infraestrutura manual.
- O "Module Pattern" pedido já é primitiva da linguagem do framework.
- **Trade-off aceito**: Nest é mais verboso e tem overhead. Para um projeto que visa portfólio + SaaS, o ganho de consistência supera o custo. Fastify continua como *engine HTTP* sob o Nest (`FastifyAdapter`) — ou seja, pegamos a performance do Fastify sem abrir mão da estrutura.

### AD-01.2 — Fila: BullMQ + n8n (papéis distintos)

**Contexto**: dois motores de automação podem competir.

**Decisão**: papéis complementares e **não** sobrepostos.

- **BullMQ**: jobs **intra-aplicação**, síncronos ao contexto da API — gerar relatório PDF de uma consulta, enviar um alerta específico, retry de enrichment de domínio. Curto, tipado, observável pela API.
- **n8n**: orquestrações **externas agendadas** — varrer NVD/CISA/RSS diariamente, fluxos com múltiplos passos visuais, integrações que envolvem 3rd-party sem codar.

**Regra**: se o job só vive dentro do domínio CyberHub → BullMQ. Se o job coordena sistemas externos num cron → n8n.

---

## AD-02 — Estrutura de Monorepo

```
cyberhub-ai/
├── apps/
│   ├── dashboard/          # Next.js — frontend web (porta 3000)
│   ├── api/                # NestJS — API/cérebro (porta 3001)
│   └── discord-bot/        # discord.js — bot (consome a API)
├── packages/
│   ├── database/           # @cyberhub/database — Prisma schema + client + repos
│   ├── shared/             # @cyberhub/shared — config, logger, erros de domínio
│   ├── types/              # @cyberhub/types — tipos/DTOs compartilhados(front-bot-api)
│   └── utils/              # @cyberhub/utils — helpers puros (validação IP/CVE, etc.)
├── n8n/
│   ├── workflows/          # .json dos workflows versionados (import manual no n8n)
│   └── credentials/        # credenciais exportadas do n8n (gitignored/secrets)
├── docker/
│   └── docker-compose.yml  # alternativa ao da raiz, se organizar tudo sob /docker
├── docs/
│   ├── ADR.md              # este documento
│   ├── architecture.md     # diagramas de fluxo (texto/Mermaid)
│   └── api/                # OpenAPI gerado
├── scripts/
│   └── setup.sh            # bootstrap: deps, env, migrations, seed
├── .github/
│   └── workflows/          # CI/CD (lint, typecheck, test, build)
├── docker-compose.yml      # Postgres, Redis, n8n (+ Ollama opcional)
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── package.json
└── README.md
```

### Papel de cada pasta

| Pasta | Responsabilidade | Fronteira |
|---|---|---|
| `apps/dashboard` | UI Next: login, painel, histórico, alertas, relatórios, config, perfil. | Só fala com a API via HTTP + JWT. **Zero acesso a banco/IA/APIs externas.** |
| `apps/api` | Cérebro: auth, RBAC, logs, roteamento p/ serviços, orquestra IA/fila/integrações, gateway p/ n8n/Discord. | Único lugar com acesso a banco e integrações. |
| `apps/discord-bot` | Interface Discord: slash commands, formatação de resposta. | **Nunca acessa API externa nem banco.** Só chama a API CyberHub via `x-api-key`. |
| `packages/database` | Prisma `schema.prisma`, client gerado, repositórios tipados. | Consistido por `apps/api`. Schema = fonte da verdade. |
| `packages/shared` | Logger (pino), config/env loader, erros de domínio, constantes. | Sem dependência de app. |
| `packages/types` | DTOs e zod-schemas compartilhados entre dashboard, bot e api. | Garante contrato único entre front↔api↔bot. |
| `packages/utils` | Funções puras: validar IP/CVE, normalizar domínio, parsear CVSS. | Zero efeitos colaterais. |
| `n8n/workflows` | Workflows JSON versionados. | Importados manualmente no n8n (mount read-only já no compose). |
| `docker/` | Compose alternativo/agrupado se crescer. | — |
| `docs/` | ADRs, diagramas, OpenAPI. | Lugar único da verdade arquitetural. |
| `scripts/` | `setup.sh`: instala deps, copia `.env`, roda migrations + seed. | — |
| `.github/workflows/` | CI: lint/typecheck/test/build em PR. | — |

> **Observação**: o `.env.example` e `docker-compose.yml` já existem na raiz hoje (Fase 0/1 parcial). O compose aponta `./n8n/workflows` (read-only) — pasta a ser criada.

---

## AD-03 — Arquitetura em Camadas

```
        ┌─────────────────────────────────────────────┐
        │                  Usuário                     │
        │         (humano) ou (cron/trigger)           │
        └───────────────┬─────────────────────────────┘
                        │
          ┌─────────────┴─────────────┐
          ▼                           ▼
   ┌──────────────┐           ┌──────────────┐
   │  Dashboard   │           │  Discord Bot │
   │  (Next.js)   │           │  (discord.js) │
   └──────┬───────┘           └──────┬───────┘
          │  JWT (cookie/httpOnly)   │  x-api-key
          ▼                          ▼
   ┌────────────────────────────────────────────┐
   │                  API (NestJS)              │
   │  Controllers → Guards(RBAC/RateLimit)     │
   │  → Interceptors(Log/Audit) → Services     │
   └──────┬─────────────────────┬──────────────┘
          │                     │
          ▼                     ▼
   ┌──────────────┐     ┌──────────────┐
   │  Repositories│     │   AI Service │
   │  (Prisma)    │     │  (Strategy)  │
   └──────┬───────┘     └──────┬───────┘
          │                     │
          ▼                     ▼
   ┌──────────────┐     ┌──────────────┐
   │  PostgreSQL  │     │ Hermes (Ollama) / OpenClaw
   └──────────────┘     └──────────────┘

   Lateral:
   ┌──────────────┐     ┌──────────────┐
   │   Redis      │     │     n8n      │
   │ (cache+queue)│◄───►│  workflows   │──► APIs externas
   │              │     │              │    (VirusTotal, NVD...)
   └──────────────┘     └──────────────┘
   BullMQ workers       (aciona API via webhook/com auth)
```

### Camadas e suas responsabilidades

1. **Presentation (Controllers)** — só recebem HTTP, validam (pipe Zod), retornam DTO. Zero lógica de negócio.
2. **Application (Services)** — orquestração de caso de uso: "consultar e enriquecer IP" = chamar adapters na ordem certa, persistir, eventualmente chamar IA. **O "cérebro" mora aqui.**
3. **Domain (Interfaces/Tipos)** — contratos puros (`IVirusTotalAdapter`, `IUserRepository`, `IAIProvider`). Sem implementação. Permite trocar implementação sem tocar service.
4. **Infrastructure (Adapters/Repositórios)** — implementações concretas: PrismaUserRepository, VirusTotalHttpAdapter, HermesOllamaProvider, BullMQQueue.
5. **Cross-cutting (Guards/Interceptors/Pipes)** — RBAC, rate limit, log/auditoria, validação. Aplicados via decorators, nunca embutidos na lógica.

### Como as camadas conversam

- **Dashboard/Bot → API**: HTTP. Dashboard usa JWT (access em cookie httpOnly + refresh); Bot usa header `x-api-key`.
- **API → Banco**: sempre via Repository (interface). O service nunca conhece Prisma.
- **API → IA**: sempre via `AIService` que delega ao `IAIProvider` ativo (Strategy). Nunca `fetch` direto ao Ollama.
- **API → APIs externas**: sempre via Adapter (`IIntelAdapter`). Service orquestra múltiplos adapters e funde resultados.
- **API ↔ n8n**: bidirecional. API dispara webhook pro n8n (iniciar workflow); n8n chama API de volta (webhook endpoint assinado) para persistir dados de varredura.
- **API ↔ Redis**: BullMQ enqueue/dequeue; cache de respostas de intel (TTL) p/ não bater em APIs externas a cada `/ip`.

### Fluxo de dados genérico

```
Input → Controller valida(Zod) → Guard checa auth/RBAC/rate
      → Interceptor loga início
      → Service orquestra:
          adapters externos (VirusTotal, AbuseIPDB, Shodan)
          → merge de resultados → Repository persiste Consulta
          → AIService.resume(explica o conjunto) → persiste resumo IA
      → Interceptor loga fim + auditoria
      → DTO de resposta
```

---

## AD-04 — Módulos (NestJS Modules = unidade de implantação independente)

Cada módulo carrega suas rotas, guards, services e repositórios. Importam `DatabaseModule` e `SharedModule` quando preciso.

| Módulo | Responsabilidade | Endpoints típicos |
|---|---|---|
| `AuthModule` | registro, login, refresh, logout, revogação (refresh em Redis). | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` |
| `UsersModule` | perfil, RBAC roles. | `GET/PATCH /users/me` |
| `IntelModule` | consultas de IP/domínio/CVE; orquestra adapters. | `GET /intel/ip/:ip`, `/intel/domain/:d`, `/intel/cve/:id` |
| `NewsModule` | notícias agregadas (RSS/CISA), listagem, busca. | `GET /news`, `/news/:id` |
| `CveModule` | CVEs vindos do NVD/CISA, detalhe, search. | `GET /cves`, `/cves/:id` |
| `ReportsModule` | geração de PDF (BullMQ job), histórico, download. | `POST /reports`, `GET /reports`, `GET /reports/:id/pdf` |
| `AlertsModule` | regras de alerta, disparo (n8n/BullMQ), configuração. | `GET/POST /alerts` |
| `LogsModule` | logs de auditoria, filtros, exportação. | `GET /logs` (admin) |
| `WorkflowsModule` | proxy p/ n8n (status, trigger manual, histórico). | `POST /workflows/:id/trigger` |
| `AiModule` | endpoint de chat/explanação; encapsula AIService. | `POST /ai/chat`, `/ai/explain/:type` |
| `HealthModule` | healthchecks (DB/Redis/n8n/Ollama). | `GET /health` |

> **Bot Discord** (apps/discord-bot) contém "módulos" de slash command internos (`/ip`, `/domain`, `/cve`, `/news`, `/report`, `/status`, `/chat`, `/help`) — cada um um arquivo, registrados via factory. Todos só fazem **uma** coisa: chamar a API e formatar a resposta.

---

## AD-05 — IA — Camada AI Service (Strategy + Adapter)

**Regra inviolável**: nenhuma parte do sistema chama o modelo de IA diretamente. Tudo passa por `AIService`.

```text
AIService (fachada)
 ├── escolher provider (Strategy por config: HERMES | OPENCLAW | OPENAI)
 ├── construir prompt a partir de templates (Factory por tipo: resumeCve, resumeNews, explainVuln, reportSummary, chat)
 ├── chamar IAIProvider.ch(IRequest) : IResponse
 ├── pós-processar (sanitizar, cortar, normalizar)
 └── devolver DTO tipado
```

- `IAIProvider` (interface): `chat(req): Promise<AIResponse>`.
- Implementações: `HermesOllamaProvider` (default, `HERMES_BASE_URL`), `OpenClawProvider` (slot futuro), `OpenAIProvider` (slot futuro, fallback em dev sem Ollama).
- **Adicionar modelo** = nova classe + registro no módulo. Zero toque em services/consumidores.
- Encapsula também: timeout, retry, fallback entre providers (se Hermes cair → OpenAI), injeção de contexto (CVE/data), tratamento de saúdo/offline do Ollama (erro 503 → mensagem amigável).

---

## AD-06 — n8n — Automação

Papéis e workflows versionados em `n8n/workflows/*.json`:

| Workflow | Gatilho | Ação |
|---|---|---|
| `cve-daily.json` | Cron diário | Busca NVD/CISA novos CVEs → POST webhook `/webhooks/n8n/cve-ingest` na API. |
| `news-daily.json` | Cron diário | Agrega RSS/CISA → POST `/webhooks/n8n/news-ingest`. |
| `alert-dispatch.json` | Webhook da API | Envia alertas por canal (Discord webhook / email). |
| `pdf-report.json` | Webhook da API | (Alternativa ao BullMQ) gera PDF se a geração for orquestrada externamente. |
| `db-sync.json` | Cron semanal | Sincroniza/limpa dados antigos. |

**Segurança n8n→API**: endpoint webhook assinado com HMAC (`N8N_WEBHOOK_SECRET`) + allowlist de IPs do n8n. A API valida a assinatura antes de aceitar ingest.

---

## AD-07 — Banco de Dados — Modelo Relacional

### Entidades (tabelas) e relacionamentos

```text
User 1───* AuditLog
User 1───* Consulta
User 1───* Report
User 1───* Alert
User 1───* RefreshToken   (revogação via Redis, mas persistido p/ auditoria)

Role 1───* User            (RBAC: admin | analyst | viewer | bot)
        └─ Role 1───* Permission

Consulta 1───* ConsultaResult   (cada fonte externa = 1 linha JSONB)
Consulta 1───1 AiSummary       (resumo gerado pela IA)
Consulta 1───1 Report?         (relatório opcional associado)

Cve 1───* CveReference
News 1───* NewsSource

Workflow n8n não é tabela própria; estado fica no n8n. A API só guarda Configuracao (chaves/gatilhos) e Log de execução quando pertinente.

Configuracao (key/value + userId opcional)  → preferências de usuário, alertas, limites.
```

### Tabelas (esboço de colunas)

| Tabela | Colunas principais |
|---|---|
| `User` | id (uuid), email (unique), passwordHash, role, createdAt, updatedAt |
| `Role` | id, name (unique: admin/analyst/viewer/bot) |
| `Permission` | id, name, roleId |
| `AuditLog` | id, userId, action, target, ip, userAgent, meta (JSONB), createdAt |
| `Consulta` | id, userId, type (ip/domain/cve/news), query, status, createdAt, completedAt |
| `ConsultaResult` | id, consultaId, source (virustotal/abuseipdb/shodan…), payload (JSONB), fetchedAt |
| `AiSummary` | id, consultaId, kind, prompt, response, provider, tokensUsed, createdAt |
| `Report` | id, userId, consultaId?, title, summaryExec, riskScore, filePath, format, createdAt |
| `Alert` | id, userId, rule (JSONB), channel, active, lastFiredAt |
| `Cve` | id (cve-id), publishedAt, cvss, description, references (JSONB) |
| `News` | id, title, url (unique), source, publishedAt, summary?, body |
| `Configuracao` | id, userId?, key, value (JSONB) |

### Relacionamentos resumido
- `User → Consulta → ConsultaResult` (1:N) + `Consulta → AiSummary` (1:1) + `Consulta → Report` (1:0..1).
- Tudo que é ação sensível gera `AuditLog` (1:N do User).
- `Role/Permission` implementam RBAC; checado em Guards.

---

## AD-08 — Integrações Externas (Adapters)

Cada integração é um Adapter que implementa `IIntelAdapter` (ou interface específica). Service não conhece detalhes HTTP.

| Integração | Para quê | Custo |
|---|---|---|
| **VirusTotal** | Reputação de IP/domínio/arquivo, hashes, relações. | API key, rate limit 4/min (free). Cache obrigatório. |
| **AbuseIPDB** | Reputação de IP, score de abuso, categorias. | API key. |
| **Shodan** | Portas abertas, banners, serviços expostos por IP. | API key. |
| **WHOIS** | Registro de domínio, datas, registrante, expiração. | Via RDAP (gratuito) / lib. |
| **DNS Lookup** | A, AAAA, MX, TXT, NS, CNAME — enumeração de subdomínio. | Stdlib (`dns/promises`). Custa zero. |
| **NVD** | CVEs oficiais, CVSS, CPE, datas. | API gratuita, rate limit ~5 req/s. |
| **CISA KEV** | Lista de vulnerabilidades conhecidas como exploradas (Known Exploited Vulnerabilities). | CSV/JSON público. |
| **RSS** | Notícias de segurança ( feeds selecionados de threat intel). | Parser padrão. |

**Estratégia anti-rate-limit**: cache Redis por chave de consulta (TTL inteligente), circuit breaker por adapter, fallback gracioso (um adapter fora ≠ falha da consulta). Pattern **Adapter + Facade** (`IntelService` funde resultados).

---

## AD-09 — Fluxos de Consulta

### Fluxo 1 — `/ip 8.8.8.8` no Discord
```
Discord /ip 8.8.8.8
  → (bot) valida formato de IP (packages/utils)
  → POST /intel/ip/8.8.8.8  (header x-api-key)
  → API: Guard API-key + RateLimit
  → IntelService:
      cacheRedis.get(ip) ? usa : 
      VirusTotalAdapter + AbuseIPDBAdapter + ShodanAdapter (Promise.all, fallback unitário)
      → merge → ConsultaResult×3 persistidos
      → AIService.resume({tipo: 'ip', dados})  → AiSummary persistido
  → resposta JSON → bot formata embed Discord
```

### Fluxo 2 — `/domain example.com`
Adapters: WHOIS + DNS + VirusTotal(domínio). Ordem depende de dependências; merge; IA resume ownership + DNS + reputação.

### Fluxo 3 — `/cve CVE-2024-XXXX`
Cache local em `Cve`; se inexistente → NVD adapter. `AIService.explainCve()` gera explicação em PT-BR (o que é, qual impacto, o que fazer).

### Fluxo 4 — `/news`
Lista agregada de `News` (populada por n8n diariamente). IA opcional resume o conjunto via `AIService.resumeNews`.

### Fluxo 5 — `/report 8.8.8.8`
`POST /reports` enqueue job BullMQ `generate-report`. Worker pega os `ConsultaResult` + `AiSummary`, monta Report (PDF), grava `filePath` em `data/reports/`, devolve link de download assinado. Bot/Dashboard exibem o PDF.

### Fluxo 6 — Cron CVE/n8n
`cve-daily.json` (n8n) → `/webhooks/n8n/cve-ingest` (HMAC) → API valida → `CveModule.ingestMany()` → `Cve` upsert + dispara `AlertsModule` para usuários com regra casando.

---

## AD-10 — Relatórios (PDF)

Estrutura de cada relatório:
1. **Resumo Executivo** — IA gera 2-3 parágrafos.
2. **Resultados das consultas** — tabela por fonte (VirusTotal, AbuseIPDB, Shodan…).
3. **Risco** — score 0-100 + classificação (baixo/médio/alto/crítico) derivado das informações + explicação.
4. **Explicação em linguagem simples** — IA traduz jargão para público não-técnico.
5. **Data** — timestamp ISO + TZ.
6. **Fontes** — links/IDs das APIs consultadas + data de coleta.

Geração: job BullMQ `generate-report`. Biblioteca: **`pdfkit` ou `@react-pdf/renderer`** (preferir `@react-pdf` se quiser reaproveitar componentes do dashboard; recomendado p/ consistência visual). Armazenado em `REPORTS_STORAGE_PATH` (já no `.env`). Metadados em `Report` table.

---

## AD-11 — Segurança

| Controle | Mecanismo | Onde |
|---|---|---|
| **Rate Limit** | `@nestjs/throttler` + Redis store. Limites por IP e por usuário; Bot tem tier próprio via `x-api-key`. | Guard global |
| **JWT** | access 15m (cookie httpOnly p/ dashboard), refresh 7d (Redis p/ revogação), header `x-api-key` p/ bot. | AuthModule + Guards |
| **RBAC** | Roles (admin/analyst/viewer/bot) + Permissions; `RolesGuard` ledo `@Roles()` decorator. | Guards |
| **Logs** | pino estruturado (JSON), níveis por env. | Shared |
| **Auditoria** | `AuditInterceptor` grava `AuditLog` p/ mutações e consultas sensíveis. | Interceptor |
| **Criptografia** | bcrypt/argon2 p/ senha; secrets em env; dados sensíveis em repouso só se necessário. | register/login |
| **Validação** | Pipes Zod (schema-first, dto tipado em `@cyberhub/types`). | Global pipe |
| **Sanitização** | Saída de IA e entradas de usuário sanitizadas antes de renderizar (anti-prompt-injection básico). | Service |
| **Helmet/CORS** | `@fastify/helmet` + CORS allowlist (`CORS_ORIGINS`). | bootstrap |
| **SQLi** | Prisma parametriza tudo; **zero SQL cru**. Repository blinda. | Database |
| **XSS** | Next escapa por padrão; React + CSP via Helmet no dashboard. Conteúdo de IA tratado como texto, nunca `dangerouslySetInnerHTML`. | Dashboard |
| **Secrets** | nunca no repo; `.env` gitignored; `@cyberhub/shared/config` carrega e valida presença. | Shared |
| **Webhook n8n** | HMAC + allowlist de IP | IntelModule ingest |

> **Observação de IA**: prompts podem ser objeto de prompt-injection via conteúdo de APIs externas (ex.: um banner Shodan conter "ignore previous instructions"). Mitigação: marcar conteúdo externo como dados não-confiáveis no prompt (delimitador), nunca executar "instruções" vindas de payload. Validar como texto.

---

## AD-12 — Escalabilidade — Padrões de Projeto

| Padrão | Quando usar | Aplicação no CyberHub |
|---|---|---|
| **Repository** | Isolar acesso a dados do domínio. Service não conhece Prisma. | `IUserRepository`, `PrismaUserRepository`. Facilita troca de ORM/testar com mock. |
| **Dependency Injection** | Desacoplar criação de uso; testabilidade. | Constructor injection do Nest. `providers: [{provide: IIntelAdapter, useClass: VirusTotalAdapter}]`. |
| **Factory** | Criar objetos complexos/configuráveis. | `AiPromptFactory` (resumeCve vs reportSummary), factory de slash commands do bot. |
| **Strategy** | Variar algoritmo sem tocar quem usa. | `IAIProvider` (Hermes/OpenClaw/OpenAI); `IIntelAdapter` (várias fontes). |
| **Adapter** | Uniformizar interfaces externas divergentes. | Cada API externa vira adapter com interface comum. |
| **Observer** | Reagir a eventos sem acoplar. | Event-emitter: ao salvar Consulta, dispara `consulta.created` → alertas reagem. |
| **Service Layer** | Caso de uso orquestrado, mantém regra de negócio fora do controller. | Todos os `*Service`. |
| **Module Pattern** | Unidade autocontida de funcionalidade. | Nest Modules; cada `apps/*` é um módulo implantável separado. |

**Open/Closed aplicado**: adicionar fonte de intel nova = novo adapter + 1 linha no módulo. Adicionar modelo de IA = novo provider. Adicionar slash command = novo arquivo + registro. Adicionar workflow = novo `.json` em `n8n/workflows`. Nenhum desses exige modificar services existentes.

---

## AD-13 — Roadmap por Fases

### Fase 1 — Fundação *(parcialmente feita: esqueleto + Docker)*
1. Confirmar estrutura de pastas (apps/packages).
2. `packages/database`: Prisma `schema.prisma` completo (todas as tabelas do AD-07).
3. `scripts/setup.sh`: deps + env + `prisma migrate dev` + seed (usuário admin + role).
4. `apps/api` NestJS bootstrap (Fastify adapter), HealthModule, DatabaseModule, SharedModule, AuthModule (registro/login/refresh/RBAC).
5. Docker: validar compose já existente.

### Fase 2 — Interfaces
6. `apps/dashboard` Next: layout shadcn, login/cadastro, painel, perfil, configurações.
7. `apps/discord-bot`: slash commands `/help`, `/status`, `/chat` primeiro; depois `/ip`, `/domain`, `/cve`, `/news`, `/report`.

### Fase 3 — Inteligência & Intel
8. `AiModule` + `HermesOllamaProvider` + `OpenAIProvider` (fallback).
9. `IntelModule`: adapters VirusTotal/AbuseIPDB/Shodan + WHOIS + DNS; cache Redis; circuit breaker.
10. `NewsModule` + `CveModule` (ingestão manual p/ enquanto).
11. Workflows n8n: `cve-daily.json`, `news-daily.json`, webhooks HMAC.

### Fase 4 — Relatórios & Alertas
12. `ReportsModule` + BullMQ `generate-report` + `@react-pdf`.
13. `AlertsModule`: regras, disparo via n8n/Discord webhook.
14. `LogsModule`: auditoria + listagem.

### Fase 5 — Produção
15. `.github/workflows`: lint/typecheck/test/build.
16. Dockerfiles por app; compose de produção.
17. Monitoramento: healthchecks + logs estruturados + (opcional) OpenTelemetry.

---

## AD-14 — Ordem Recomendada de Implementação (reposta final do briefing)

> "Depois, ao final, sugira a melhor ordem para implementar cada parte."

**Sequência ótima** (menos bloqueios à frente):

1. **`packages/database` + `scripts/setup.sh`** — o banco é dependência de quase tudo. Schema completo primeiro.
2. **`packages/shared`, `packages/types`, `packages/utils`** — contratos que API/Bot/Dashboard vão importar.
3. **`apps/api`bootstrap + Auth + Users + RBAC** — sem auth, nada mais se testa de ponta a ponta.
4. **`apps/dashboard` login + painel esqueleto** — valida que JWT/cookie funcionam contra a API.
5. **`apps/discord-bot` `/help` + `/status`** — valida que `x-api-key` funciona antes de comandos de verdade.
6. **`AiModule` (+ Hermes)** — independente de integrações; pode ser testado com dados mock.
7. **`IntelModule` (+ adapters VirusTotal/AbuseIPDB/Shodan, WHOIS, DNS, cache)** — o coração de valor do produto.
8. **`CveModule` + `NewsModule`** — dados que alimentam alertas e relatórios.
9. **n8n workflows `cve-daily`, `news-daily` + webhook ingest** — automatiza o que a 7/8 fazem manual.
10. **`AlertsModule`** — consome eventos (Observer) + dispara por n8n/Discord.
11. **`ReportsModule` + BullMQ + PDF** — junta Consulta + AiSummary em relatório.
12. **`LogsModule`/auditoria** — finaliza trilha de segurança.
13. **`WorkflowsModule`** (proxy n8n) e polimento do dashboard.
14. **CI/CD + Dockerfiles de produção + monitoramento**.

**Dica de Tech Lead**: cada passo entrega algo "demonstrável" sozinho. Use a sequência para marcar PRs/milestones — isso vende bem no portfólio (prova evolução incremental, não "tudo de uma vez").

---

## AD-15 — Decis em aberto / Riscos

- **Ollama local**: desempenho varia pela máquina do host. Mitigação: `OpenAIProvider` fallback configurável.
- **Rate limit das APIs free** (VirusTotal 4/min): cache agressivo + queue de espera.
- **Single-tenant vs multi-tenant**: modelagem já prevê `userId` em tudo; migrar p/ multi-tenant = adicionar `tenantId` + RLS depois, sem reescrever.
- **n8n versionado**: workflows importados manualmente até setup de import automático via API do n8n (futuro).
- **OpenClaw**: slot reservado;_behavioro a confirmar quando o agente estiver estável.

---

*Fim do ADR. Próximo passo após aprovação: gerar `packages/database/prisma/schema.prisma` e `scripts/setup.sh` (Fase 1).*
