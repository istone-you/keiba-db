import { fetchAll } from './microcms.js';
import { fetchWikipedia } from './photos.js';
import { fetchParents } from './sires.js';

const first = (v) => (Array.isArray(v) ? v[0] : v) || null;

function normalize(raw, index) {
  const ped = raw.pedigree || {};
  const prof = raw.profile || {};
  return {
    id: raw.id,
    index,
    name: raw.name,
    group: first(raw.group) || 'book',
    anchor: raw.anchor || '',
    desc: raw.desc || '',
    story: raw.story || '',
    races: (raw.races || [])
      .map((r) => ({ year: Number(r.year) || null, title: r.title || '', raceId: r.raceRef?.id || null }))
      .sort((a, b) => (a.year ?? 0) - (b.year ?? 0)),
    pedigree: {
      sire: ped.sire || null,
      dam: ped.dam || null,
      damSire: ped.damSire || null,
      // Optional relation fields; when absent the name is matched against collected horses.
      sireId: ped.sireRef?.id || null,
      damId: ped.damRef?.id || null,
    },
    profile: {
      birth: prof.birth ?? null,
      sex: first(prof.sex),
      coat: first(prof.coat),
      trainer: prof.trainer || null,
      record: prof.record || null,
      source: prof.source || null,
      netkeibaId: prof.netkeibaId || null,
      retiredYear: prof.retiredYear ?? null,
      owner: prof.owner || null,
      breeder: prof.breeder || null,
      earnings: prof.earnings || null,
      afterCareer: first(prof.afterCareer),
      deathYear: prof.deathYear ?? null,
    },
    horseOfYear: String(prof.horseOfYear || '').split(/[,、\s]+/).map(Number).filter(Boolean).sort((a, b) => a - b),
    rivalLinks: (raw.rivals || []).map((r) => ({ id: r.horse?.id, note: r.note || '' })).filter((r) => r.id),
    cmsImage: raw.image?.url ? { url: raw.image.url, width: raw.image.width, height: raw.image.height } : null,
  };
}

const [raw, rawRaces] = await Promise.all([fetchAll('horses'), fetchAll('races')]);
const list = raw.map(normalize);
const byId = new Map(list.map((h) => [h.id, h]));
const byName = new Map(list.map((h) => [h.name, h]));

const resolve = (id, name) => (id && byId.get(id)) || (name && byName.get(name)) || null;

const wiki = await fetchWikipedia(list.map((h) => h.name));

// e.g. 全兄 / 半妹: how `other` relates to `self` (same dam; 全 when the sire matches too).
function siblingLabel(self, other) {
  const full = other.pedigree.sire && other.pedigree.sire === self.pedigree.sire ? '全' : '半';
  const older = (other.profile.birth ?? 0) < (self.profile.birth ?? 0);
  const male = other.profile.sex !== '牝';
  return full + (older ? (male ? '兄' : '姉') : (male ? '弟' : '妹'));
}

const rivals = new Map(list.map((h) => [h.id, []]));
for (const h of list) {
  for (const { id, note } of h.rivalLinks) {
    const other = byId.get(id);
    if (!other || other === h) continue;
    rivals.get(h.id).push({ horse: other, note });
    rivals.get(other.id).push({ horse: h, note });
  }
}

const offspring = new Map(list.map((h) => [h.id, { asSire: [], asDam: [], asDamSire: [] }]));
for (const h of list) {
  h.sireHorse = resolve(h.pedigree.sireId, h.pedigree.sire);
  h.damHorse = resolve(h.pedigree.damId, h.pedigree.dam);
  h.damSireHorse = resolve(null, h.pedigree.damSire);
  if (h.sireHorse) offspring.get(h.sireHorse.id).asSire.push(h);
  if (h.damHorse) offspring.get(h.damHorse.id).asDam.push(h);
  if (h.damSireHorse) offspring.get(h.damSireHorse.id).asDamSire.push(h);
}
for (const h of list) {
  h.offspring = offspring.get(h.id);
  h.rivals = rivals.get(h.id).sort((a, b) => a.horse.index - b.horse.index);
  // Siblings are derived: same dam (全兄弟 when the sire matches too).
  h.siblings = h.pedigree.dam
    ? list.filter((o) => o !== h && o.pedigree.dam === h.pedigree.dam)
        .map((o) => ({ horse: o, label: siblingLabel(h, o) }))
    : [];
  const article = wiki.get(h.name);
  h.wikiTitle = article?.title || h.name;
  h.photo = h.cmsImage
    ? { ...h.cmsImage, url: h.cmsImage.url + '?w=640&fm=webp', source: 'cms' }
    : article?.photo ? { ...article.photo, source: 'wikipedia' } : null;
  h.latestYear = Math.max(0, ...h.races.map((r) => r.year || 0));
  h.status = h.profile.retiredYear ? `${h.profile.retiredYear}年引退` : '現役';
}

// G1 races with the collected horses that won them.
const raceList = rawRaces.map((r, index) => ({
  id: r.id,
  index,
  name: r.name,
  grade: first(r.grade) || 'G1',
  region: first(r.region) || '国内',
  country: r.country || '',
  venue: r.venue || '',
  course: r.course || '',
  description: r.description || '',
  winners: [],
}));
const raceById = new Map(raceList.map((r) => [r.id, r]));
for (const h of list) {
  for (const r of h.races) {
    r.race = (r.raceId && raceById.get(r.raceId)) || null;
    if (r.race) r.race.winners.push({ horse: h, year: r.year, title: r.title });
  }
}
for (const r of raceList) r.winners.sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.horse.index - b.horse.index);

// Triple crowns, derived from each horse's linked wins in a single year.
// The fillies' final leg was エリザベス女王杯 until 秋華賞 was founded in 1996.
const CROWNS = [
  { key: 'classic', label: '三冠馬', legs: () => ['satsuki-sho', 'japanese-derby', 'kikuka-sho'] },
  { key: 'fillies', label: '牝馬三冠', legs: (y) => ['oka-sho', 'oaks', y < 1996 ? 'queen-elizabeth-cup' : 'shuka-sho'] },
];
const crownWinners = Object.fromEntries(CROWNS.map((c) => [c.key, []]));
for (const h of list) {
  const byYear = new Map();
  for (const r of h.races) {
    if (!r.race || !r.year) continue;
    if (!byYear.has(r.year)) byYear.set(r.year, new Set());
    byYear.get(r.year).add(r.race.id);
  }
  h.crowns = [];
  for (const c of CROWNS) {
    for (const [year, won] of byYear) {
      if (c.legs(year).every((id) => won.has(id))) {
        h.crowns.push({ key: c.key, label: c.label, year });
        crownWinners[c.key].push({ horse: h, year });
      }
    }
  }
}
for (const k in crownWinners) crownWinners[k].sort((a, b) => a.year - b.year);
export const tripleCrowns = CROWNS.map((c) => ({ key: c.key, label: c.label, winners: crownWinners[c.key] }));

// 年度代表馬, one entry per award year.
export const horsesOfTheYear = list
  .flatMap((h) => h.horseOfYear.map((year) => ({ year, horse: h })))
  .sort((a, b) => a.year - b.year || a.horse.index - b.horse.index);

// Overseas G1 wins by collected (Japan-related) horses.
export const overseasWins = list
  .flatMap((h) => h.races.filter((r) => r.race?.region === '海外').map((r) => ({ year: r.year, horse: h, race: r.race, title: r.title })))
  .sort((a, b) => a.year - b.year || a.horse.index - b.horse.index);

// Sire and dam lines: trees of names (collected or not) down to collected horses.
// Names in a tree: collected horses plus their sires (or dams). A non-collected name is linked to
// its own sire (dam) — looked up on Wikipedia — only when that parent is already in the tree.
const birthOf = (name) => byName.get(name)?.profile.birth ?? 0;
async function buildLines(key, field) {
  const names = new Set([...list.map((h) => h.name), ...list.map((h) => h.pedigree[key]).filter(Boolean)]);
  const fetched = await fetchParents([...names].filter((n) => !byName.has(n)), new Set(byName.keys()), field);
  const parentOf = (name) => {
    const p = byName.get(name)?.pedigree[key] || fetched.get(name) || null;
    return p && names.has(p) && p !== name ? p : null;
  };
  const childrenOf = new Map();
  for (const name of names) {
    const p = parentOf(name);
    if (!p) continue;
    if (!childrenOf.has(p)) childrenOf.set(p, []);
    childrenOf.get(p).push(name);
  }
  const node = (name, seen) => {
    seen.add(name);
    const kids = (childrenOf.get(name) || []).filter((k) => !seen.has(k)).sort((a, b) => birthOf(a) - birthOf(b) || a.localeCompare(b, 'ja'));
    const children = kids.map((k) => node(k, seen));
    const size = children.reduce((n, c) => n + (c.horse ? 1 : 0) + c.size, 0);
    return { name, horse: byName.get(name) || null, children, size };
  };
  return [...names]
    .filter((name) => !parentOf(name) && childrenOf.has(name))
    .map((name) => node(name, new Set()))
    .sort((a, b) => b.size - a.size || a.name.localeCompare(b.name, 'ja'));
}
export const sireLines = await buildLines('sire', '父');
export const damLines = await buildLines('dam', '母');

export const horses = list;
export const races = raceList;
// When active horses' earnings / records were last refreshed (shown next to their earnings).
export const dataAsOf = '2026年11月';
export const groupLabel = { book: '歴代名馬', new: '2023年以降の活躍馬' };

export const basePath = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + '/';
export const horseHref = (horse) => basePath + 'horse/' + horse.id + '/';
export const raceHref = (race) => basePath + 'races/' + race.id + '/';
export const racesHref = basePath + 'races/';
export const tripleCrownHref = basePath + 'triple-crown/';
export const horseOfYearHref = basePath + 'horse-of-the-year/';
export const sireLinesHref = basePath + 'sire-lines/';
export const overseasHref = basePath + 'overseas/';
export const netkeibaHref = (id) => 'https://db.netkeiba.com/horse/' + encodeURIComponent(id) + '/';
export const wikiHref = (name) => 'https://ja.wikipedia.org/wiki/' + encodeURIComponent(name);
export const jbisSearchHref = (name) => 'https://www.google.com/search?q=' + encodeURIComponent(name + ' 競走馬 site:jbis.or.jp/horse/');
