// Resolve each horse's Wikipedia article and thumbnail once at build time, so pages ship with
// final <img> tags (fixed dimensions, no client-side fetching, no late pop-in).
// Many horse names are also ordinary words (ウオッカ, ブエナビスタ...). Japanese Wikipedia puts
// those horses at "<name> (競走馬)", so that title wins whenever it exists.
const ENDPOINT = 'https://ja.wikipedia.org/w/api.php';
const BATCH = 25; // two titles per horse; the API allows 50 titles per request
const horseTitle = (name) => `${name} (競走馬)`;

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
  // Map every requested title to the page it finally landed on.
  const from = new Map();
  for (const n of json.query?.normalized || []) from.set(n.to, n.from);
  for (const r of json.query?.redirects || []) from.set(r.to, from.get(r.from) || r.from);
  const pages = new Map();
  for (const page of json.query?.pages || []) {
    if (page.missing || page.invalid) continue;
    const t = page.thumbnail;
    pages.set(from.get(page.title) || page.title, {
      title: page.title,
      photo: t?.source ? { url: t.source, width: t.width, height: t.height } : null,
    });
  }
  return pages;
}

/** @returns Map<name, { title: string, photo: {url,width,height} | null }> */
export async function fetchWikipedia(names) {
  const result = new Map();
  if (process.env.SKIP_WIKIPEDIA_PHOTOS) return result;
  for (let i = 0; i < names.length; i += BATCH) {
    const chunk = names.slice(i, i + BATCH);
    try {
      const pages = await fetchBatch(chunk.flatMap((n) => [horseTitle(n), n]));
      for (const name of chunk) {
        const page = pages.get(horseTitle(name)) || pages.get(name);
        if (page) result.set(name, page);
      }
    } catch (error) {
      console.warn('[photos] Wikipedia lookup failed; using placeholders for this batch.', error.message);
    }
  }
  return result;
}
