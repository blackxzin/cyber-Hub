'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

interface Report {
  id: string;
  title: string;
  format: string;
  createdAt: string;
  ready: boolean;
  hasSummary: boolean;
}

// Relatórios gerados (BullMQ): lista + download do PDF.
export default function ReportsPage() {
  const [items, setItems] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ items: Report[] }>('/reports')
      .then((d) => setItems(d.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Relatórios</h1>
      {loading ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">Nenhum relatório ainda.</p>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <div className="font-medium">{r.title}</div>
                <div className="text-xs text-muted-foreground">
                  {r.format} · {new Date(r.createdAt).toLocaleString()}
                  {r.hasSummary ? ' · com resumo IA' : ''}
                </div>
              </div>
              {r.ready && (
                <a
                  href={`/api/reports/${r.id}/pdf`}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
                >
                  Download PDF
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}