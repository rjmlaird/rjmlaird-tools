/** Observing and optics maths for amateur astronomy. All lengths in millimetres. */

export class InputError extends Error {}

export interface OpticsInput {
  /** Telescope aperture in mm. */
  aperture: number;
  /** Telescope focal length in mm. */
  focalLength: number;
  /** Eyepiece focal length in mm. */
  eyepiece?: number;
  /** Eyepiece apparent field of view in degrees (e.g. 52, 68, 82). */
  apparentFov?: number;
  /** Naked-eye limiting magnitude of your sky (about 6 for a dark rural sky, 4.5 in a town). */
  nelm?: number;
}

export interface OpticsResult {
  input: OpticsInput;
  focalRatio: number;
  /** Present only when an eyepiece focal length is given. */
  eyepieceResults?: {
    magnification: number;
    exitPupilMm: number;
    trueFovDeg?: number;
    trueFovArcmin?: number;
    exitPupilNote: string;
  };
  limits: {
    minMagnification: number;
    maxUsefulMagnification: number;
    lightGrasp: number;
    limitingMagnitude: number;
    dawesLimitArcsec: number;
    rayleighLimitArcsec: number;
  };
}

/** Pupil diameter of a fully dark-adapted eye, the reference for light grasp. */
const EYE_PUPIL_MM = 7;

function positive(name: string, v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) {
    throw new InputError(`${name} must be a number greater than zero`);
  }
  return v;
}

export function magnification(telescopeFocalLength: number, eyepieceFocalLength: number): number {
  return telescopeFocalLength / eyepieceFocalLength;
}

export function exitPupil(aperture: number, mag: number): number {
  return aperture / mag;
}

/** True field of view by the simple apparent FOV / magnification rule, in degrees. */
export function trueFov(apparentFovDeg: number, mag: number): number {
  return apparentFovDeg / mag;
}

/**
 * Faintest star visible in the telescope: NELM + 5·log10(D / 7 mm). Assumes a 7 mm eye pupil and a
 * dark-adapted observer and ignores transmission losses, so treat it as an optimistic upper bound.
 */
export function limitingMagnitude(aperture: number, nelm: number): number {
  return nelm + 5 * Math.log10(aperture / EYE_PUPIL_MM);
}

function exitPupilNote(mm: number): string {
  if (mm > 7) return "Larger than a dark-adapted eye pupil (about 7 mm), so some light is wasted.";
  if (mm >= 5) return "Wide-field range: bright, low power, good for large faint objects.";
  if (mm >= 2) return "General-purpose range: good for most deep-sky and planetary views.";
  if (mm >= 0.5) return "High-power range: best for planets, the Moon and double stars.";
  return "Below 0.5 mm: images will be dim and eye floaters become obvious.";
}

export function calculate(input: OpticsInput): OpticsResult {
  const aperture = positive("aperture", input.aperture);
  const focalLength = positive("focalLength", input.focalLength);
  const nelm = input.nelm ?? 6;
  if (typeof nelm !== "number" || !Number.isFinite(nelm) || nelm < 0 || nelm > 8) {
    throw new InputError("nelm must be a number between 0 and 8");
  }

  const result: OpticsResult = {
    input,
    focalRatio: focalLength / aperture,
    limits: {
      minMagnification: aperture / EYE_PUPIL_MM,
      maxUsefulMagnification: 2 * aperture,
      lightGrasp: (aperture / EYE_PUPIL_MM) ** 2,
      limitingMagnitude: limitingMagnitude(aperture, nelm),
      dawesLimitArcsec: 116 / aperture,
      rayleighLimitArcsec: 138 / aperture,
    },
  };

  if (input.eyepiece !== undefined) {
    const eyepiece = positive("eyepiece", input.eyepiece);
    const mag = magnification(focalLength, eyepiece);
    const ep = exitPupil(aperture, mag);
    result.eyepieceResults = { magnification: mag, exitPupilMm: ep, exitPupilNote: exitPupilNote(ep) };
    if (input.apparentFov !== undefined) {
      const afov = positive("apparentFov", input.apparentFov);
      if (afov >= 180) throw new InputError("apparentFov must be less than 180 degrees");
      const t = trueFov(afov, mag);
      result.eyepieceResults.trueFovDeg = t;
      result.eyepieceResults.trueFovArcmin = t * 60;
    }
  } else if (input.apparentFov !== undefined) {
    throw new InputError("apparentFov needs an eyepiece focal length");
  }
  return result;
}

/** Parse a query-string record into OpticsInput. Blank values are treated as absent. */
export function inputFromQuery(q: Record<string, string | undefined>): OpticsInput {
  const get = (k: string): number | undefined => {
    const raw = q[k];
    if (raw === undefined || raw.trim() === "") return undefined;
    const n = Number(raw);
    if (!Number.isFinite(n)) throw new InputError(`${k} must be a number`);
    return n;
  };
  const aperture = get("aperture");
  const focalLength = get("focalLength");
  if (aperture === undefined) throw new InputError("Missing required parameter: aperture");
  if (focalLength === undefined) throw new InputError("Missing required parameter: focalLength");
  return { aperture, focalLength, eyepiece: get("eyepiece"), apparentFov: get("apparentFov"), nelm: get("nelm") };
}
