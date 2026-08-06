import type { Metadata } from 'next';
import { AuthProvider } from '../lib/auth';
import AuthBar from './auth-bar';
import './globals.css';

export const metadata: Metadata = {
  title: 'CyberHub AI',
  description: 'Central de automação, intel e IA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AuthProvider>
          <header className="border-b border-border">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <div className="flex items-center gap-6">
                <a href="/" className="text-lg font-semibold">🛡️ CyberHub AI</a>
                <nav className="flex gap-4 text-sm text-muted-foreground">
                  <a href="/cves" className="hover:text-foreground">CVEs</a>
                  <a href="/news" className="hover:text-foreground">Notícias</a>
                  <a href="/intel" className="hover:text-foreground">Intel</a>
                  <a href="/reports" className="hover:text-foreground">Relatórios</a>
                  <a href="/ai" className="hover:text-foreground">IA</a>
                  <a href="/metrics" className="hover:text-foreground">Métricas</a>
                </nav>
              </div>
              <AuthBar />
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}