import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from 'discord.js';

// Contrato de um comando do bot. Cada comando é um arquivo em src/commands/,
// exportando um objeto Command. Registrados via factory em commands/index.ts.
export type CommandData = SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;

export interface Command {
  data: CommandData;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}
