import type { FC } from "hono/jsx";
import { css } from "./styles";
import { script } from "./script";
import { GROUPS, REPO, STATUS, TOOLS } from "./tools";
import type { Tool } from "./tools";

const byUpdatedDesc = (a: Tool, b: Tool) =>
  b.updated.localeCompare(a.updated) || a.title.localeCompare(b.title);

const techOptions = [...new Set(TOOLS.flatMap((t) => t.tech))].sort((a, b) => a.localeCompare(b));
const groups = GROUPS.filter((g) => TOOLS.some((t) => t.group === g.id));

const ToolCard: FC<{ tool: Tool }> = ({ tool }) => (
  <article
    class="card"
    data-card
    data-group={tool.group}
    data-tech={tool.tech.map((t) => t.toLowerCase()).join("|")}
    data-status={tool.status}
    data-updated={tool.updated}
    data-title={tool.title.toLowerCase()}
    data-status-order={String(STATUS[tool.status].order)}
  >
    <div class="card-top">
      <h3>{tool.title}</h3>
      <span class={`status status-${tool.status}`}>{STATUS[tool.status].label}</span>
    </div>
    <p class="desc">{tool.description}</p>
    <ul class="tech" aria-label="Technologies used">
      {tool.tech.map((t) => (
        <li>{t}</li>
      ))}
    </ul>
    <div class="card-links">
      {tool.path ? (
        <a class="btn-primary" href={tool.path}>
          Open tool <span aria-hidden="true">→</span>
        </a>
      ) : (
        <span class="btn-disabled">Coming soon</span>
      )}
      {tool.source && (
        <a class="btn-secondary" href={`${REPO}/tree/main/${tool.source}`} target="_blank" rel="noopener">
          Source
        </a>
      )}
    </div>
    <p class="updated">
      Updated <time datetime={tool.updated}>{tool.updated}</time>
    </p>
  </article>
);

export const IndexPage: FC = () => (
  <html lang="en-GB">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Tools · tools.rjmlaird.co.uk</title>
      <meta
        name="description"
        content="Stable, bookmarkable calculators, converters and data utilities for space, physics, places and the web."
      />
      <meta name="theme-color" content="#0b0f1a" />
      <meta name="color-scheme" content="dark" />
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <style dangerouslySetInnerHTML={{ __html: css }} />
    </head>
    <body>
      <header class="hero wrap">
        <div class="orbit-line" aria-hidden="true"></div>
        <p class="eyebrow">rjmlaird.co.uk / tools</p>
        <h1>Small tools that do one job well.</h1>
        <p class="sub">
          Stable, bookmarkable calculators, converters and data utilities. Each tool runs
          separately; this is the shared index for finding them.
        </p>
      </header>

      <main class="wrap">
        <section class="filters" aria-labelledby="filter-heading">
          <div class="filter-intro">
            <p class="section-kicker">Browse tools</p>
            <h2 id="filter-heading">Find a tool</h2>
            <p>Narrow the collection by subject area, technology and status, then choose how the results are ordered.</p>
          </div>
          <div class="filter-controls">
            <div class="filter-field">
              <label for="group-filter">Subject area</label>
              <select id="group-filter" name="group">
                <option value="all">All subject areas</option>
                {groups.map((g) => (
                  <option value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div class="filter-field">
              <label for="tech-filter">Technology</label>
              <select id="tech-filter" name="technology">
                <option value="all">All technologies</option>
                {techOptions.map((t) => (
                  <option value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div class="filter-field">
              <label for="status-filter">Status</label>
              <select id="status-filter" name="status">
                <option value="all">All statuses</option>
                {Object.entries(STATUS).map(([id, s]) => (
                  <option value={id}>{s.label}</option>
                ))}
              </select>
            </div>
            <div class="filter-field">
              <label for="sort-filter">Sort by</label>
              <select id="sort-filter" name="sort">
                <option value="updated-desc">Recently updated</option>
                <option value="updated-asc">Oldest update</option>
                <option value="title-asc">Title, A to Z</option>
                <option value="title-desc">Title, Z to A</option>
                <option value="status">Status</option>
              </select>
            </div>
            <button class="clear-filter" id="clear-filter" type="button" hidden>
              Clear filters
            </button>
          </div>
          <p class="filter-summary" id="filter-summary" aria-live="polite">
            Showing all {TOOLS.length} tools, recently updated first.
          </p>
        </section>

        <div id="tools-content">
          {groups.map((g) => (
            <section
              class="lab-group"
              id={g.id}
              data-group-section
              aria-labelledby={`${g.id}-heading`}
            >
              <div class="section-heading">
                <p class="section-kicker">{g.name}</p>
                <h2 id={`${g.id}-heading`}>{g.blurb}</h2>
              </div>
              <div class="grid" data-grid>
                {TOOLS.filter((t) => t.group === g.id)
                  .sort(byUpdatedDesc)
                  .map((t) => (
                    <ToolCard tool={t} />
                  ))}
              </div>
            </section>
          ))}
        </div>

        <p class="no-results" id="no-results" hidden role="status">
          No tools match those filters. Try changing a selection or clear the filters.
        </p>
      </main>

      <footer class="wrap footer">
        <a href="https://rjmlaird.co.uk">← Back to rjmlaird.co.uk</a>
      </footer>
      <script dangerouslySetInnerHTML={{ __html: script }} />
    </body>
  </html>
);
