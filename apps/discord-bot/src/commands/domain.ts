import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { api } from '../lib/api';
import type { Command } from '../lib/slash-command';
import { tryReply } from '../lib/errors';

interface IntelDomain {
  domain: string;
  reputation: 'malicious' | 'suspicious' | 'clean' | 'unknown';
  score: number | null;
  registrar: string | null;
  createdAt: string | null;
  lastSeen: string | null;
  totalReports?: number;
}

const REP_BADGE: Record<IntelDomain['reputation'], string> = {
  malicious: '🔴 Malicioso',
  suspicious: '🟠 Suspeito',
  unknown: '⚪ Desconhecido',
  clean: '🟢 Limpo',
};

export const domain: Command = {
  data: new SlashCommandBuilder()
    .setName('domain')
    .setDescription('Análise de reputação de um domínio')
    .addStringOption((o) =>
      o.setName('dominio').setDescription('ex: example.com').setRequired(true),
    ),
  async execute(interaction) {
    const name = interaction.options.getString('dominio')!.trim().toLowerCase();
    await interaction.deferReply();

    try {
      const data = await api<IntelDomain>(`/intel/domain/${encodeURIComponent(name)}`);
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`Intel — ${data.domain}`)
        .addFields(
          { name: 'Reputação', value: REP_BADGE[data.reputation] ?? data.reputation, inline: true },
          { name: 'Registrar', value: data.registrar ?? '—', inline: true },
          { name: 'Criado em', value: data.createdAt ?? '—', inline: true },
          { name: 'Visto por último', value: data.lastSeen ?? '—', inline: true },
          {
            name: 'Reportes',
            value: data.totalReports != null ? String(data.totalReports) : '—',
            inline: true,
          },
        );
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await tryReply(interaction, err);
    }
  },
};