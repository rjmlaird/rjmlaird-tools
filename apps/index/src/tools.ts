export type Status = "active" | "in-progress" | "planned" | "archived";
export type GroupId = "space" | "maths-physics" | "places" | "web-dev" | "sustainability" | "productivity";

export interface Tool {
  /** Must match the folder name under apps/ (checked by tools.test.ts). */
  id: string;
  title: string;
  description: string;
  group: GroupId;
  tech: string[];
  status: Status;
  /** ISO date, YYYY-MM-DD */
  updated: string;
  /** Path on this hostname, always `/${id}`. Omit until the tool is deployed. */
  path?: string;
  /** Folder in the repo, shown as the "Source" link. Always `apps/${id}`. */
  source?: string;
}

export interface TechItem {
  name: string;
  url: string;
  logo: string;
  color: string;
  logoColor?: string;
  context?: string;
}

export interface ToolsApiResponse {
  section: string;
  data: {
    categories: {
      name: string;
      items: TechItem[];
    }[];
  };
}

export const API_URL = "https://api.rjmlaird.co.uk/v1/cv/section/tools";
export const REPO = "https://github.com/rjmlaird/rjmlaird-tools";

export const GROUPS: { id: GroupId; name: string; blurb: string }[] = [
  { id: "space", name: "Space & Astronomy", blurb: "Orbital mechanics, satellite passes and astronomy utilities." },
  { id: "maths-physics", name: "Maths & Physics", blurb: "Calculators and converters for physics, engineering and maths." },
  { id: "places", name: "Places & Infrastructure", blurb: "Coordinates, postcodes and local data lookups." },
  { id: "sustainability", name: "Sustainability & Climate", blurb: "Emissions reporting and planning tools." },
  { id: "productivity", name: "Focus & Wellbeing", blurb: "Small tools for focus, breaks and everyday routines." },
  { id: "web-dev", name: "Web & Development", blurb: "Accessibility and sustainability checks and developer utilities." },
];

export const STATUS: Record<Status, { label: string; order: number }> = {
  active: { label: "Active", order: 1 },
  "in-progress": { label: "In progress", order: 2 },
  planned: { label: "Planned", order: 3 },
  archived: { label: "Archived", order: 4 },
};

export const STACK = ["TypeScript", "Hono", "Cloudflare Workers"];

/**
 * Fetches badge metadata from the CV API and indexes items by tech name.
 */
export async function fetchTechBadgesMap(): Promise<Record<string, TechItem>> {
  const map: Record<string, TechItem> = {};
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    const json: ToolsApiResponse = await response.json();
    for (const category of json.data.categories) {
      for (const item of category.items) {
        map[item.name] = item;
      }
    }
  } catch (error) {
    console.error("Failed to load tech badges from API:", error);
  }
  return map;
}

/**
 * Generates a Shields.io badge URL using metadata from the API.
 */
export function getBadgeUrl(techName: string, badgesMap: Record<string, TechItem>): string {
  const badge = badgesMap[techName];
  if (!badge) {
    return `https://img.shields.io/badge/${encodeURIComponent(techName)}-gray?style=flat-square`;
  }
  const logoParam = `&logo=${encodeURIComponent(badge.logo)}`;
  const logoColorParam = badge.logoColor ? `&logoColor=${encodeURIComponent(badge.logoColor)}` : "";
  return `https://img.shields.io/badge/${encodeURIComponent(badge.name)}-${badge.color}?style=flat-square${logoParam}${logoColorParam}`;
}

export const TOOLS: Tool[] = [
  // Space & Astronomy
  {
    id: "julian-date",
    title: "Julian Date & Sidereal Time",
    description:
      "Convert between UTC, Julian date, modified Julian date and Unix time, and calculate Greenwich and local mean sidereal time. Also available as a small JSON API.",
    group: "space",
    tech: STACK,
    status: "active",
    updated: "2026-10-11",
    path: "/julian-date",
    source: "apps/julian-date",
  },
  {
    id: "orbital-calc",
    title: "Orbital Calculator",
    description:
      "Two-body orbit calculator. Enter a semi-major axis and eccentricity to get the period, periapsis and apoapsis radii and the speeds at each, using the vis-viva equation. Defaults to Earth's gravitational parameter.",
    group: "space",
    tech: STACK,
    status: "active",
    updated: "2026-10-09",
    path: "/orbital-calc",
    source: "apps/orbital-calc",
  },
  {
    id: "hohmann-transfer",
    title: "Hohmann Transfer Calculator",
    description:
      "Delta-v and transfer time for a two-impulse Hohmann transfer between two circular, coplanar orbits around the same body.",
    group: "space",
    tech: STACK,
    status: "active",
    updated: "2026-10-11",
    path: "/hohmann-transfer",
    source: "apps/hohmann-transfer",
  },
  {
    id: "astro-calc",
    title: "Astronomy Calculator",
    description:
      "Observing and optics calculations for amateur astronomy, such as magnification, field of view, exit pupil and limiting magnitude.",
    group: "space",
    tech: STACK,
    status: "active",
    updated: "2026-10-25",
    path: "/astro-calc",
    source: "apps/astro-calc",
  },
  {
    id: "deep-sky-objects",
    title: "Deep-Sky Objects",
    description:
      "Explore deep-sky objects, coordinates, magnitudes, and visibility from your observing site.",
    group: "space",
    tech: STACK,
    status: "active",
    updated: "2026-10-24",
    path: "/deep-sky-objects",
    source: "apps/deep-sky-objects",
  },
  {
    id: "light-pollution",
    title: "Light Pollution Estimator",
    description:
      "Estimate local sky brightness and Bortle class from a UK location, with practical guidance for visual observing.",
    group: "space",
    tech: STACK,
    status: "active",
    updated: "2026-10-25",
    path: "/light-pollution",
    source: "apps/light-pollution",
  },
  {
    id: "optics-visualiser",
    title: "Optics Visualiser",
    description:
      "Move sliders for aperture, focal length and eyepiece to see magnification, exit pupil, field of view and resolution update beside a schematic ray diagram.",
    group: "space",
    tech: STACK,
    status: "active",
    updated: "2026-10-24",
    path: "/optics-visualiser",
    source: "apps/optics-visualiser",
  },
  {
    id: "orbit-simulator",
    title: "Orbit Simulator",
    description:
      "Animate a two-body orbit from a central body, semi-major axis and eccentricity, with live distance, speed and true anomaly alongside the vis-viva quantities.",
    group: "space",
    tech: STACK,
    status: "active",
    updated: "2026-10-24",
    path: "/orbit-simulator",
    source: "apps/orbit-simulator",
  },
  {
    id: "moon-sun-calc",
    title: "Moon & Sun Calculator",
    description:
      "Calculate sunrise, sunset, twilight times, moonrise and moonset, Moon phase and illumination for a location and date.",
    group: "space",
    tech: STACK,
    status: "active",
    updated: "2026-10-22",
    path: "/moon-sun-calc",
    source: "apps/moon-sun-calc",
  },
  {
    id: "how-satellites-see-earth",
    title: "How Satellites See Earth",
    description:
      "Explore Earth observation imaging bands, spatial resolution, and swath widths across satellite sensors.",
    group: "space",
    tech: STACK,
    status: "active",
    updated: "2026-10-24",
    path: "/how-satellites-see-earth",
    source: "apps/how-satellites-see-earth",
  },
  {
    id: "satellite-link-budget",
    title: "Satellite Link Budget Calculator",
    description:
      "Calculate free space path loss, received power, and link margins for Earth-to-space RF communications.",
    group: "space",
    tech: STACK,
    status: "active",
    updated: "2026-10-24",
    path: "/satellite-link-budget",
    source: "apps/satellite-link-budget",
  },
  {
    id: "galaxy-morphology",
    title: "Galaxy Morphology Explorer",
    description:
      "Classify and explore galaxy types using the Hubble tuning fork sequence and structural parameters.",
    group: "space",
    tech: STACK,
    status: "active",
    updated: "2026-10-24",
    path: "/galaxy-morphology",
    source: "apps/galaxy-morphology",
  },
  {
    id: "active-passive-satellites",
    title: "Active vs Passive Satellites",
    description:
      "Compare active radar (SAR) and passive optical Earth observation payloads and their observational capabilities.",
    group: "space",
    tech: STACK,
    status: "active",
    updated: "2026-10-24",
    path: "/active-passive-satellites",
    source: "apps/active-passive-satellites",
  },
  {
    id: "magnitude-dfference",
    title: "Magnitude Difference Calculator",
    description:
      "Calculate brightness ratios and magnitude differences for stellar astronomy.",
    group: "space",
    tech: STACK,
    status: "active",
    updated: "2026-10-24",
    path: "/magnitude-dfference",
    source: "apps/magnitude-dfference",
  },
  {
    id: "jupiter-moon-visualiser",
    title: "Jupiter Moon Visualiser",
    description:
      "Simulate and visualise the orbital positions of Jupiter's Galilean moons (Io, Europa, Ganymede, Callisto).",
    group: "space",
    tech: STACK,
    status: "active",
    updated: "2026-10-24",
    path: "/jupiter-moon-visualiser",
    source: "apps/jupiter-moon-visualiser",
  },
  {
    id: "angular-size-calculator",
    title: "Angular Size Calculator",
    description:
      "Calculate the angular diameter or physical size of astronomical objects using distance and subtended angle.",
    group: "space",
    tech: STACK,
    status: "active",
    updated: "2026-10-24",
    path: "/angular-size-calculator",
    source: "apps/angular-size-calculator",
  },
  {
    id: "saturn-ring-tilt",
    title: "Saturn Ring Tilt Calculator",
    description:
      "Calculate the apparent tilt angle and open appearance of Saturn's ring system relative to Earth over time.",
    group: "space",
    tech: STACK,
    status: "active",
    updated: "2026-10-25",
    path: "/saturn-ring-tilt",
    source: "apps/saturn-ring-tilt",
  },

  // Maths & Physics
  {
    id: "unit-converter",
    title: "Unit Converter",
    description:
      "Convert between physics, engineering and astronomy units, from newtons and pascals to parsecs, solar masses and electronvolts. Also available as a small JSON API.",
    group: "maths-physics",
    tech: STACK,
    status: "active",
    updated: "2026-10-09",
    path: "/unit-converter",
    source: "apps/unit-converter",
  },
  {
    id: "physical-limits",
    title: "Physical Limits",
    description:
      "Four gravitational limits in one calculator: escape velocity, Hill sphere, Roche limit and Schwarzschild radius.",
    group: "maths-physics",
    tech: STACK,
    status: "active",
    updated: "2026-10-11",
    path: "/physical-limits",
    source: "apps/physical-limits",
  },
  {
    id: "chilli-heat-scale",
    title: "Chilli Heat Scale Explorer",
    description:
      "Slide along the Scoville scale, compare 14 peppers, find your comfort zone with a short quiz and estimate how much pepper a sauce needs.",
    group: "maths-physics",
    tech: STACK,
    status: "active",
    updated: "2026-10-25",
    path: "/chilli-heat-scale",
    source: "apps/chilli-heat-scale",
  },
  {
    id: "cup-delta",
    title: "Cup Delta",
    description:
      "Calculate extraction yield, brew ratios, and TDS for espresso and filter coffee.",
    group: "maths-physics",
    tech: STACK,
    status: "active",
    updated: "2026-10-25",
    path: "/cup-delta",
    source: "apps/cup-delta",
  },
  {
    id: "escape-velocity",
    title: "Escape Velocity Calculator",
    description:
      "Calculate the escape velocity and gravitational binding energy for planets and celestial bodies.",
    group: "maths-physics",
    tech: STACK,
    status: "active",
    updated: "2026-10-24",
    path: "/escape-velocity",
    source: "apps/escape-velocity",
  },

  // Sustainability & Climate
  {
    id: "carbon-reduction-plan",
    title: "Carbon Reduction Plan Builder",
    description:
      "Record Scope 1, 2 and 3 emissions, track progress against a reduction target and export a printable Carbon Reduction Plan aligned with PPN 006.",
    group: "sustainability",
    tech: ["React", "Vite", "Cloudflare Workers"],
    status: "active",
    updated: "2026-10-12",
    path: "/carbon-reduction-plan",
    source: "apps/carbon-reduction-plan",
  },
  {
    id: "flight-emissions",
    title: "Flight Emissions Estimator",
    description:
      "Estimate greenhouse-gas emissions for a flight from origin and destination airports, cabin class and trip type. A modelled estimate, not a measurement.",
    group: "sustainability",
    tech: STACK,
    status: "active",
    updated: "2026-10-23",
    path: "/flight-emissions",
    source: "apps/flight-emissions",
  },
  {
    id: "home-energy-baseline",
    title: "Home Energy Baseline",
    description:
      "Record electricity and gas use, estimate annual emissions, compare against UK benchmarks and identify practical reduction opportunities.",
    group: "sustainability",
    tech: STACK,
    status: "in-progress",
    updated: "2026-10-23",
    path: "/home-energy-baseline",
    source: "apps/home-energy-baseline",
  },
  {
    id: "greenhouse-effect",
    title: "Greenhouse Effect Model",
    description:
      "Interactive zero-dimensional energy balance climate model demonstrating radiative forcing and greenhouse gas warming.",
    group: "sustainability",
    tech: STACK,
    status: "active",
    updated: "2026-10-24",
    path: "/greenhouse-effect",
    source: "apps/greenhouse-effect",
  },
  {
    id: "carbon-intensity",
    title: "Carbon Intensity Tracker",
    description:
      "Monitor real-time regional grid carbon intensity and low-carbon generation mixes.",
    group: "sustainability",
    tech: STACK,
    status: "active",
    updated: "2026-10-25",
    path: "/carbon-intensity",
    source: "apps/carbon-intensity",
  },

  // Focus & Wellbeing
  {
    id: "dopamine-menu",
    title: "Dopamine Menu",
    description:
      "Pick a short, enjoyable or restorative break from your own menu, filtered by type, time and place. Your menu stays in your browser.",
    group: "productivity",
    tech: STACK,
    status: "active",
    updated: "2026-10-12",
    path: "/dopamine-menu",
    source: "apps/dopamine-menu",
  },
  {
    id: "waiting-on-tracker",
    title: "Waiting-On Tracker",
    description:
      "Keep track of what you are waiting on and see what needs a nudge today. Snooze, resolve and reopen items, with a calm mode. Your list stays in your browser.",
    group: "productivity",
    tech: STACK,
    status: "active",
    updated: "2026-10-26",
    path: "/waiting-on-tracker",
    source: "apps/waiting-on-tracker",
  },
  {
    id: "habit-streak",
    title: "Habit Streak Tracker",
    description:
      "Track simple daily habits with streaks, weekly summaries and local-browser storage. No account required.",
    group: "productivity",
    tech: STACK,
    status: "in-progress",
    updated: "2026-10-23",
    path: "/habit-streak",
    source: "apps/habit-streak",
  },
  {
    id: "context-switcher",
    title: "Context Switcher",
    description: "Quickly switch between workspace contexts and environments.",
    group: "productivity",
    tech: STACK,
    status: "in-progress",
    updated: "2026-10-24",
    path: "/context-switcher",
    source: "apps/context-switcher",
  },

  // Places & Infrastructure
  {
    id: "coordinate-converter",
    title: "Coordinate Converter",
    description:
      "Convert between latitude/longitude, British National Grid and other coordinate formats.",
    group: "places",
    tech: STACK,
    status: "active",
    updated: "2026-10-22",
    path: "/coordinate-converter",
    source: "apps/coordinate-converter",
  },
  {
    id: "postcode-lookup",
    title: "Postcode Lookup",
    description:
      "Look up a UK postcode for its coordinates, constituency and LSOA.",
    group: "places",
    tech: STACK,
    status: "planned",
    updated: "2026-10-11",
  },

  // Web & Development
  {
    id: "colour-contrast",
    title: "Colour Contrast Checker",
    description:
      "WCAG contrast ratios for foreground and background colours, with AA and AAA results and fix suggestions.",
    group: "web-dev",
    tech: STACK,
    status: "active",
    updated: "2026-10-22",
    path: "/colour-contrast",
    source: "apps/colour-contrast",
  },
  {
    id: "seo-meta-tag",
    title: "SEO Meta Tag Checker",
    description:
      "Check a page’s title, description, Open Graph, Twitter card, canonical URL and robots directives against common SEO and sharing requirements.",
    group: "web-dev",
    tech: STACK,
    status: "active",
    updated: "2026-10-24",
    path: "/seo-meta-tag",
    source: "apps/seo-meta-tag",
  },
  {
    id: "marketing-dash",
    title: "Marketing Dashboard",
    description:
      "Overview of campaign performance metrics, funnel conversion rates, and channel ROI.",
    group: "web-dev",
    tech: STACK,
    status: "active",
    updated: "2026-10-24",
    path: "/marketing-dash",
    source: "apps/marketing-dash",
  },
  {
    id: "marketing-funnel",
    title: "Marketing Funnel Calculator",
    description:
      "Model conversion rates, lead volumes, and customer acquisition costs across marketing funnel stages.",
    group: "web-dev",
    tech: STACK,
    status: "active",
    updated: "2026-10-24",
    path: "/marketing-funnel",
    source: "apps/marketing-funnel",
  },
  {
    id: "page-weight",
    title: "Page Weight Audit",
    description:
      "Inspect a web page’s transferred bytes, largest assets, request count and caching headers, with practical performance and sustainability suggestions.",
    group: "web-dev",
    tech: STACK,
    status: "planned",
    updated: "2026-10-22",
  },
  {
    id: "web-carbon",
    title: "Website Carbon Checker",
    description:
      "Estimate the carbon footprint of a web page from its transfer size, and check whether it is served from green hosting. A modelled estimate, not a measurement.",
    group: "web-dev",
    tech: STACK,
    status: "planned",
    updated: "2026-10-11",
  },
];