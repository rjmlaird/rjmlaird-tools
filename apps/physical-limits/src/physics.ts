/** Physical constants (SI). */
export const G = 6.6743e-11; // m^3 kg^-1 s^-2
export const C = 299_792_458; // m/s

/** Escape velocity from distance `radiusM` of a body of mass `massKg`: sqrt(2GM/r). */
export function escapeVelocity(massKg: number, radiusM: number) {
  const velocityMS = Math.sqrt((2 * G * massKg) / radiusM);
  return {
    velocityMS,
    velocityKmS: velocityMS / 1000,
    fractionOfLightSpeed: velocityMS / C,
    exceedsLightSpeed: velocityMS >= C,
  };
}

/**
 * Hill sphere radius of a secondary body orbiting a primary:
 * r_H ≈ a (1 - e) * cbrt(m / 3M). An approximation valid for m << M.
 */
export function hillSphere(
  primaryMassKg: number,
  secondaryMassKg: number,
  semiMajorAxisM: number,
  eccentricity = 0,
) {
  const radiusM =
    semiMajorAxisM * (1 - eccentricity) * Math.cbrt(secondaryMassKg / (3 * primaryMassKg));
  return { radiusM, radiusKm: radiusM / 1000 };
}

/**
 * Roche limit for a satellite held together by gravity alone, orbiting a primary.
 * Rigid satellite: d ≈ 1.26 R (ρM/ρm)^(1/3). Fluid satellite: d ≈ 2.44 R (ρM/ρm)^(1/3).
 * R is the primary's radius; densities are in kg/m^3.
 */
export function rocheLimit(primaryMassKg: number, primaryRadiusM: number, satelliteDensity: number) {
  const primaryDensity = primaryMassKg / ((4 / 3) * Math.PI * primaryRadiusM ** 3);
  const scale = primaryRadiusM * Math.cbrt(primaryDensity / satelliteDensity);
  const rigidM = 1.26 * scale;
  const fluidM = 2.44 * scale;
  return {
    primaryDensityKgM3: primaryDensity,
    rigidM,
    rigidKm: rigidM / 1000,
    fluidM,
    fluidKm: fluidM / 1000,
  };
}

/** Schwarzschild radius: r_s = 2GM/c^2. */
export function schwarzschildRadius(massKg: number) {
  const radiusM = (2 * G * massKg) / (C * C);
  return { radiusM, radiusKm: radiusM / 1000 };
}
