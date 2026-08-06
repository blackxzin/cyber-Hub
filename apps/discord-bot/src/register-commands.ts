import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { env } from './lib/env';
import { commands } from './commands';

// Registra os slash commands no Discord (aplicação → guild de teste p/ deploy imediato).
// pnpm --filter @cyberhub/discord-bot run register

async function main(): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(env.token);
  const body = commands.map((c) => c.data.toJSON());

  console.log(`Registrando ${body.length} comandos na guild ${env.guildId}...`);
  await rest.put(Routes.applicationGuildCommands(env.clientId, env.guildId), { body });
  console.log('Comandos registrados!');
}

main().catch((err) => {
  console.error('Falha ao registrar comandos:', err);
  process.exit(1);
});