// Resolve Wikipedia thumbnails once at build time, so pages ship with final <img> tags
// (fixed dimensions, no client-side fetching, no late pop-in).
const ENDPOINT = 'https://ja.wikipedia.org/w/api.php';
const BATCH = 50; // API limit for titles per request

async function fetchBatch(titles) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', redirects: '1',
    prop: 'pageimages', piprop: 'thumbnail', pithumbsize: '640', titles: titles.join('|'),
  });
  const res = await fetch(`${ENDPOINT}?${params}`, {
    headers: { 'User-Agent': 'keiba-db-site-build/1.0 (https://github.com/istone-you/keiba-db)' },
  });
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`);
  const json = await res.json();
  const from = new Map();
  for (const n of json.query?.normalized || []) from.set(n.to, n.from);
  for (const r of json.query?.redirects || []) from.set(r.to, from.get(r.from) || r.from);
  const found = new Map();
  for (const page of json.query?.pages || []) {
    const t = page.thumbnail;
    if (!t?.source) continue;
    found.set(from.get(page.title) || page.title, { url: t.source, width: t.width, height: t.height });
  }
  return found;
}

export async function fetchWikipediaPhotos(names) {
  const photos = new Map();
  if (process.env.SKIP_WIKIPEDIA_PHOTOS) return photos;
  for (let i = 0; i < names.length; i += BATCH) {
    try {
      for (const [k, v] of await fetchBatch(names.slice(i, i + BATCH))) photos.set(k, v);
    } catch (error) {
      console.warn('[photos] Wikipedia lookup failed; using placeholders for this batch.', error.message);
    }
  }
  return photos;
}
