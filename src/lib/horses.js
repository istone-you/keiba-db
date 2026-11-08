import { fetchAllHorses } from './microcms.js';
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
      .map((r) => ({ year: Number(r.year) || null, title: r.title || '' }))
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
    relatedIds: (raw.related || []).map((r) => r.id).filter(Boolean),
    cmsImage: raw.image?.url ? { url: raw.image.url, width: raw.image.width, height: raw.image.height } : null,
  };
}

const raw = await fetchAllHorses();
const list = raw.map(normalize);
const byId = new Map(list.map((h) => [h.id, h]));
const byName = new Map(list.map((h) => [h.name, h]));

const resolve = (id, name) => (id && byId.get(id)) || (name && byName.get(name)) || null;

const photos = await fetchWikipediaPhotos(list.filter((h) => !h.cmsImage).map((h) => h.name));

const offspring = new Map(list.map((h) => [h.id, { asSire: [], asDam: [] }]));
for (const h of list) {
  h.sireHorse = resolve(h.pedigree.sireId, h.pedigree.sire);
  h.damHorse = resolve(h.pedigree.damId, h.pedigree.dam);
  if (h.sireHorse) offspring.get(h.sireHorse.id).asSire.push(h);
  if (h.damHorse) offspring.get(h.damHorse.id).asDam.push(h);
}
for (const h of list) {
  h.offspring = offspring.get(h.id);
  h.related = h.relatedIds.map((id) => byId.get(id)).filter(Boolean);
  h.photo = h.cmsImage
    ? { ...h.cmsImage, url: h.cmsImage.url + '?w=640&fm=webp', source: 'cms' }
    : photos.has(h.name) ? { ...photos.get(h.name), source: 'wikipedia' } : null;
  h.latestYear = Math.max(0, ...h.races.map((r) => r.year || 0));
}

export const horses = list;
export const groupLabel = { book: '歴代名馬', new: '2023年以降の活躍馬' };

export const basePath = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + '/';
export const horseHref = (horse) => basePath + 'horse/' + horse.id + '/';
export const wikiHref = (name) => 'https://ja.wikipedia.org/wiki/' + encodeURIComponent(name);
export const jbisSearchHref = (name) => 'https://www.google.com/search?q=' + encodeURIComponent(name + ' 競走馬 site:jbis.or.jp/horse/');
