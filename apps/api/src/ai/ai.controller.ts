import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '../shared/decorators/decorators';
import { AiService } from './ai.service';

// POST /ai/chat — mensagem do bot/dashboard. Por ora público (sem auth).
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
}
