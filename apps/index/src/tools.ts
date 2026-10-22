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
    id: "satellite-passes",
    title: "Satellite Pass Predictor",
    description:
      "Next visible passes of a satellite for a given location, calculated from current orbital elements.",
    group: "space",
    tech: [...STACK, "SGP4"],
    status: "planned",
    updated: "2026-10-09",
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
    id: "website-carbon",
    title: "Website Carbon Checker",
    description:
      "Estimate the carbon footprint of a web page from its transfer size, and check whether it is served from green hosting. A modelled estimate, not a measurement.",
    group: "web-dev",
    tech: STACK,
    status: "planned",
    updated: "2026-10-11",
  },
];