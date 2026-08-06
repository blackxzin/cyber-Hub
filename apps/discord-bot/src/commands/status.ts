import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { api } from '../lib/api';
import type { Command } from '../lib/slash-command';

interface Health {
  status: string;
  db: boolean;
  redis: boolean;
  n8n: boolean;
  ollama: boolean;
}

export const status: Command = {
  data: new SlashCommandBuilder().setName('status').setDescription('Saúde da API e do bot'),
  async execute(interaction) {
    await interaction.deferReply();

    let health: Health | null = null;
    let err: string | null = null;
    try {
      health = await api<Health>('/health');
    } catch (e) {
      err = e instanceof Error ? e.message : 'erro desconhecido';
    }

    const embed = new EmbedBuilder()
      .setColor(health?.status === 'ok' ? 0x57f287 : 0xed4245)
      .setTitle('Status CyberHub')
      .setDescription(health ? 'API online' : `API indisponível (${err})`)
      .addFields(
        {
          name: 'Banco de dados',
          value: health ? (health.db ? '✅ OK' : '❌ fora') : '—',
          inline: true,
        },
        {
          name: 'Redis',
          value: health ? (health.redis ? '✅ OK' : '❌ fora') : '—',
          inline: true,
        },
        {
          name: 'n8n',
          value: health ? (health.n8n ? '✅ OK' : '⬜ off') : '—',
          inline: true,
        },
        {
          name: 'IA (Hermes)',
          value: health ? (health.ollama ? '✅ OK' : '⬜ off') : '—',
          inline: true,
        },
      )
      .setFooter({ text: 'Latência medida na resposta da API.' });

    await interaction.editReply({ embeds: [embed] });
  },
};