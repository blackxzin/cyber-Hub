import type { ChatInputCommandInteraction } from 'discord.js';
import { ApiError } from './api';

// Resposta de erro padronizada para comandos. Deferred replies já ativas
// usam editReply; diretas usam reply. Retorna true se conseguiu responder.
export async function tryReply(
  interaction: ChatInputCommandInteraction,
  err: unknown,
): Promise<boolean> {
  const message =
    err instanceof ApiError
      ? `Erro da API [${err.code}]: ${err.message}`
      : err instanceof Error
        ? err.message
        : 'Erro desconhecido';

  const payload = { content: `❌ ${message}`, ephemeral: true };
  if (interaction.deferred) {
    await interaction.editReply(payload);
  } else {
    await interaction.reply(payload);
  }
  return true;
}