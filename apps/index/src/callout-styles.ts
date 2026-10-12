// Callout styles, written with the tools page tokens (--navy-raised, --teal, --amber, --text-hi, --text-lo, --border, --font-display).
export const calloutCss = `
.apps-labs{margin:3rem 0}
.apps-labs__intro{max-width:62ch;margin-bottom:1.5rem}
.apps-labs__eyebrow,.project-card__label{margin:0 0 .4rem;font-family:var(--font-display);font-size:.78rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase}
.apps-labs__eyebrow{color:var(--amber)}
.apps-labs h2{margin:0;max-width:36ch;font-size:clamp(1.3rem,3vw,1.7rem);line-height:1.25}
.apps-labs__intro>p:last-child{margin:1rem 0 0;font-size:1.05rem;line-height:1.65;color:var(--text-lo)}

.apps-labs__grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1.25rem;margin:0;padding:0;list-style:none}
.project-card{display:grid;grid-template-columns:auto 1fr;gap:1rem;padding:1.4rem;border:1px solid var(--border);border-radius:16px;background:var(--navy-raised);transition:border-color .15s,transform .15s}
.project-card:hover{border-color:color-mix(in srgb,var(--card-accent) 45%,var(--border));transform:translateY(-2px)}
.project-card--apps{--card-accent:var(--amber)}
.project-card--tools{--card-accent:var(--teal)}
.project-card__icon{display:grid;width:2.75rem;height:2.75rem;place-items:center;border:1px solid var(--card-accent);border-radius:10px;background:color-mix(in srgb,var(--card-accent) 12%,var(--navy-raised));color:var(--card-accent);font-family:var(--font-display);font-weight:700}
.project-card__label{color:var(--card-accent)}
.project-card h3{margin:0;font-size:1.2rem;line-height:1.25}
.project-card p:not(.project-card__label){margin:.7rem 0 0;line-height:1.6;color:var(--text-lo)}
.project-card__link{grid-column:1/-1;display:inline-flex;align-items:center;gap:.4rem;width:fit-content;min-height:44px;color:var(--card-accent);font-weight:600;text-decoration:underline;text-underline-offset:.2em}
.project-card__link:hover{text-decoration-thickness:2px}
.project-card__link:focus-visible{outline:3px solid var(--text-hi);outline-offset:3px;border-radius:4px}
@media(prefers-reduced-motion:reduce){.project-card{transition:none}.project-card:hover{transform:none}}
`;
