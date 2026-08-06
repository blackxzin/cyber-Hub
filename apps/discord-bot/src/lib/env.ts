// Env do bot: carregado via dotenv na raiz do monorepo (src/index.ts).
// O bot é autônomo — não usa @cyberhub/shared (que exige todo o env da API).

export function getEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(`Variável de ambiente ausente: ${name}`);
  }
  return v;
}

export const env = {
  token: getEnv('DISCORD_BOT_TOKEN'),
  clientId: getEnv('DISCORD_CLIENT_ID'),
  guildId: getEnv('GUILD_ID'),
  apiBaseUrl: getEnv('API_BASE_URL').replace(/\/+$/, ''),
  apiKey: getEnv('API_KEY'),
};
