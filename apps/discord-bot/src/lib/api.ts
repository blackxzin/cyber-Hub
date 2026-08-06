import { env } from './env';

// Cliente HTTP mínimo p/ a API CyberHub. Sem deps — fetch nativo.
// Autentica com x-api-key (role=BOT no servidor).

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Options = { method?: string; body?: unknown };

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  let res: Response;
  const init: RequestInit = {
    method: opts.method ?? 'GET',
    headers: {
      'x-api-key': env.apiKey,
      accept: 'application/json',
    },
    signal: AbortSignal.timeout(15_000),
  };
  if (opts.body !== undefined) {
    init.body = JSON.stringify(opts.body);
    (init.headers as Record<string, string>)['content-type'] = 'application/json';
  }
  try {
    res = await fetch(`${env.apiBaseUrl}${path}`, init);
  } catch (err) {
    throw new Error('Não consegui falar com a API CyberHub. Tente de novo em instantes.');
  }

  if (!res.ok) {
    let code = 'api_error';
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { code?: string; message?: string };
      code = body.code ?? code;
      message = body.message ?? message;
    } catch {
      // corpo não-JSON; mantém mensagem genérica
    }
    throw new ApiError(res.status, code, message);
  }

  return (await res.json()) as T;
}
