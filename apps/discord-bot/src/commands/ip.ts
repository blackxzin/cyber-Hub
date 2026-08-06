import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { api, ApiError } from '../lib/api';
import type { Command } from '../lib/slash-command';
import { tryReply } from '../lib/errors';

interface IntelIP {
  ip: string;
  reputation: 'malicious' | 'suspicious' | 'clean' | 'unknown';
  score: number | null;
  country: string | null;
  asn: string | null;
  isp: string | null;
  lastSeen: string | null;
  totalReports?: number;
}

export const ip: Command = {
  data: new SlashCommandBuilder()
    .setName('ip')
    .setDescription('Análise de reputação de um IP')
    .addStringOption((o) =>
      o.setName('endereco').setDescription('IP público').setRequired(true),
    ),
  async execute(interaction) {
    const address = interaction.options.getString('endereco')!.trim();
    await interaction.deferReply();

    try {
      const data = await api<IntelIP>(`/intel/ip/${encodeURIComponent(address)}`);
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`Intel — ${data.ip}`)
        .addFields(
          {
            name: 'Reputação',
            value: reputationBadge(data.reputation),
            inline: true,
          },
          { name: 'País', value: data.country ?? '—', inline: true },
          { name: 'ASN', value: data.asn ?? '—', inline: true },
          { name: 'ISP', value: data.isp ?? '—', inline: true },
          { name: 'Visto por último', value: data.lastSeen ?? '—', inline: true },
          {
            name: 'Reportes',
            value: data.totalReports != null ? String(data.totalReports) : '—',
            inline: true,
          },
        )
        .setFooter({ text: `CVSS não se aplica a IP; use /cve p/ vulnerabilidades.` });
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await tryReply(interaction, err);
    }
  },
};

function reputationBadge(r: IntelIP['reputation']): string {
  const map: Record<IntelIP['reputation'], string> = {
    malicious: '🔴 Malicioso',
    suspicious: '🟠 Suspeito',
    unknown: '⚪ Desconhecido',
    clean: '🟢 Limpo',
  };
  return map[r] ?? r;
}