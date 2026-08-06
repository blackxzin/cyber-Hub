import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { env } from './lib/env';
import { commands } from './commands';

// dotenv carrega o .env na RAIZ do monorepo (que tem DISCORD_*/API_KEY/etc.).
// O bot é CommonJS p/ consistência com os outros apps.

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
  console.log(`✅ Bot online como ${client.user?.tag}`);
  const registered = commands.map((c) => c.data.name).join(', ');
  console.log(`Comandos disponíveis: ${registered}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = commands.find((c) => c.data.name === interaction.commandName);
  if (!cmd) return;

  try {
    await cmd.execute(interaction);
  } catch (err) {
    console.error(`Erro no comando /${interaction.commandName}:`, err);
    const message = '❌ Erro inesperado ao executar o comando.';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: message }).catch(() => {});
    } else {
      await interaction.reply({ content: message, ephemeral: true }).catch(() => {});
    }
  }
});

client.login(env.token).catch((err) => {
  console.error('Falha no login do bot:', err);
  process.exit(1);
});