import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Public } from '../shared/decorators/decorators';
import { AiService } from './ai.service';

@Public()
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('chat')
  chat(@Body() body: { message?: string; system?: string }) {
    const message = body.message?.trim();
    if (!message) {
      return { answer: 'Envie uma mensagem, ex: { "message": "oi" }.' };
    }
    return this.ai.chat(body.system ? { system: body.system, message } : { message });
  }

  // POST /ai/explain — explica uma entidade (IP, domínio, CVE, notícia) em PT-BR,
  // usando IA + dados reais que temos em cache/prisma.
  @Post('explain')
  @HttpCode(200)
  explain(@Body() body: { query?: string }) {
    const query = body.query?.trim();
    if (!query) {
      return { answer: 'Envie o que quer entender, ex: { "query": "CVE-2023-44487" }.' };
    }
    return this.ai.explain(query);
  }
}
