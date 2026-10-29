// The four quick sensory scales. Values run -2..+2; null means "not rated".

export const SCALES = [
  {
    key: 'sourBitter',
    label: 'Sour ↔ Bitter',
    options: ['Very sour', 'Sour', 'Balanced', 'Bitter', 'Very bitter'],
    up: 'More bitter',
    down: 'More sour',
  },
  {
    key: 'body',
    label: 'Weak/thin ↔ Strong/heavy',
    options: ['Very thin', 'Thin', 'Medium', 'Heavy', 'Very heavy'],
    up: 'Heavier',
    down: 'Thinner',
  },
  {
    key: 'clean',
    label: 'Clean ↔ Muddled',
    options: ['Very clean', 'Clean', 'Mixed', 'Muddled', 'Very muddled'],
    up: 'More muddled',
    down: 'Cleaner',
  },
  {
    key: 'love',
    label: 'Dislike ↔ Love',
    options: ['Dislike', 'Not keen', 'Okay', 'Like', 'Love'],
    up: 'Liked more',
    down: 'Liked less',
  },
];

export const SCALE_VALUES = [-2, -1, 0, 1, 2];

export const scaleByKey = Object.fromEntries(SCALES.map((s) => [s.key, s]));

export function scaleLabel(key, value) {
  if (value === null || value === undefined) return '—';
  const s = scaleByKey[key];
  return s ? s.options[value + 2] : String(value);
}
