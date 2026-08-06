import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CyberHub AI',
  description: 'Central de automação, intel e IA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
            <a href="/" className="text-lg font-semibold">🛡️ CyberHub AI</a>
            <nav className="flex gap-4 text-sm text-muted-foreground">
              <a href="/cves" className="hover:text-foreground">CVEs</a>
              <a href="/news" className="hover:text-foreground">Notícias</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}