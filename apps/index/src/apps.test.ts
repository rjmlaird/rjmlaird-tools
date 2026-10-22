import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Guards the contract that every tool is reachable at tools.rjmlaird.co.uk/<id> and that apps
// can run side by side in `pnpm dev`.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const APPS = join(ROOT, "apps");
const ids = readdirSync(APPS, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== "index")
  .map((d) => d.name);

function config(id: string): string {
  for (const f of ["wrangler.toml", "wrangler.jsonc"]) {
    const p = join(APPS, id, f);
    // Strip comments so notes about alternatives don't trip the checks.
    if (existsSync(p)) return readFileSync(p, "utf8").replace(/^\s*(#|\/\/).*$/gm, "");
  }
  throw new Error(`${id}: no wrangler config`);
}

describe("app deployment contract", () => {
  for (const id of ids) {
    it(`${id}: routes /${id} and /${id}/*, no workers.dev, own Worker name`, () => {
      const c = config(id);
      expect(c).toContain(`tools.rjmlaird.co.uk/${id}"`);
      expect(c).toContain(`tools.rjmlaird.co.uk/${id}/*"`);
      expect(c).not.toMatch(/custom_domain/);
      expect(c).toMatch(/workers_dev\s*=\s*false|"workers_dev":\s*false/);
      expect(c).toContain(`rjmlaird-tools-${id}`);
    });
  }

  it("uses unique dev and inspector ports", () => {
    const ports: string[] = [];
    for (const id of [...ids, "index"]) {
      const c = id === "index" ? readFileSync(join(APPS, "index", "wrangler.toml"), "utf8") : config(id);
      const m = /port\W+(\d+)[\s\S]*?inspector_port\W+(\d+)/.exec(c);
      expect(m, `${id}: [dev] ports`).toBeTruthy();
      ports.push(m![1]!, m![2]!);
    }
    expect(new Set(ports).size).toBe(ports.length);
  });

  it("keeps the generated brand CSS in sync with brand.css", () => {
    const dir = join(ROOT, "packages", "ui", "src");
    const css = readFileSync(join(dir, "brand.css"), "utf8");
    const gen = readFileSync(join(dir, "brand-css.generated.ts"), "utf8");
    expect(gen).toContain(JSON.stringify(css));
  });
});
