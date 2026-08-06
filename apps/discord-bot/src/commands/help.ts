import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { Command } from '../lib/slash-command';

const COMMANDS: Array<[string, string]> = [
  ['/help', 'Lista de comandos e uso'],
  ['/status', 'Saúde da API e do bot'],
  ['/ping', 'Latência do bot'],
  ['/ip <endereço>', 'Análise de reputação de um IP'],
  ['/domain <domínio>', 'Análise de reputação de um domínio'],
  ['/cve <CVE>', 'Detalhe de uma vulnerabilidade (ex: /cve CVE-2023-12345)'],
  ['/news', 'Últimas notícias de segurança'],
  ['/report <IP|domínio|CVE>', 'Gera relatório e entrega o PDF'],
  ['/chat <pergunta>', 'Tira dúvidas com a IA (Hermes)'],
];

export const help: Command = {
  data: new SlashCommandBuilder().setName('help').setDescription('Lista de comandos e uso'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('CyberHub AI — Comandos')
      .setDescription('Central de automação, intel e IA. Tudo passa pela API CyberHub.')
      .addFields(COMMANDS.map(([name, desc]) => ({ name, value: desc })))
      .setFooter({ text: 'Comandos que dependem de integração aparecem quando a API estiver pronta.' });

    await interaction.reply({ embeds: [embed] });
  },
};
