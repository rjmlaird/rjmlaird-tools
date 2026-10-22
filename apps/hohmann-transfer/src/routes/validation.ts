import { findBody } from "../data/bodies";
import type { FieldError } from "./errors";

export interface ParsedHohmannRequest {
  /** Id of the selected body, or null when a custom mu was supplied. */
  body: string | null;
  mu: number;
  initialRadius: number;
  finalRadius: number;
}

export type ParseResult =
  | { ok: true; value: ParsedHohmannRequest }
  | { ok: false; errors: FieldError[] };

const ALLOWED_FIELDS = new Set(["body", "mu", "initialRadius", "finalRadius"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Returns an error for a value that is not a positive, finite JSON number, else null. */
function checkPositiveNumber(field: string, value: unknown): FieldError | null {
  if (typeof value !== "number") {
    return { field, code: "invalid_type", message: `'${field}' must be a number.` };
  }
  if (!Number.isFinite(value)) {
    return { field, code: "not_finite", message: `'${field}' must be finite.` };
  }
  if (value <= 0) {
    return { field, code: "not_positive", message: `'${field}' must be greater than zero.` };
  }
  return null;
}

/** Validate the decoded JSON body of POST /api/v1/hohmann. Numbers are never coerced from strings. */
export function parseHohmannRequest(input: unknown): ParseResult {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [{ field: "$", code: "invalid_type", message: "Request body must be a JSON object." }],
    };
  }

  const errors: FieldError[] = [];

  for (const key of Object.keys(input)) {
    if (!ALLOWED_FIELDS.has(key)) {
      errors.push({ field: key, code: "unknown_field", message: `Unknown field '${key}'.` });
    }
  }

  const hasMu = input.mu !== undefined;
  const hasBody = input.body !== undefined;
  let mu: number | undefined;
  let body: string | null = null;

  if (hasMu && hasBody) {
    errors.push({ field: "body", code: "conflict", message: "Provide either 'mu' or 'body', not both." });
  } else if (!hasMu && !hasBody) {
    errors.push({
      field: "mu",
      code: "required",
      message: "'mu' (km^3/s^2) is required unless 'body' names a known central body.",
    });
  } else if (hasMu) {
    const error = checkPositiveNumber("mu", input.mu);
    if (error) errors.push(error);
    else mu = input.mu as number;
  } else {
    const selected = input.body;
    const known = typeof selected === "string" ? findBody(selected) : undefined;
    if (typeof selected !== "string") {
      errors.push({ field: "body", code: "invalid_type", message: "'body' must be a string." });
    } else if (!known) {
      errors.push({ field: "body", code: "unknown_body", message: `Unknown body '${selected}'. See GET /api/v1/bodies.` });
    } else {
      body = known.id;
      mu = known.mu;
    }
  }

  const radii: Record<"initialRadius" | "finalRadius", number | undefined> = {
    initialRadius: undefined,
    finalRadius: undefined,
  };
  for (const field of ["initialRadius", "finalRadius"] as const) {
    const value = input[field];
    if (value === undefined) {
      errors.push({ field, code: "required", message: `'${field}' (km) is required.` });
      continue;
    }
    const error = checkPositiveNumber(field, value);
    if (error) errors.push(error);
    else radii[field] = value as number;
  }

  if (errors.length > 0 || mu === undefined || radii.initialRadius === undefined || radii.finalRadius === undefined) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: { body, mu, initialRadius: radii.initialRadius, finalRadius: radii.finalRadius },
  };
}
