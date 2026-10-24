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

const STACK = ["TypeScript", "Hono", "Cloudflare Workers"];

// Add a tool here and it appears on the index. Keep `id` equal to the apps/ folder name.
// Flip a tool to "active" and add `path` only once it is deployed.
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
    updated: "2026-10-22",
    path: "/astro-calc",
    source: "apps/astro-calc",
  },
  {
    id: "deep-sky-objects",
    title: "Deep-Sky Objects",
    description:
      "Explore deep-sky objects, coordinates, magnitudes, and visibility from your observing site.",
    group: "space",
    tech: ["JavaScript", "Vite", "Cloudflare Workers"],
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
    tech: ["JavaScript", "Vite", "Cloudflare Workers"],
    status: "active",
    updated: "2026-10-24",
    path: "/light-pollution",
    source: "apps/light-pollution",
  },
  {
    id: "optics-visualiser",
    title: "Optics Visualiser",
    description:
      "Move sliders for aperture, focal length and eyepiece to see magnification, exit pupil, field of view and resolution update beside a schematic ray diagram.",
    group: "space",
    tech: ["JavaScript", "Vite", "Cloudflare Workers"],
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
    tech: ["JavaScript", "Vite", "Cloudflare Workers"],
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
    tech: ["JavaScript", "Vite", "Cloudflare Workers"],
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
    tech: ["JavaScript", "Vite", "Cloudflare Workers"],
    status: "in-progress",
    updated: "2026-10-23",
    path: "/home-energy-baseline",
    source: "apps/home-energy-baseline",
  },

  // Focus & Wellbeing
  {
    id: "dopamine-menu",
    title: "Dopamine Menu",
    description:
      "Pick a short, enjoyable or restorative break from your own menu, filtered by type, time and place. Your menu stays in your browser.",
    group: "productivity",
    tech: ["JavaScript", "Vite", "Cloudflare Workers"],
    status: "active",
    updated: "2026-10-12",
    path: "/dopamine-menu",
    source: "apps/dopamine-menu",
  },
  {
    id: "habit-streak",
    title: "Habit Streak Tracker",
    description:
      "Track simple daily habits with streaks, weekly summaries and local-browser storage. No account required.",
    group: "productivity",
    tech: ["JavaScript", "Vite", "Cloudflare Workers"],
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
    tech: ["JavaScript", "Vite", "Cloudflare Workers"],
    status: "active",
    updated: "2026-10-24",
    path: "/seo-meta-tag",
    source: "apps/seo-meta-tag",
  },
  {
    id: "meta-tag-checker",
    title: "Meta Tag Checker",
    description:
      "Check a page’s title, description, Open Graph, Twitter card, canonical URL and robots directives against common SEO and sharing requirements.",
    group: "web-dev",
    tech: ["JavaScript", "Vite", "Cloudflare Workers"],
    status: "in-progress",
    updated: "2026-10-23",
    path: "/meta-tag-checker",
    source: "apps/meta-tag-checker",
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