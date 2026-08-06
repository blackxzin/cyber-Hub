import { SlashCommandBuilder } from 'discord.js';
import { api } from '../lib/api';
import type { Command } from '../lib/slash-command';
import { tryReply } from '../lib/errors';

interface ChatResponse {
  answer: string;
  model?: string;
}

export const chat: Command = {
  data: new SlashCommandBuilder()
    .setName('chat')
    .setDescription('Tira dúvidas com a IA (Hermes)')
    .addStringOption((o) =>
      o.setName('mensagem').setDescription('O que você quer saber?').setRequired(true),
    ),
  async execute(interaction) {
    const message = interaction.options.getString('mensagem')!.trim();
    await interaction.deferReply();

    try {
      const data = await api<ChatResponse>('/ai/chat', {
        method: 'POST',
        body: { message },
      });
      await interaction.editReply({
        content: data.answer.slice(0, 2000),
        ...(data.model ? { embeds: [] } : {}),
      });
    } catch (err) {
      await tryReply(interaction, err);
    }
  },
};