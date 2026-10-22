# Hohmann transfer calculator

A small JSON API (TypeScript, Hono, Cloudflare Workers) for the delta-v budget and transfer
time of an **ideal two-impulse Hohmann transfer** between two circular, coplanar orbits around
the same central body.

## Model, assumptions and limitations

Modelled: one central body (described only by its standard gravitational parameter, mu), two
circular orbits in the same plane, instantaneous tangential impulses, and a half-ellipse
transfer.

**Not** modelled: launch windows, phasing or rendezvous timing, planetary ephemerides,
finite-duration burns, gravity losses, perturbations (J2, third bodies, drag, radiation
pressure), atmospheres, or inclination changes. Radii are not checked against a body's surface.
Results are idealised figures for this specific manoeuvre, not mission design numbers.

## Units

| Quantity | Unit |
|---|---|
| mu | km^3/s^2 |
| Orbit radii (from the body's centre) and semi-major axis | km |
| Speeds and delta-v | km/s |
| Transfer time | seconds, with hours and days also returned |

Numbers are returned at full double precision. Rounding is left to the client.

## Formulas

With r1 the initial radius and r2 the final radius:

- Transfer semi-major axis: `a = (r1 + r2) / 2`
- Circular speed: `v_c(r) = sqrt(mu / r)`
- Transfer-orbit speed (vis-viva): `v_t(r) = sqrt(mu * (2/r - 1/a))`
- Signed burn 1: `v_t(r1) - v_c(r1)`; signed burn 2: `v_c(r2) - v_t(r2)`
  (speed after minus speed before, so **positive = prograde**, negative = retrograde)
- Burn magnitudes are the absolute values; total delta-v is their sum
- Transfer time: `t = pi * sqrt(a^3 / mu)` (half the transfer ellipse's period)

`transferType` is `raise` (r2 > r1), `lower` (r2 < r1) or `none` (r2 = r1).

**Equal radii policy:** the request succeeds with `transferType: "none"`, zero delta-v for both
burns and zero transfer time, because no transfer is needed. (The half-period formula would give
half the orbit's period, which is not a transfer time.) Radii that differ by any amount, however
small, use the normal formulas.

## Setup

```bash
pnpm install
pnpm dev          # wrangler dev on http://localhost:8792
pnpm test         # Vitest, running inside the Workers runtime
pnpm typecheck
pnpm build        # wrangler deploy --dry-run --outdir dist
pnpm deploy
```

Requires Node 20+ and a Cloudflare account for deployment (`wrangler login`).

### Routing

`wrangler.toml` mounts the Worker under `tools.rjmlaird.co.uk/hohmann-transfer*` and sets
`BASE_PATH = "/hohmann-transfer"`. The Worker strips that prefix before routing, so the paths
below work both with and without it. For a dedicated hostname, remove `BASE_PATH` and use a
Custom Domain route (example in `wrangler.toml`).

## Endpoints

### `GET /health`

```json
{ "status": "ok" }
```

### `GET /api/v1/bodies`

Lists the built-in central bodies (`id`, `name`, `mu` in km^3/s^2, `source`).

### `POST /api/v1/hohmann`

`Content-Type: application/json`, body at most 4 KiB.

| Field | Type | Notes |
|---|---|---|
| `mu` | number, km^3/s^2 | Required unless `body` is given |
| `body` | string | One of the ids from `/api/v1/bodies`; use instead of `mu`, not with it |
| `initialRadius` | number, km | Required, > 0 |
| `finalRadius` | number, km | Required, > 0 |

Numbers must be JSON numbers (strings are rejected). Unknown fields are rejected.

```bash
curl -s -X POST http://localhost:8792/api/v1/hohmann \
  -H 'content-type: application/json' \
  -d '{"body":"earth","initialRadius":6678.137,"finalRadius":42164.169}'
```

```json
{
  "input": { "body": "earth", "mu": 398600.435507, "initialRadius": 6678.137, "finalRadius": 42164.169 },
  "units": { "mu": "km^3/s^2", "radius": "km", "speed": "km/s", "time": { "seconds": "s", "hours": "h", "days": "d" } },
  "transferType": "raise",
  "transferSemiMajorAxis": 24421.153,
  "circularSpeed": { "initial": 7.72576, "final": 3.07466 },
  "transferSpeed": { "atInitialRadius": 10.15149, "atFinalRadius": 1.60784 },
  "burns": {
    "first": { "deltaV": 2.42573, "signedDeltaV": 2.42573 },
    "second": { "deltaV": 1.46682, "signedDeltaV": 1.46682 }
  },
  "totalDeltaV": 3.89256,
  "transferTime": { "seconds": 18990.2, "hours": 5.27506, "days": 0.219794 }
}
```

(Shortened here for display; the API returns full precision.)

### Errors

All errors are JSON: `{ "error": { "code", "message", "fields"? } }`.

| Status | `code` | When |
|---|---|---|
| 400 | `invalid_json` | Body is not valid JSON (including bare `NaN`) |
| 405 | `method_not_allowed` | Wrong method on `/api/v1/hohmann` (`Allow: POST`) |
| 413 | `payload_too_large` | Body over 4 KiB |
| 415 | `unsupported_media_type` | Not `application/json` |
| 422 | `validation_error` | Field problems; `fields` lists each as `{ field, code, message }` |
| 422 | `result_not_representable` | Inputs are valid but the result overflows a double |
| 404 / 500 | `not_found` / `internal_error` | Unknown path / unexpected failure |

Field `code` values: `required`, `invalid_type`, `not_finite`, `not_positive`, `unknown_field`,
`conflict` (both `mu` and `body`), `unknown_body`. A request with several problems reports all
of them. `1e999` parses to infinity and is reported as `not_finite`.

## Layout

```
src/orbital/hohmann.ts     pure calculation, no framework imports
src/data/bodies.ts         mu constants with units and sources
src/routes/validation.ts   request validation
src/routes/hohmann.ts      HTTP handling and response formatting
src/routes/errors.ts       error types and body shape
src/app.ts                 Hono app
src/index.ts               Worker entry (base-path handling)
test/                      unit tests, validation tests, Worker-level API tests
test/reference/            independent reference calculation (Python + mpmath)
```

## Tests and references

- `test/reference/hohmann_reference.py` computes reference values with mpmath at 50 digits using
  closed-form expressions that differ from the production vis-viva form. The numbers in
  `test/hohmann.test.ts` are its output (run it to reproduce them).
- Cases: LEO (300 km) to GEO raising, GEO to LEO lowering, and a heliocentric Earth-Mars
  transfer. The Earth-Mars case is also checked loosely against the commonly quoted ~259 days
  and ~2.9 / ~2.6 km/s, which are rounded textbook figures, not a precise source.
- Unit handling, equal radii, invalid input and API shapes are covered separately.

## Data sources

mu values are best-estimate figures as published by JPL, retrieved 2026-10-12, and are **not**
authoritative constants. See `src/data/bodies.ts` for the exact values and links:

- Sun, Mercury, Venus, Earth, Moon, Mars: JPL Solar System Dynamics, Astrodynamic Parameters
  (DE440), https://ssd.jpl.nasa.gov/astro_par.html. Mars is the Mars-system value.
- Jupiter, Saturn, Uranus, Neptune: planet-only GM from JPL's planetary satellite physical
  parameters, https://ssd.jpl.nasa.gov/sats/phys_par/sep.html.

For any other body pass `mu` directly.

## CORS

Not enabled. The API is intended to be called server-side or from a page served from the same
origin. If a browser client on another origin needs it, add Hono's `cors()` middleware for
that origin only.

## Test-runner note

Tests use `@cloudflare/vitest-pool-workers` 0.12, the last release supporting Vitest 3.x (and so
Vite 5). That package has been renamed `@cloudflare/vitest-plugin`; newer releases need Vitest 4
and Vite 6 or later.
