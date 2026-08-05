# CyberHub AI — Handoff Fase 1 → Fase 2

> Snapshot de onde paramos em 04/ago/2026. Leia isto antes de continuar amanhã.

## Status geral

- **ADR completo** aprovado em `docs/ADR.md` (15 decisões numeradas: stack, camadas, módulos, schema, integrações, fluxos, segurança, padrões, roadmap).
- **Fase 1 escrita inteira**, **mas NÃO executada** — `pnpm install` / `tsc` / `docker compose` nunca rodaram aqui. Pode haver ajuste fino de versões/imports que só aparece ao instalar.

## Decisões fixadas (você escolheu)

| # | Decisão |
|---|---|
| Backend | **NestJS** + adapter **Fastify** (justificativa em ADR AD-01.1) |
| Jobs | **BullMQ** (Redis) p/ jobs intra-app; **n8n** p/ orquestrações externas |
| IA | **Adapter + Strategy** multi-provider desde já (Hermes default, OpenClaw/OpenAI slots) |
| Admin seed | `admin@cyberhub.ai` / `Cyberhub@dev123` (senha **dev** — trocar em prod) |
| Refresh token | Redis (ativo/revogado) **+** tabela RefreshToken (auditoria), com **rotação** |
| API key do bot | coluna `apiKeyHash` em `User` role=BOT (ADR não modelava tabela ApiKey) |
| Crypto | **bcryptjs** (JS puro, zero build friction); upgrade argon2 no futuro |
| Validação | **ZodValidationPipe** custom (~20 linhas), não `nestjs-zod` |
| module/moduleResolution | **CommonJS** nos apps/packages (evita armadilha NodeNext `.js` em imports no Nest) |
| Repos | só `IUserRepository` nesta fase (Auth+Users consomem); `PrismaService extends PrismaClient` diretamente nos demais services |

## O que foi criado (estrutura + arquivos)

```
cyberhub-ai/
├── docs/
│   ├── ADR.md                   # documento de arquitetura (fonte da verdade)
│   └── HANDOFF-FASE1.md         # este arquivo
├── scripts/setup.sh             # executável, sintaxe OK (bash -n passou)
├── packages/
│   ├── types/    (env, auth, user zod schemas + barrel)
│   ├── utils/    (validate.ts, crypto.ts — bcryptjs)
│   ├── shared/   (config.ts, logger.ts pino, errors.ts DomainError)
│   └── database/
│       ├── prisma/schema.prisma  # 15 models + 6 enums + índices
│       ├── prisma/seed.ts        # roles, permissions por role, admin, bot
│       └── src/                  (prisma.ts singleton, types.ts reexport, index)
└── apps/api/                     # NestJS + Fastify (26 arquivos)
    ├── package.json, tsconfig.json (CommonJS, decorators), nest-cli.json
    └── src/
        ├── main.ts               # bootstrap: helmet, cookie, cors, filter, pipe, listen :3001
        ├── app.module.ts         # ConfigModule(zod), Throttler, guards globais (Jwt+Throttler+Roles)
        ├── shared/
        │   ├── shared.module.ts (Global)
        │   ├── logger/pino-logger.service.ts
        │   ├── filters/all-exceptions.filter.ts   (DomainError→HTTP, Zod→422, HttpException preservado)
        │   ├── pipes/zod-validation.pipe.ts
        │   ├── decorators/decorators.ts          (@Roles, @Public, @SkipAudit)
        │   ├── guards/jwt-auth.guard.ts, api-key.guard.ts, roles.guard.ts
        │   ├── strategies/jwt.strategy.ts (cookie cyhub_access + Bearer fallback)
        │   ├── strategies/api-key.strategy.ts (passport-custom, header x-api-key, bcrypt compare)
        │   └── interceptors/audit.interceptor.ts (grava AuditLog em mutações, fire-and-forget)
        ├── database/prisma.service.ts (extends PrismaClient, OnModuleInit/Destroy)
        ├── health/                # GET /health — DB + Redis + n8n + Ollama (booleans only)
        ├── auth/
        │   ├── auth.types.ts       (AuthedUser, AuthedRequest)
        │   ├── refresh-token.service.ts (Redis + DB, rotação, tokenHashOf sha256)
        │   ├── auth.service.ts    (register/login/refresh/logout, issueTokens)
        │   └── auth.controller.ts (cookies httpOnly cyhub_access/cyhub_refresh, secure em prod)
        └── users/                 (UserRepository, UsersService, /users/me + PATCH)
```

## Padrões aplicados (ADR AD-12)
Repository (User), DI (Nest), Factory (AIService futuro), Strategy (IAIProvider futuro), Adapter (cada API externa futura), Observer (alertas futuro), Service Layer, Module Pattern.

## Armadilhas conhecidas já tratadas no código
- Prisma singleton guard global → não esgota pool em hot-reload.
- Helmet antes de cookie no `main.ts`.
- `passport-custom` é import **default** (`import Strategy from 'passport-custom'`) — já corrigido.
- JWT em cookie httpOnly **e** header bearer (guard lê dos dois).
- `exactOptionalPropertyTypes` + DI → uso de `!`/opcional;
- `useDefineForClassFields: false` no tsconfig da API (decorators metadata).
- `@cyberhub/database` reexporta apenas tipos (`types.ts`); `apps/api` precisa `@prisma/client` direto para `PrismaService` — declarado nas deps.

## O que NÃO foi feito (deixa pra validar/rodar amanhã)

1. **Rodar** `pnpm install` — workspaces podem precisar de ajuste de versão.
2. **Build/typecheck** dos packages — podem surgir erros TS finos (ex: `exactOptional` em optionais).
3. **`docker compose up`** — Postgres/Redis/n8n.
4. **`prisma migrate dev --name init`** — gera migration lock.
5. **`pnpm db:seed`** — valida o seed (roles/admin/bot).
6. **Smoke tests** da API: `/health`, `/auth/register`, `/auth/login` (verificar cookies), `/users/me`.

> Sugiro começar amanhã rodando `bash scripts/setup.sh` e liquidando os erros que aparecerem antes de ir pra Fase 2.

## Pontos pendentes menores (konhecido, não crítico)
- `scripts docker:*` do `package.json` raiz apontam `-f docker/docker-compose.yml` (caminho errado — compose está na raiz). `setup.sh` chama direto da raiz; corrigir os scripts raiz quando conveniente.
- `HealthController` e `RefreshTokenService` criam conerções Redis sem `onModuleDestroy`/disconnect explícito (aceitável p/ fase 1; refinar quando volume crescer).

## Próxima fase (Fase 2 — conforme ADR AD-13/AD-14)
6. `apps/dashboard` (Next 14 / shadcn / Tailwind): login, cadastro, painel esqueleto, perfil, config.
7. `apps/discord-bot` (discord.js): `/help`, `/status` primeiro → depois `/ip`, `/domain`, `/cve`, `/news`, `/report`, `/chat`. Tudo só chama a API via `x-api-key`.

Depois: Fase 3 (AiModule + Intel adapters + Cve/News + workflows n8n), Fase 4 (Reports/BullMQ/PDF + Alerts), Fase 5 (CI/CD + prod + observabilidade).

## Ordem ótima de implementação (reposta do ADR AD-14)
1. packages/database + setup.sh  ✓ feito
2. packages/shared/types/utils  ✓ feito
3. apps/api bootstrap + Auth + RBAC  ✓ feito
4. apps/dashboard login + painel  ← **próximo**
5. apps/discord-bot /help + /status
6. AiModule (+ Hermes)
7. IntelModule (+ adapters + cache + circuit breaker)
8. CveModule + NewsModule
9. n8n workflows cve-daily/news-daily + webhook HMAC
10. AlertsModule (Observer + n8n/Discord)
11. ReportsModule + BullMQ + @react-pdf
12. LogsModule/auditoria
13. WorkflowsModule proxy n8n + polimento
14. CI/CD + Dockerfiles prod + monitoramento
