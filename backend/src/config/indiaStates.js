/**
 * Canonical India state / union-territory names.
 *
 * These are exactly the `ST_NM` property values found in the India GeoJSON
 * shipped with the frontend (`frontend/public/data/india.geojson`). Keeping the
 * two lists in sync is what lets an uploaded state-wise CSV be matched to a
 * polygon on the choropleth.
 */
export const INDIA_STATES = Object.freeze([
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli',
  'Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'The Dadra and Nagar Haveli and Daman and Diu',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
]);

/** Strips punctuation/spacing so `Tamil-Nadu` and `tamil nadu` compare equal. */
export const normaliseStateKey = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '');

/**
 * Common alternate spellings, historic names and two-letter codes accepted on
 * upload. Keys are already normalised; values are canonical names above.
 */
const ALIASES = {
  orissa: 'Odisha',
  pondicherry: 'Puducherry',
  uttaranchal: 'Uttarakhand',
  nctofdelhi: 'Delhi',
  newdelhi: 'Delhi',
  delhinct: 'Delhi',
  nationalcapitalterritoryofdelhi: 'Delhi',
  jandk: 'Jammu and Kashmir',
  jammukashmir: 'Jammu and Kashmir',
  andamannicobarislands: 'Andaman and Nicobar Islands',
  andamanandnicobar: 'Andaman and Nicobar Islands',
  dadranagarhaveli: 'Dadra and Nagar Haveli',
  damandiu: 'Daman and Diu',
  dadraandnagarhavelianddamananddiu: 'The Dadra and Nagar Haveli and Daman and Diu',
  chattisgarh: 'Chhattisgarh',
  westbangal: 'West Bengal',
  tamilnad: 'Tamil Nadu',
  // Two-letter codes used on the sample heatmap image.
  an: 'Andaman and Nicobar Islands',
  ap: 'Andhra Pradesh',
  ar: 'Arunachal Pradesh',
  as: 'Assam',
  br: 'Bihar',
  ch: 'Chandigarh',
  cg: 'Chhattisgarh',
  dl: 'Delhi',
  ga: 'Goa',
  gj: 'Gujarat',
  hr: 'Haryana',
  hp: 'Himachal Pradesh',
  jk: 'Jammu and Kashmir',
  jh: 'Jharkhand',
  ka: 'Karnataka',
  kl: 'Kerala',
  la: 'Ladakh',
  ld: 'Lakshadweep',
  mp: 'Madhya Pradesh',
  mh: 'Maharashtra',
  mn: 'Manipur',
  ml: 'Meghalaya',
  mz: 'Mizoram',
  nl: 'Nagaland',
  od: 'Odisha',
  py: 'Puducherry',
  pb: 'Punjab',
  rj: 'Rajasthan',
  sk: 'Sikkim',
  tn: 'Tamil Nadu',
  tg: 'Telangana',
  tr: 'Tripura',
  up: 'Uttar Pradesh',
  uk: 'Uttarakhand',
  wb: 'West Bengal',
};

const CANONICAL_BY_KEY = new Map(
  INDIA_STATES.map((name) => [normaliseStateKey(name), name]),
);

Object.entries(ALIASES).forEach(([key, canonical]) => {
  CANONICAL_BY_KEY.set(key, canonical);
});

/**
 * Resolves any reasonable spelling of an Indian state to its canonical name.
 * Returns `null` when the value cannot be matched to a mappable state.
 */
export const resolveStateName = (value) =>
  CANONICAL_BY_KEY.get(normaliseStateKey(value)) ?? null;

export default INDIA_STATES;
