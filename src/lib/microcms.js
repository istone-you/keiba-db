// Build-time access to the microCMS APIs ("horses", "races", "sire-rankings").
// Set MICROCMS_SERVICE_DOMAIN and MICROCMS_API_KEY (GET permission) in .env or CI secrets.
// MICROCMS_SNAPSHOT=path/to/dir builds from saved responses (<dir>/horses.json, <dir>/races.json).
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const env = { ...process.env, ...import.meta.env };
const domain = env.MICROCMS_SERVICE_DOMAIN || 'keiba-db';
const apiKey = env.MICROCMS_API_KEY;
const PAGE = 100; // microCMS maximum per request

async function fetchPage(endpoint, offset, orders) {
  const url = new URL(`https://${domain}.microcms.io/api/v1/${endpoint}`);
  url.search = new URLSearchParams({ limit: String(PAGE), offset: String(offset), orders, depth: '1' });
  const res = await fetch(url, { headers: { 'X-MICROCMS-API-KEY': apiKey } });
  if (!res.ok) throw new Error(`microCMS ${endpoint} ${res.status} ${res.statusText}: ${await res.text()}`);
  return res.json();
}

export async function fetchAll(endpoint, orders = 'sortOrder') {
  if (env.MICROCMS_SNAPSHOT) {
    return JSON.parse(await readFile(join(env.MICROCMS_SNAPSHOT, `${endpoint}.json`), 'utf8')).contents;
  }
  if (!apiKey) {
    throw new Error('MICROCMS_API_KEY is not set. Add it to .env (see .env.example) or set MICROCMS_SNAPSHOT.');
  }
  const first = await fetchPage(endpoint, 0, orders);
  const contents = [...first.contents];
  for (let offset = PAGE; offset < first.totalCount; offset += PAGE) {
    contents.push(...(await fetchPage(endpoint, offset, orders)).contents);
  }
  return contents;
}
