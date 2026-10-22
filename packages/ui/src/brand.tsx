import type { FC } from "hono/jsx";

/** Google Fonts stylesheet for the brand typefaces. Loaded by <link>, never @import. */
export const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap";

/** Shared favicon, served by the index Worker for the whole hostname. */
export const FAVICON_HREF = "/favicon.svg";

export const BrandMark: FC = () => (
  <svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true" focusable="false">
    <rect width="32" height="32" rx="7" fill="#121826" />
    <circle cx="16" cy="16" r="9" fill="none" stroke="#00c2a8" stroke-width="2" />
    <circle cx="25" cy="16" r="2.5" fill="#f5a623" />
  </svg>
);

export const BrandBar: FC = () => (
  <div class="rj-bar">
    <div class="rj-bar-inner wrap">
      <a class="rj-brand" href="/">
        <BrandMark />
        <span>
          rjmlaird <b>tools</b>
        </span>
      </a>
      <a class="rj-bar-link" href="/">
        All tools
      </a>
    </div>
  </div>
);

export const BrandFooter: FC = () => (
  <footer class="rj-footer wrap">
    <a href="/">← All tools</a>
    <a href="https://rjmlaird.co.uk">rjmlaird.co.uk</a>
  </footer>
);
