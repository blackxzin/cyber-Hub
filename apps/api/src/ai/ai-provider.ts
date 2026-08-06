// Contrato de provider de IA. AIService escolhe o provider ativo por config
// (Strategy). Implementações: HermesOllamaProvider (default) e futuro OpenAI.
export interface IAIRequest {
  system?: string;
  message: string;
  maxTokens?: number;
}

export interface IAIResponse {
  text: string;
  provider: string;
  model?: string;
  tokensUsed?: number;
}

export interface IAIProvider {
  readonly name: string;
  chat(req: IAIRequest): Promise<IAIResponse>;
}
