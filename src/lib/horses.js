import data from '../../data.json';

// The order of data.json determines stable numeric routes.
export const horses = data.map((horse, index) => ({
  ...horse,
  id: String(index + 1).padStart(3, '0'),
  index,
}));

export const yearOf = (horse) => Math.max(0, ...(horse.races || []).map((race) => Number(String(race).slice(0, 4) || 0)));

export const basePath = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + '/';
export const horseHref = (horse) => basePath + 'horse/' + horse.id + '/';
export const wikiHref = (name) => 'https://ja.wikipedia.org/wiki/' + encodeURIComponent(name);
export const jbisSearchHref = (name) => 'https://www.google.com/search?q=' + encodeURIComponent(name + ' 競走馬 site:jbis.or.jp/horse/');
