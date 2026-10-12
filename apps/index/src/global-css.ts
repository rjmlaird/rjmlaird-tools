export const globalCss = `
@import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap");

:root {
  --navy: #0b0f1a;
  --navy-raised: #121826;
  --teal: #00c2a8;
  --teal-hover: #30d6bf;
  --amber: #f5a623;
  --text-hi: #eef2f6;
  --text-lo: #9aa5b1;
  --border: rgba(238, 242, 246, 0.08);

  --font-display: "Space Grotesk", system-ui, sans-serif;
  --font-body: "Inter", system-ui, sans-serif;

  --content-width: 1080px;
  --page-gutter: 1.5rem;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  background: var(--navy);
  color: var(--text-hi);
  font-family: var(--font-body);
  scroll-behavior: smooth;
}

body {
  min-width: 320px;
  min-height: 100vh;
  margin: 0;
  padding: 0;
  background:
    radial-gradient(circle at 15% 20%, rgba(0, 194, 168, 0.06), transparent 40%),
    radial-gradient(circle at 85% 75%, rgba(245, 166, 35, 0.05), transparent 45%),
    var(--navy);
}

h1,
h2,
h3 {
  margin: 0;
  font-family: var(--font-display);
  letter-spacing: -0.01em;
}

p,
ul,
ol {
  margin-top: 0;
}

a {
  color: inherit;
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  border: 1px solid var(--border);
  background: linear-gradient(
    180deg,
    rgba(18, 24, 38, 0.95),
    rgba(11, 15, 26, 0.95)
  );
  color: var(--text-hi);
}

button:hover {
  border-color: rgba(0, 194, 168, 0.35);
}

:focus-visible {
  outline: 3px solid var(--amber);
  outline-offset: 3px;
}

::selection {
  background: rgba(0, 194, 168, 0.25);
  color: var(--text-hi);
}

.wrap {
  width: min(100% - (var(--page-gutter) * 2), var(--content-width));
  margin-inline: auto;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation: none !important;
    scroll-behavior: auto !important;
    transition: none !important;
  }
}

@media (max-width: 560px) {
  :root {
    --page-gutter: 1rem;
  }
}
`;
