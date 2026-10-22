import { Layout } from "@rjmlaird/ui";

export const BASE = "/julian-date";

export const Page = () => (
  <Layout
    title="Julian date and sidereal time"
    lede="Convert between UTC, Julian date, modified Julian date and Unix time, and get mean sidereal time at Greenwich or at a longitude of your choice."
    stylesheet={`${BASE}/style.css`}
    scriptSrc={`${BASE}/app.js`}
  >
    <section class="panel" aria-labelledby="conv-h">
      <h2 id="conv-h">Convert</h2>
      <form id="f" novalidate>
        <label for="kind">Convert from</label>
        <select id="kind">
          <option value="now">The current time</option>
          <option value="utc">UTC date and time (ISO 8601)</option>
          <option value="jd">Julian date</option>
          <option value="mjd">Modified Julian date</option>
          <option value="unix">Unix time (seconds)</option>
        </select>

        <label for="value">Value</label>
        <input id="value" autocomplete="off" autocapitalize="off" spellcheck={false} />

        <label for="lon">
          Longitude in degrees east <span class="opt">(optional, west is negative)</span>
        </label>
        <input id="lon" inputmode="decimal" autocomplete="off" placeholder="-1.13" />

        <button class="btn-primary" type="submit">
          Convert
        </button>
      </form>

      <p id="err" class="error" role="alert" tabindex={-1} hidden></p>
      <dl id="out" class="kv result" aria-live="polite"></dl>
    </section>

    <details>
      <summary>Use this as an API</summary>
      <pre id="api"></pre>
      <p>
        Send exactly one of <code>utc</code>, <code>jd</code>, <code>mjd</code>, <code>unix</code> or{" "}
        <code>now</code>, plus an optional <code>lon</code>. Encode <code>+</code> as <code>%2B</code> in UTC
        offsets.
      </p>
    </details>

    <details>
      <summary>Assumptions and limits</summary>
      <ul>
        <li>
          UTC is treated as 86,400 seconds per day, so leap seconds are ignored. Results are JD(UTC), not
          JD(TT).
        </li>
        <li>
          Sidereal time is mean sidereal time (no nutation), with UT1 approximated by UTC; the two differ by
          under 0.9 s.
        </li>
        <li>
          Dates before 1582-10-15 use the Julian calendar. Years run from -4712 to 9999, with 1 BC as year 0.
        </li>
        <li>Algorithms are from Meeus, Astronomical Algorithms, 2nd edition, chapters 7 and 12.</li>
      </ul>
    </details>
  </Layout>
);
