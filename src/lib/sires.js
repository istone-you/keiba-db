// For sires / dams that are not collected horses, look up their own sire / dam on Japanese
// Wikipedia at build time so lines connect (e.g. サンデーサイレンス → ブラックタイド → キタサンブラック,
// エアグルーヴ → アドマイヤグルーヴ → ドゥラメンテ).
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
function parentFromInfobox(text, name, field) {
  if (!text.includes('{{競走馬')) return null;
  const named = text.match(/\|\s*名\s*=\s*([^\n|]+)/);
  if (named && !named[1].replace(/[（(].*?[）)]/g, '').includes(name)) return null;
  const m = text.match(new RegExp(`\\|\\s*${field}\\s*=\\s*([^\\n]+)`));
  if (!m) return null;
  const v = m[1].replace(/<ref[^>]*\/>|<ref.*?<\/ref>/g, '').replace(/\{\{[^{}]*\}\}/g, '');
  const link = v.match(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/);
  const sire = (link ? link[1] : v).replace(/'''?/g, '').split(/<br|\(|（/)[0].trim();
  return sire || null;
}

/** @returns Map<name, its parent's name> (field '父' = sire, '母' = dam) for names that are not collected horses. */
export async function fetchParents(startNames, collectedNames, field = '父') {
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
          const sire = parentFromInfobox(texts.get(`${name} (競走馬)`) || '', name, field) || parentFromInfobox(texts.get(name) || '', name, field);
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
