'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

// Métricas visuais: donut de severidade de CVEs + colunas de CVEs/dia (30d).
// Cores: ramp ordinal azul (CRITICAL escuro → LOW claro), validada CVD-safe.
export default function MetricsPage() {
  const [data, setData] = useState<Charts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Charts>('/stats/charts')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted-foreground">Carregando…</p>;
  if (!data) return <p className="text-muted-foreground">Não foi possível carregar as métricas.</p>;

  const sevEntries = (
    [
      ['CRITICAL', data.bySeverity.critical, '#0d366b'],
      ['HIGH', data.bySeverity.high, '#1c5cab'],
      ['MEDIUM', data.bySeverity.medium, '#3987e5'],
      ['LOW', data.bySeverity.low, '#86b6ef'],
      ['S/ CVSS', data.bySeverity.unknown, '#c3c2b7'],
    ] as const
  ).filter(([, v]) => v > 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Métricas</h1>
        <p className="text-muted-foreground">CVEs por severidade e publicação (últimos 30 dias).</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SevDonut entries={sevEntries} />
        <DailyBars byDay={data.byDay} />
      </div>
    </div>
  );
}

function SevDonut({ entries }: { entries: readonly (readonly [string, number, string])[] }) {
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  const r = 60;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="rounded-lg border border-border p-4">
      <h2 className="mb-3 text-sm font-medium">CVEs por severidade</h2>
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <svg viewBox="0 0 160 160" className="h-40 w-40">
          <g transform="translate(80,80) rotate(-90)">
            {entries.map(([label, val, color]) => {
              const frac = val / total;
              const dash = frac * c;
              const seg = (
                <circle
                  key={label}
                  r={r}
                  fill="none"
                  stroke={color}
                  strokeWidth={22}
                  strokeDasharray={`${dash} ${c - dash}`}
                  strokeDashoffset={-offset}
                >
                  <title>{`${label}: ${val}`}</title>
                </circle>
              );
              offset += dash;
              return seg;
            })}
          </g>
          <text x={80} y={84} textAnchor="middle" className="fill-current text-lg font-semibold">
            {total}
          </text>
          <text x={80} y={102} textAnchor="middle" className="fill-current text-[10px] opacity-60">
            CVEs
          </text>
        </svg>
        <ul className="space-y-1.5 text-sm">
          {entries.map(([label, val, color]) => (
            <li key={label} className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ background: color }} />
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium">{val}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DailyBars({ byDay }: { byDay: [string, number][] }) {
  const max = Math.max(1, ...byDay.map(([, v]) => v));
  return (
    <div className="rounded-lg border border-border p-4">
      <h2 className="mb-3 text-sm font-medium">CVEs publicados por dia</h2>
      <div className="flex h-40 items-end gap-px">
        {byDay.map(([day, val]) => {
          const h = Math.max(2, (val / max) * 100);
          const dd = day.slice(8);
          const mm = day.slice(5, 7);
          return (
            <div
              key={day}
              className="group relative flex-1 rounded-t-sm transition-opacity hover:opacity-80"
              style={{ height: `${h}%`, background: '#3987e5', minHeight: '2px' }}
              title={`${dd}/${mm}: ${val} CVE${val === 1 ? '' : 's'}`}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{byDay[0]?.[0].slice(5)}</span>
        <span>{byDay[byDay.length - 1]?.[0].slice(5)}</span>
      </div>
    </div>
  );
}

interface Charts {
  byDay: [string, number][];
  bySeverity: { critical: number; high: number; medium: number; low: number; unknown: number };
}