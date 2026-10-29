// Diagnosis configuration. Everything the engine "knows" lives here as plain data,
// so it can be read, argued with and changed without touching engine code.

/**
 * Typical ranges per brew method. They are broad on purpose: a value outside the
 * range is a hint, never proof. `ratio` is water per 1 g of coffee (16 = 1:16).
 * Times are seconds.
 */
export const METHODS = [
  { id: 'pourover', label: 'Pour-over', immersion: false, baseline: { time: [150, 210], temp: [91, 96], ratio: [15, 17] } },
  { id: 'frenchpress', label: 'French press', immersion: true, baseline: { time: [210, 270], temp: [92, 96], ratio: [13, 16] } },
  { id: 'aeropress', label: 'AeroPress', immersion: true, baseline: { time: [75, 180], temp: [80, 95], ratio: [11, 16] } },
  { id: 'espresso', label: 'Espresso', immersion: false, baseline: { time: [25, 32], temp: [90, 96], ratio: [1.8, 2.6] } },
  { id: 'other', label: 'Other', immersion: false, baseline: null },
];

export const methodById = (id) => METHODS.find((m) => m.id === id) || METHODS[METHODS.length - 1];

export const ROAST_LEVELS = [
  ['light', 'Light'],
  ['medium-light', 'Medium-light'],
  ['medium', 'Medium'],
  ['medium-dark', 'Medium-dark'],
  ['dark', 'Dark'],
];

export const PROCESSES = [
  ['washed', 'Washed'],
  ['natural', 'Natural'],
  ['honey', 'Honey'],
  ['anaerobic', 'Anaerobic'],
  ['other', 'Other'],
];

export const GRIND_FEELS = [
  ['coarse', 'Coarse for this method'],
  ['medium', 'About right'],
  ['fine', 'Fine for this method'],
];

/** Descriptor ids that act as evidence for each rule. */
export const GROUPS = {
  underNotes: ['sour', 'tart', 'vinegary', 'grassy', 'green-pea'],
  overNotes: ['astringent', 'drying', 'harsh'],
  staleNotes: ['papery', 'cardboard', 'flat', 'stale'],
  roastNotes: ['smoky', 'ashy', 'burnt', 'tobacco', 'dark-chocolate'],
  fermentNotes: ['winey', 'boozy', 'funky', 'overripe', 'yoghurty'],
  processFruit: [
    'blueberry', 'strawberry', 'raspberry', 'blackcurrant', 'peach', 'apricot', 'cherry',
    'plum', 'mango', 'pineapple', 'passionfruit', 'raisin', 'fig', 'prune',
  ],
  fruityProcesses: ['natural', 'honey', 'anaerobic'],
  darkRoasts: { dark: 2, 'medium-dark': 1.2 },
};

/** Bean age in days after roast. */
export const STALE_DAYS = { warn: 28, stale: 42 };

/** Points each kind of evidence adds to a rule's score. */
export const WEIGHTS = {
  ratingStrong: 2.5, // a ±2 rating on Sour↔Bitter
  ratingMild: 1.5, // a ±1 rating
  bodyStrong: 1.5,
  bodyMild: 1,
  notePerItem: 0.75, // each matching flavour note
  noteCap: 1.5,
  roastNotePerItem: 1.25,
  fermentNotePerItem: 1.5,
  staleNotePerItem: 1.5,
  noteGroupCap: 3,
  timeOff: 1.5, // brew time outside the typical range for the method
  grindFeel: 1,
  tempOff: 1,
  ageStale: 2.5,
  ageWarn: 1.2,
  processMatch: 2,
  processFruit: 1,
};

/** A rule must reach this score before Cup Delta names a cause. */
export const MIN_REPORT = 3;

/** Confidence needs enough points AND evidence from more than one kind. */
export const CONFIDENCE = {
  high: { score: 6.5, kinds: 2 },
  medium: { score: 4, kinds: 2 },
  mediumSingleKind: { score: 5, kinds: 1 },
};

/** "Slightly" is used while the score stays under this. */
export const SLIGHT_BELOW = 5.2;

/** Size of the one change the engine suggests. */
export const STEPS = { grind: 1, tempC: 2, roastTempC: 3, timeSec: 30 };
