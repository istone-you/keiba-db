import { fetchAll } from './microcms.js';
import { fetchWikipediaPhotos } from './photos.js';

const first = (v) => (Array.isArray(v) ? v[0] : v) || null;

function normalize(raw, index) {
  const ped = raw.pedigree || {};
  const prof = raw.profile || {};
  return {
    id: raw.id,
    index,
    name: raw.name,
    group: first(raw.group) || 'book',
    era: first(raw.era) || '',
    anchor: raw.anchor || '',
    desc: raw.desc || '',
    story: raw.story || '',
    year: raw.year ?? null,
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
    },
    rivalLinks: (raw.rivals || []).map((r) => ({ id: r.horse?.id, note: r.note || '' })).filter((r) => r.id),
    cmsImage: raw.image?.url ? { url: raw.image.url, width: raw.image.width, height: raw.image.height } : null,
  };
}

const [raw, rawRaces] = await Promise.all([fetchAll('horses'), fetchAll('races')]);
const list = raw.map(normalize);
const byId = new Map(list.map((h) => [h.id, h]));
const byName = new Map(list.map((h) => [h.name, h]));

const resolve = (id, name) => (id && byId.get(id)) || (name && byName.get(name)) || null;

const photos = await fetchWikipediaPhotos(list.filter((h) => !h.cmsImage).map((h) => h.name));

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
  h.photo = h.cmsImage
    ? { ...h.cmsImage, url: h.cmsImage.url + '?w=640&fm=webp', source: 'cms' }
    : photos.has(h.name) ? { ...photos.get(h.name), source: 'wikipedia' } : null;
  h.latestYear = Math.max(0, ...h.races.map((r) => r.year || 0));
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

export const horses = list;
export const races = raceList;
export const groupLabel = { book: '歴代名馬', new: '2023年以降の活躍馬' };

export const basePath = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + '/';
export const horseHref = (horse) => basePath + 'horse/' + horse.id + '/';
export const raceHref = (race) => basePath + 'races/' + race.id + '/';
export const racesHref = basePath + 'races/';
export const wikiHref = (name) => 'https://ja.wikipedia.org/wiki/' + encodeURIComponent(name);
export const jbisSearchHref = (name) => 'https://www.google.com/search?q=' + encodeURIComponent(name + ' 競走馬 site:jbis.or.jp/horse/');
