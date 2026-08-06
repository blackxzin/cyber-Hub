import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../lib/slash-command';

export const ping: Command = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Latência do bot'),
  async execute(interaction) {
    const sent = await interaction.reply({ content: 'Pong!', fetchReply: true });
    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply(
      `Pong! Latência do bot: **${roundtrip}ms** · Websocket: ${interaction.client.ws.ping}ms`,
    );
  },
};