import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { api } from '../lib/api';
import type { Command } from '../lib/slash-command';
import { tryReply } from '../lib/errors';

interface CveDetail {
  id: string;
  cveId: string;
  description: string;
  cvssV3: number | null;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  publishedAt: string | null;
  references: string[];
}

const SEV_COLOR: Record<CveDetail['severity'], number> = {
  CRITICAL: 0xed4245,
  HIGH: 0xfaa61a,
  MEDIUM: 0xfee75c,
  LOW: 0x57f287,
  UNKNOWN: 0x99aab5,
};

export const cve: Command = {
  data: new SlashCommandBuilder()
    .setName('cve')
    .setDescription('Detalhe de uma vulnerabilidade (ex: /cve CVE-2023-12345)')
    .addStringOption((o) =>
      o.setName('cve').setDescription('Identificador CVE, ex: CVE-2023-12345').setRequired(true),
    ),
  async execute(interaction) {
    const id = interaction.options.getString('cve')!.trim();
    await interaction.deferReply();

    try {
      const data = await api<CveDetail>(`/cves/${encodeURIComponent(id.toUpperCase())}`);
      const embed = new EmbedBuilder()
        .setColor(SEV_COLOR[data.severity] ?? 0x5865f2)
        .setTitle(data.cveId)
        .setURL(firstReference(data) ?? null)
        .setDescription(clamp(data.description, 2048))
        .addFields({
          name: 'Severidade',
          value: `${data.severity}${data.cvssV3 != null ? ` · CVSS ${data.cvssV3.toFixed(1)}` : ''}`,
          inline: true,
        })
        .setFooter(data.publishedAt ? { text: `Publicado em ${data.publishedAt}` } : null);

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await tryReply(interaction, err);
    }
  },
};

function firstReference(c: CveDetail): string | null {
  return c.references?.[0] ?? null;
}

function clamp(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}