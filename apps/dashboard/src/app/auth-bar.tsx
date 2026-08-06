'use client';
import { useAuth } from '../lib/auth';

// Barra de autenticação no header: mostra email + logout, ou link de login.
export default function AuthBar() {
  const { user, loading, logout } = useAuth();

  if (loading) return <div className="h-6 w-24 animate-pulse rounded bg-muted" />;

  if (!user) {
    return (
      <a href="/login" className="rounded-md bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:opacity-90">
        Entrar
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-muted-foreground">{user.email}</span>
      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{user.role}</span>
      <button onClick={() => logout()} className="rounded-md border border-border px-3 py-1.5 hover:bg-muted/40">
        Sair
      </button>
    </div>
  );
}