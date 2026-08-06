import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { api } from '../lib/api';
import type { Command } from '../lib/slash-command';
import { tryReply } from '../lib/errors';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
}

interface NewsList {
  items: NewsItem[];
  total: number;
}

export const news: Command = {
  data: new SlashCommandBuilder()
    .setName('news')
    .setDescription('Últimas notícias de segurança')
    .addIntegerOption((o) =>
      o.setName('limite').setDescription('Quantidade (1–5, padrão 3)').setMinValue(1).setMaxValue(5),
    ),
  async execute(interaction) {
    const limit = interaction.options.getInteger('limite') ?? 3;
    await interaction.deferReply();

    try {
      const data = await api<NewsList>(`/news?limit=${limit}`);
      const items = data.items ?? [];
      if (items.length === 0) {
        await interaction.editReply({ content: 'Nenhuma notícia cadastrada ainda.' });
        return;
      }
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('📰 Últimas notícias de segurança')
        .setDescription(
          items
            .map(
              (n) =>
                `**[${n.title}](${n.url})**\n${n.summary ?? ''}\n· ${n.source} — ${n.publishedAt ?? ''}`,
            )
            .join('\n\n')
            .slice(0, 4000),
        );
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await tryReply(interaction, err);
    }
  },
};