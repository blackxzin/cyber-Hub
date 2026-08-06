import { SlashCommandBuilder } from 'discord.js';
import { api } from '../lib/api';
import type { Command } from '../lib/slash-command';
import { tryReply } from '../lib/errors';

interface Report {
  id: string;
  status: 'pending' | 'ready' | 'failed';
  pdfUrl?: string;
  error?: string;
}

const CVE_RX = /^CVE-\d{4}-\d{4,}$/i;

export const report: Command = {
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Gera relatório de um IP, domínio ou CVE e entrega o PDF')
    .addStringOption((o) =>
      o
        .setName('alvo')
        .setDescription('IP, domínio ou CVE a analisar')
        .setRequired(true),
    ),
  async execute(interaction) {
    const target = interaction.options.getString('alvo')!.trim();
    const body = buildBody(target);
    if (!body) {
      await tryReply(interaction, new Error('Alvo deve ser um IP, domínio ou CVE.'));
      return;
    }

    await interaction.deferReply();
    let report: Report;
    try {
      report = await api<Report>('/reports', { method: 'POST', body });
    } catch (err) {
      await tryReply(interaction, err);
      return;
    }

    if (report.status === 'failed') {
      await interaction.editReply({ content: `❌ Falha ao gerar o relatório: ${report.error ?? 'erro desconhecido'}` });
      return;
    }

    // ponytail: sem stream/download aqui — a API retorna o PDF por GET /reports/:id/pdf.
    // Quando o ReportsModule existir, buscar o blob e mandar como AttachmentBuilder.
    await interaction.editReply({
      content: `📄 Relatório **${target.toUpperCase()}** criado — \`${report.id}\`\nStatus: ${report.status}`,
    });
  },
};

function buildBody(target: string): { ip?: string; domain?: string; cveId?: string } | null {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(target)) return { ip: target };
  if (CVE_RX.test(target)) return { cveId: target.toUpperCase() };
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(target)) return { domain: target.toLowerCase() };
  return null;
}