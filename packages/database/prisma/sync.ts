/* eslint-disable no-console */
// Sync opcional de dados: busca CVEs (NVD pública) e notícias (CISA KEV) e
// popula o banco. Idempotente (upsert por chave). Rode via `pnpm dbsync`.
//
// ponytail: NVD 2.0 em 2026 exige API key p/ keyword/date (senão 404); sem key
// só `cveId` funciona. Puxamos CVEs notórias p/ a demo. Virará BullMQ job na Fase 4.

import { PrismaClient } from '@prisma/client';
import { parseCvss } from '@cyberhub/utils';

const prisma = new PrismaClient();

const NOTABLE_CVES = [
  'CVE-2024-3094',
  'CVE-2023-44487',
  'CVE-2023-35016',
  'CVE-2021-44228',
  'CVE-2022-22965',
  'CVE-2023-23397',
  'CVE-2017-0144',
  'CVE-2019-0708',
  'CVE-2023-34362',
  'CVE-2024-3400',
  'CVE-2021-26855',
  'CVE-2020-1472',
];
const NVD_NOTABLE = NOTABLE_CVES.map(
  (id) => `https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=1&cveId=${id}`,
);
const CISA_FEED = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';

interface NvdCve {
  id: string;
  published?: string;
  descriptions?: Array<{ lang: string; value: string }>;
  metrics?: {
    cvssMetricV31?: Array<{ cvssData: { baseScore: number } }>;
    cvssMetricV30?: Array<{ cvssData: { baseScore: number } }>;
    cvssMetricV2?: Array<{ baseScore: number }>;
  };
  references?: Array<{ url: string; source?: string }>;
}

async function upsertCve(c: NvdCve): Promise<void> {
  const desc =
    c.descriptions?.find((d) => d.lang === 'en')?.value ?? c.descriptions?.[0]?.value ?? '';
  if (!desc) return;
  const score =
    c.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore ??
    c.metrics?.cvssMetricV30?.[0]?.cvssData?.baseScore ??
    c.metrics?.cvssMetricV2?.[0]?.baseScore ??
    null;
  await prisma.cve.upsert({
    where: { id: c.id },
    create: {
      id: c.id,
      publishedAt: c.published ? new Date(c.published) : null,
      cvss: parseCvss(score),
      description: desc,
      references: {
        create: (c.references ?? []).map((r) => ({ url: r.url, source: r.source ?? null })),
      },
    },
    update: {},
  });
}

async function syncCves(): Promise<void> {
  let count = 0;
  for (const url of NVD_NOTABLE) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`NVD HTTP ${res.status}`);
    const body = (await res.json()) as { vulnerabilities?: Array<{ cve: NvdCve }> };
    for (const v of body.vulnerabilities ?? []) {
      await upsertCve(v.cve);
      count++;
    }
    await sleep(250); // respeita rate limit sem key (~5 req/s)
  }
  console.log(`  ✓ ${count} CVEs sincronizadas da NVD`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function syncNews(): Promise<void> {
  const res = await fetch(CISA_FEED);
  if (!res.ok) throw new Error(`CISA HTTP ${res.status}`);
  const body = (await res.json()) as {
    vulnerabilities: Array<{
      cveID: string;
      vendorProject: string;
      product: string;
      dateAdded: string;
      shortDescription: string;
      url?: string;
    }>;
  };

  let count = 0;
  for (const item of body.vulnerabilities ?? []) {
    const url = item.url ?? `https://cve.cisa.gov/${item.cveID}`;
    await prisma.news.upsert({
      where: { url },
      create: {
        title: `${item.product} (${item.vendorProject}) — ${item.cveID}`,
        url,
        source: 'CISA KEV',
        publishedAt: item.dateAdded ? new Date(item.dateAdded) : null,
        summary: item.shortDescription,
        sources: { create: [{ name: 'CISA KEV' }] },
      },
      update: {},
    });
    count++;
  }
  console.log(`  ✓ ${count} notícias da CISA KEV`);
}

async function main(): Promise<void> {
  console.log('Sync de dados (NVD + CISA)…');
  try {
    await syncCves();
  } catch (e) {
    console.warn(`  · CVE sync falhou: ${(e as Error).message}`);
  }
  try {
    await syncNews();
  } catch (e) {
    console.warn(`  · News sync falhou: ${(e as Error).message}`);
  }
  console.log('Sync concluído.');
}

main()
  .catch((e) => {
    console.error('Sync falhou:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
