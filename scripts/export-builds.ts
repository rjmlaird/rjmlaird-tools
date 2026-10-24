// scripts/export-builds.ts
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  GROUPS,
  REPO,
  STATUS,
  TOOLS,
} from "../apps/index/src/tools.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

const ORIGIN = "https://tools.rjmlaird.co.uk";
const SOURCE_REF = "main";

const args = process.argv.slice(2);

const checkOnly = args.includes("--check");

const outputIndex = args.indexOf("--output");

if (
  outputIndex !== -1 &&
  (!args[outputIndex + 1] || args[outputIndex + 1].startsWith("--"))
) {
  throw new Error("--output requires a destination filename.");
}

const outputFile = resolve(
  ROOT,
  outputIndex === -1
    ? "../rjmlaird-api/src/data/tools-builds.json"
    : args[outputIndex + 1],
);

/**
 * Validate the registry before exporting.
 */

const groupIds = new Set(GROUPS.map((group) => group.id));
const seenIds = new Set<string>();

if (groupIds.size !== GROUPS.length) {
  throw new Error("Duplicate group IDs in GROUPS.");
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

for (const tool of TOOLS) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tool.id)) {
    throw new Error(`Invalid tool ID: "${tool.id}".`);
  }

  if (seenIds.has(tool.id)) {
    throw new Error(`Duplicate tool ID: "${tool.id}".`);
  }

  seenIds.add(tool.id);

  if (!tool.title.trim() || !tool.description.trim()) {
    throw new Error(`${tool.id}: title and description are required.`);
  }

  if (!groupIds.has(tool.group)) {
    throw new Error(`${tool.id}: unknown group "${tool.group}".`);
  }

  if (!Object.hasOwn(STATUS, tool.status)) {
    throw new Error(`${tool.id}: unknown status "${tool.status}".`);
  }

  if (!isCalendarDate(tool.updated)) {
    throw new Error(
      `${tool.id}: updated must be a valid YYYY-MM-DD date.`,
    );
  }

  if (tool.path !== undefined && tool.path !== `/${tool.id}`) {
    throw new Error(
      `${tool.id}: path must equal "/${tool.id}".`,
    );
  }

  if (tool.source !== undefined && tool.source !== `apps/${tool.id}`) {
    throw new Error(
      `${tool.id}: source must equal "apps/${tool.id}".`,
    );
  }

  if (tool.status === "active" && !tool.path) {
    throw new Error(
      `${tool.id}: an active tool must have a deployment path.`,
    );
  }

  if (
    tool.tech.length === 0 ||
    tool.tech.some((technology) => !technology.trim())
  ) {
    throw new Error(`${tool.id}: tech must contain non-empty names.`);
  }
}

/**
 * Export in the shape consumed by the combined Builds API.
 *
 * Preserve registry order and dates.
 * Do not add a generation timestamp that changes on every run.
 */

const catalogue = {
  schemaVersion: 1,
  origin: ORIGIN,
  repository: REPO,
  sourceRef: SOURCE_REF,

  groups: GROUPS,
  statuses: STATUS,

  builds: TOOLS.map((tool) => ({
    id: `tools/${tool.id}`,
    sourceId: tool.id,
    type: "tool",

    title: tool.title,
    description: tool.description,
    group: tool.group,
    tech: tool.tech,
    status: tool.status,
    updated: tool.updated,

    repository: REPO,

    ...(tool.path
      ? {
          path: tool.path,
          url: new URL(tool.path, ORIGIN).href,
        }
      : {}),

    ...(tool.source
      ? {
          sourcePath: tool.source,
          source: `${REPO}/tree/${SOURCE_REF}/${tool.source}`,
        }
      : {}),
  })),
};

const output = `${JSON.stringify(catalogue, null, 2)}\n`;

async function main() {
  if (checkOnly) {
    const existing = await readFile(outputFile, "utf8").catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") {
          throw new Error(
            `Missing export: ${outputFile}. Run the export command first.`,
          );
        }

        throw error;
      },
    );

    if (existing !== output) {
      throw new Error(
        "The JSON export is stale. Regenerate it from tools.ts.",
      );
    }

    console.log(`Export is current: ${outputFile}`);
    return;
  }

  await mkdir(dirname(outputFile), { recursive: true });

  const temporaryFile = `${outputFile}.tmp`;

  await writeFile(temporaryFile, output, "utf8");
  await rename(temporaryFile, outputFile);

  console.log(
    `Exported ${catalogue.builds.length} tools to ${outputFile}`,
  );
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : String(error),
  );

  process.exitCode = 1;
});
