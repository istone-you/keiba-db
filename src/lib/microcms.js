// Build-time access to the microCMS "horses" API.
// Set MICROCMS_SERVICE_DOMAIN and MICROCMS_API_KEY (GET permission) in .env or CI secrets.
// MICROCMS_SNAPSHOT=path/to/file.json builds from a saved API response instead (offline use).
import { readFile } from 'node:fs/promises';

const env = { ...process.env, ...import.meta.env };
const domain = env.MICROCMS_SERVICE_DOMAIN || 'keiba-db';
const apiKey = env.MICROCMS_API_KEY;
const PAGE = 100; // microCMS maximum per request

async function fetchPage(offset) {
  const url = new URL(`https://${domain}.microcms.io/api/v1/horses`);
  url.search = new URLSearchParams({ limit: String(PAGE), offset: String(offset), orders: 'sortOrder', depth: '1' });
  const res = await fetch(url, { headers: { 'X-MICROCMS-API-KEY': apiKey } });
  if (!res.ok) throw new Error(`microCMS ${res.status} ${res.statusText}: ${await res.text()}`);
  return res.json();
}

export async function fetchAllHorses() {
  if (env.MICROCMS_SNAPSHOT) {
    return JSON.parse(await readFile(env.MICROCMS_SNAPSHOT, 'utf8')).contents;
  }
  if (!apiKey) {
    throw new Error('MICROCMS_API_KEY is not set. Add it to .env (see .env.example) or set MICROCMS_SNAPSHOT.');
  }
  const first = await fetchPage(0);
  const contents = [...first.contents];
  for (let offset = PAGE; offset < first.totalCount; offset += PAGE) {
    contents.push(...(await fetchPage(offset)).contents);
  }
  return contents;
}
