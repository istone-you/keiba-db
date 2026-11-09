// For sires that are not collected horses, look up their own sire on Japanese Wikipedia at
// build time so sire lines connect (e.g. サンデーサイレンス → ブラックタイド → キタサンブラック).
const ENDPOINT = 'https://ja.wikipedia.org/w/api.php';
const MAX_DEPTH = 1; // only the direct sires of collected horses

async function fetchWikitext(titles) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', redirects: '1',
    prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: titles.join('|'),
  });
  const res = await fetch(`${ENDPOINT}?${params}`, {
    headers: { 'User-Agent': 'keiba-db-site-build/1.0 (https://github.com/istone-you/keiba-db)' },
  });
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`);
  const json = await res.json();
  const from = new Map();
  for (const n of json.query?.normalized || []) from.set(n.to, n.from);
  for (const r of json.query?.redirects || []) from.set(r.to, from.get(r.from) || r.from);
  const out = new Map();
  for (const p of json.query?.pages || []) {
    const text = p.revisions?.[0]?.slots?.main?.content;
    if (text) out.set(from.get(p.title) || p.title, text);
  }
  return out;
}

// "| 父 = [[ブラックタイド]]<ref…>" → "ブラックタイド", only from a 競走馬 infobox naming this horse.
function sireFromInfobox(text, name) {
  if (!text.includes('{{競走馬')) return null;
  const named = text.match(/\|\s*名\s*=\s*([^\n|]+)/);
  if (named && !named[1].replace(/[（(].*?[）)]/g, '').includes(name)) return null;
  const m = text.match(/\|\s*父\s*=\s*([^\n]+)/);
  if (!m) return null;
  const v = m[1].replace(/<ref[^>]*\/>|<ref.*?<\/ref>/g, '').replace(/\{\{[^{}]*\}\}/g, '');
  const link = v.match(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/);
  const sire = (link ? link[1] : v).replace(/'''?/g, '').split(/<br|\(|（/)[0].trim();
  return sire || null;
}

/** @returns Map<sireName, itsSireName> for names that are not collected horses. */
export async function fetchSireParents(startNames, collectedNames) {
  const parents = new Map();
  if (process.env.SKIP_WIKIPEDIA_PHOTOS) return parents;
  let frontier = [...new Set(startNames)].filter((n) => !collectedNames.has(n));
  const seen = new Set(frontier);
  for (let depth = 0; depth < MAX_DEPTH && frontier.length; depth++) {
    const next = [];
    for (let i = 0; i < frontier.length; i += 25) {
      const chunk = frontier.slice(i, i + 25);
      try {
        const texts = await fetchWikitext(chunk.flatMap((n) => [`${n} (競走馬)`, n]));
        for (const name of chunk) {
          const sire = sireFromInfobox(texts.get(`${name} (競走馬)`) || '', name) || sireFromInfobox(texts.get(name) || '', name);
          if (!sire || sire === name) continue;
          parents.set(name, sire);
          if (!collectedNames.has(sire) && !seen.has(sire)) { seen.add(sire); next.push(sire); }
        }
      } catch (error) {
        console.warn('[sires] Wikipedia lookup failed for a batch.', error.message);
      }
    }
    frontier = next;
  }
  return parents;
}
