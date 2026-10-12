import { readdirSync } from "node:fs";
import { basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { GROUPS, STATUS, TOOLS } from "./tools";

const NOT_TOOLS = new Set(["index"]);

function findAppsDir(start: string): string {
  let dir = start;
  while (basename(dir) !== "apps") {
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`No apps/ directory found above ${start}`);
    dir = parent;
  }
  return dir;
}

const APPS_DIR = findAppsDir(dirname(fileURLToPath(import.meta.url)));

const folders = readdirSync(APPS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith(".") && !NOT_TOOLS.has(d.name))
  .map((d) => d.name);

describe("tools registry", () => {
  it("has unique ids", () => {
    const ids = TOOLS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has an entry for every apps/ folder, and a folder for every entry", () => {
    expect(TOOLS.map((t) => t.id).sort()).toEqual([...folders].sort());
  });

  it("uses known groups and statuses", () => {
    const groups = new Set(GROUPS.map((g) => g.id));
    for (const t of TOOLS) {
      expect(groups.has(t.group), `${t.id}: group`).toBe(true);
      expect(t.status in STATUS, `${t.id}: status`).toBe(true);
    }
  });

  it("follows the path and source conventions", () => {
    for (const t of TOOLS) {
      if (t.source) expect(t.source, `${t.id}: source`).toBe(`apps/${t.id}`);
      if (t.path) expect(t.path, `${t.id}: path`).toBe(`/${t.id}`);
    }
  });

  it("only gives a path to tools that are live", () => {
    for (const t of TOOLS) {
      const live = t.status === "active" || t.status === "in-progress";
      expect(Boolean(t.path), `${t.id}: path vs status`).toBe(live);
    }
  });

  it("uses valid ISO dates", () => {
    for (const t of TOOLS) {
      expect(t.updated, `${t.id}: updated`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(t.updated)), `${t.id}: updated`).toBe(false);
    }
  });
});
