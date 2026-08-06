'use client';
import { useState } from 'react';
import { useAuth } from '../../lib/auth';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password, (name || email.split('@')[0]) || 'usuário');
      window.location.href = '/'; // sessão ok → volta ao painel
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-sm rounded-lg border border-border p-6">
      <h1 className="mb-4 text-xl font-semibold">{mode === 'login' ? 'Entrar' : 'Criar conta'}</h1>

      <div className="mb-4 flex gap-2 text-sm">
        <button
          onClick={() => setMode('login')}
          className={`rounded-md px-3 py-1 ${mode === 'login' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Login
        </button>
        <button
          onClick={() => setMode('register')}
          className={`rounded-md px-3 py-1 ${mode === 'register' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Registrar
        </button>
      </div>

      <form onSubmit={submit} className="space-y-3">
        {mode === 'register' && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome (opcional)"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          required
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy ? '…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>
      </form>
    </div>
  );
}