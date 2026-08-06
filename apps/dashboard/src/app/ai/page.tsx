'use client';
import { useState } from 'react';
import { api } from '../../lib/api';

// Chat IA: pergunta sobre CVE/IP/domínio/notícia → /ai/explain em PT-BR.
export default function AiPage() {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    setError(null);
    setAnswer(null);
    try {
      // /ai/explain pega até ~30s (Hermes no CPU); mantém loading ativo.
      const d = await api<{ answer: string; model: string | null }>('/ai/explain', {
        method: 'POST',
        body: JSON.stringify({ query }),
      });
      setAnswer(d.answer);
      setModel(d.model);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'falha');
    } finally {
      setBusy(false);
    }
  }

  const examples = ['CVE-2023-44487', '8.8.8.8', 'example.com'];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Assistente IA</h1>
        <p className="text-muted-foreground">Pergunte sobre um CVE, IP, domínio ou notícia. Explica em português.</p>
      </div>

      <form onSubmit={ask} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ex: CVE-2023-44487"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'Pensando…' : 'Explicar'}
        </button>
      </form>

      <div className="flex flex-wrap gap-2 text-xs">
        {examples.map((ex) => (
          <button
            key={ex}
            onClick={() => setQuery(ex)}
            className="rounded-full border border-border px-2 py-1 text-muted-foreground hover:bg-muted/40"
          >
            {ex}
          </button>
        ))}
      </div>

      {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      {answer && (
        <div className="rounded-lg border border-border p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Resposta</span>
            {model && <span className="rounded-full bg-muted px-2 py-0.5">{model}</span>}
          </div>
          <div className="prose-sm whitespace-pre-wrap text-sm leading-relaxed">{answer}</div>
        </div>
      )}
    </div>
  );
}