import { Layout } from "@rjmlaird/ui";
import { script } from "./client";

// Four result panels are built by the client script into #grid.
const css = `
#grid { margin-top: 0; }
#grid .panel + .panel { margin-top: 0; }
#grid .row { margin: 0.75rem 0 0.25rem; }
`;

export const Page = () => (
  <Layout
    title="Physical limits"
    lede="Four gravitational thresholds: how fast to escape, where a moon’s pull ends, how close a satellite can orbit before tidal forces break it, and how small a mass must be squeezed to form a black hole."
    wide
    css={css}
    script={script}
  >
    <p class="muted small">
      Inputs are SI units. Scientific notation such as 5.972e24 works. Use a preset to fill the fields.
    </p>
    <div class="grid-2" id="grid"></div>
    <p class="muted small" style="margin-top:1.5rem">
      Hill sphere and Roche limit are standard approximations: the Hill sphere assumes the secondary is much
      lighter than the primary, and the Roche limit assumes a self-gravitating satellite with no internal
      strength beyond the rigid or fluid case. JSON API: <a href="/physical-limits/api">/physical-limits/api</a>.
    </p>
  </Layout>
);
