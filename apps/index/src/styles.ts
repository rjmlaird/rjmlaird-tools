import { globalCss } from "./global-css";
import { calloutCss } from "./callout-styles";

const pageCss = `
.hero{padding:clamp(3rem,9vw,5.5rem) 0 clamp(2rem,5vw,3rem)}
.orbit-line{width:72px;height:3px;border-radius:3px;margin-bottom:1.5rem;background:linear-gradient(90deg,var(--teal),var(--amber))}
.eyebrow{margin:0 0 .75rem;font-family:var(--font-display);font-size:.85rem;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--teal)}
.hero h1{max-width:20ch;font-size:clamp(2rem,5.5vw,3.5rem);line-height:1.08;font-weight:700}
.sub{max-width:62ch;margin:1.25rem 0 0;font-size:1.05rem;line-height:1.65;color:var(--text-lo)}

.section-kicker{margin:0 0 .4rem;font-family:var(--font-display);font-size:.78rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--amber)}

.filters{display:grid;gap:1.5rem;margin-bottom:2.5rem;padding:1.5rem;border:1px solid var(--border);border-radius:16px;background:var(--navy-raised)}
.filter-intro h2{font-size:1.4rem}
.filter-intro p:last-child{margin:.5rem 0 0;color:var(--text-lo);line-height:1.6}
.filter-controls{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:1rem;align-items:end}
.filter-field{display:grid;gap:.4rem}
.filter-field label{font-size:.82rem;font-weight:500;color:var(--text-lo)}
select{width:100%;min-height:44px;padding:.55rem .75rem;border:1px solid var(--border);border-radius:10px;background:var(--navy);color:var(--text-hi)}
select:hover{border-color:rgba(0,194,168,.35)}
.clear-filter{min-height:44px;padding:.55rem 1rem;border-radius:10px;cursor:pointer}
.clear-filter[hidden]{display:none}
.filter-summary{margin:0;font-size:.9rem;color:var(--text-lo)}

.lab-group{margin-bottom:3rem}
.lab-group[hidden]{display:none}
.section-heading{margin-bottom:1.25rem}
.section-heading h2{max-width:36ch;font-size:clamp(1.3rem,3vw,1.7rem);line-height:1.25}

.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1.25rem}
.card{display:flex;flex-direction:column;gap:1rem;padding:1.4rem;border:1px solid var(--border);border-radius:16px;background:var(--navy-raised);transition:border-color .15s,transform .15s}
.card:hover{border-color:rgba(0,194,168,.35);transform:translateY(-2px)}
.card[hidden]{display:none}
.card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem}
.card h3{font-size:1.2rem;line-height:1.25}
.desc{margin:0;line-height:1.6;color:var(--text-lo)}

.status{flex:none;padding:.2rem .6rem;border:1px solid currentColor;border-radius:999px;font-size:.72rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
.status-active{color:var(--teal)}
.status-in-progress{color:var(--amber)}
.status-planned{color:var(--text-lo)}
.status-archived{color:var(--text-lo);opacity:.7}

.tech{display:flex;flex-wrap:wrap;gap:.4rem;margin:0;padding:0;list-style:none}
.tech li{padding:.15rem .55rem;border:1px solid var(--border);border-radius:6px;font-size:.78rem;color:var(--text-hi);background:rgba(238,242,246,.04)}

.card-links{display:flex;flex-wrap:wrap;gap:.6rem;margin-top:auto}
.btn-primary,.btn-secondary,.btn-disabled{display:inline-flex;align-items:center;gap:.4rem;min-height:44px;padding:.5rem 1rem;border-radius:10px;font-size:.92rem;font-weight:600;text-decoration:none}
.btn-primary{background:var(--teal);color:var(--navy)}
.btn-primary:hover{background:var(--teal-hover)}
.btn-secondary{border:1px solid var(--border);color:var(--text-hi)}
.btn-secondary:hover{border-color:rgba(0,194,168,.35)}
.btn-disabled{border:1px dashed var(--border);color:var(--text-lo);font-weight:500}
.updated{margin:0;font-size:.78rem;color:var(--text-lo)}

.no-results{padding:2rem;border:1px dashed var(--border);border-radius:12px;color:var(--text-lo);text-align:center}
.no-results[hidden]{display:none}
.footer{padding:2rem 0 3rem;color:var(--text-lo)}
.footer a:hover{color:var(--teal)}
`;

export const css = globalCss + pageCss + calloutCss;
