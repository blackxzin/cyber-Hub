# CyberHub AI — Discord Bot (`apps/discord-bot`)

Bot do Discord que consome a API CyberHub via `x-api-key` (usuário `role=BOT`).

## Comandos

| Comando | Descrição |
| --- | --- |
| `/help` | Lista de comandos |
| `/status` | Saúde da API (DB/Redis/n8n/IA) |
| `/ping` | Latência do bot |
| `/ip <IP>` | Reputação de IP (`/intel/ip/:ip`) |
| `/domain <dom>` | Reputação de domínio (`/intel/domain/:d`) |
| `/cve <CVE>` | Detalhe de CVE (`/cves/:id`) |
| `/news [limite]` | Últimas notícias (`/news`) |
| `/report <alvo>` | Cria relatório (`POST /reports`) |
| `/chat <msg>` | Chat com IA (`POST /ai/chat`) |

> Comandos de intel/IA dependem da Fase 3 da API. Hoje `/help`, `/status` e `/ping` funcionam; os demais respondem erro claro até os módulos existirem.

## Setup

1. Crie o bot em <https://discord.com/developers/applications>:
   - New Application → nome → **Bot** → *Add Bot*.
   - Copie o **Token** e o **Client ID** (General Information).
   - Em *Bot*, ative `MESSAGE CONTENT INTENT` (se usar leitura de mensagens; slash commands não precisam).
   - OAuth2 → *bot* → scopes: `applications.commands` + `bot`. Convide para seu servidor.
2. Instale deps e copie o env:

   ```bash
   pnpm install
   cp apps/discord-bot/.env.example apps/discord-bot/.env
   # preencha DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, GUILD_ID, API_BASE_URL, API_KEY
   ```

   O `.env` do bot é carregado por `dotenv/config` a partir do diretório atual de execução — rode os scripts pela raiz do monorepo (via pnpm filter) ou com `cd apps/discord-bot`.
3. Registre os slash commands (aplica à guild de teste):

   ```bash
   pnpm --filter @cyberhub/discord-bot run register
   ```
4. Rode:

   ```bash
   pnpm --filter @cyberhub/discord-bot run dev
   ```

## Estrutura

```
src/
├── index.ts               # client Discord, carrega env, dispatch de comandos
├── register-commands.ts   # registra slash commands na guild
├── lib/
│   ├── env.ts             # env do bot (token, clientId, guildId, apiUrl, apiKey)
│   ├── api.ts             # fetch wrapper com x-api-key + tratamento de erro
│   ├── errors.ts          # resposta de erro padronizada
│   └── slash-command.ts   # interface Command
└── commands/              # um arquivo por comando, exportando { data, execute }
    ├── index.ts           # factory: lista de comandos
    ├── help.ts status.ts ping.ts ip.ts domain.ts cve.ts news.ts report.ts chat.ts
```

Regra: comandos **nunca** chamam API externa ou banco — só a API CyberHub via `x-api-key` (ver `docs/ADR.md`).
