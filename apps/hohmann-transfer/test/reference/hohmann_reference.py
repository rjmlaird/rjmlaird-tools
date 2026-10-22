"""Independent reference values for the Hohmann tests.

Uses mpmath at 50 digits and the closed-form expressions below, which differ from the
vis-viva form used in src/orbital/hohmann.ts:

    v1  = sqrt(mu / r1)                v2  = sqrt(mu / r2)
    vt1 = v1 * sqrt(2 r2 / (r1 + r2))  vt2 = v2 * sqrt(2 r1 / (r1 + r2))
    dv1 = vt1 - v1                     dv2 = v2 - vt2        (signed: speed after - before)
    T   = pi * sqrt(a^3 / mu),  a = (r1 + r2) / 2

Run:  python3 test/reference/hohmann_reference.py
"""
import json
from mpmath import mp, mpf, sqrt, pi

mp.dps = 50

AU_KM = mpf("149597870.7")  # IAU 2012 B1: 149 597 870 700 m

CASES = {
    # Earth GM from JPL DE440; 300 km altitude over the 6378.137 km equatorial radius -> GEO.
    "earth_leo_to_geo": ("398600.435507", "6678.137", "42164.169"),
    "earth_geo_to_leo": ("398600.435507", "42164.169", "6678.137"),
    # Sun GM from JPL DE440; 1 au -> 1.523679 au (approximate Mars semi-major axis).
    "sun_earth_to_mars": ("132712440041.279419", str(AU_KM), str(AU_KM * mpf("1.523679"))),
}


def hohmann(mu, r1, r2):
    mu, r1, r2 = mpf(mu), mpf(r1), mpf(r2)
    a = (r1 + r2) / 2
    v1, v2 = sqrt(mu / r1), sqrt(mu / r2)
    vt1 = v1 * sqrt(2 * r2 / (r1 + r2))
    vt2 = v2 * sqrt(2 * r1 / (r1 + r2))
    s1, s2 = vt1 - v1, v2 - vt2
    t = pi * sqrt(a**3 / mu)
    f = lambda x: float(x)
    return {
        "mu": f(mu), "r1": f(r1), "r2": f(r2),
        "a": f(a), "v1": f(v1), "v2": f(v2), "vt1": f(vt1), "vt2": f(vt2),
        "signed1": f(s1), "signed2": f(s2), "total": f(abs(s1) + abs(s2)),
        "seconds": f(t), "hours": f(t / 3600), "days": f(t / 86400),
    }


if __name__ == "__main__":
    print(json.dumps({k: hohmann(*v) for k, v in CASES.items()}, indent=2))
