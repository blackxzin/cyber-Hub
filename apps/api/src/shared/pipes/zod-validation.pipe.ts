import { PipeTransform, Injectable } from '@nestjs/common';
import { ZodError, type ZodType } from 'zod';
import { ValidationError } from '@cyberhub/shared';

// Pipe de validação genérico p/ qualquer schema zod.
// Uso: @Body(new ZodValidationPipe(registerSchema))
// ponytail: trocar por nestjs-zod quando DTOs > 10 e boilerplate pesar.
@Injectable()
export class ZodValidationPipe<T extends ZodType> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown): unknown {
    if (value === undefined || value === null) {
      throw new ValidationError('corpo da requisição ausente');
    }
    const result = this.schema.safeParse(value);
    if (!result.success) {
      // Lancamos ZodError p/ o filter mapear com detalhes; mas ValidationError
      // já dá 400. Preservar detalhes via ZodError:
      throw result.error as unknown as ZodError;
    }
    return result.data;
  }
}
