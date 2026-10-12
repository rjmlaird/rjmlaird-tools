import React, { useState, useMemo } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell } from "recharts";
import { Plus, Trash2, Download, FileText, LayoutDashboard, Leaf } from "lucide-react";

// ---- UK conversion factors (illustrative, approximate DEFRA-style kg CO2e per unit) ----
const FACTORS = {
  1: [
    { key: "gas_kwh", label: "Natural gas (kWh, gross CV)", unit: "kWh", factor: 0.18293 },
    { key: "diesel_l", label: "Gas oil / diesel (litres) — owned vehicles", unit: "litres", factor: 2.66927 },
    { key: "petrol_l", label: "Petrol (litres) — owned vehicles", unit: "litres", factor: 2.16561 },
    { key: "lpg_l", label: "LPG (litres) — heating/fleet", unit: "litres", factor: 1.55713 },
    { key: "burning_oil_l", label: "Burning oil / kerosene (litres)", unit: "litres", factor: 2.54104 },
    { key: "refrigerant_kg", label: "Refrigerant loss, R-410A (kg)", unit: "kg", factor: 2088 },
  ],
  2: [
    { key: "elec_kwh_lb", label: "Grid electricity, location-based (kWh)", unit: "kWh", factor: 0.20705 },
    { key: "elec_kwh_mb", label: "Grid electricity, market-based (kWh)", unit: "kWh", factor: 0.0 },
    { key: "heat_steam_kwh", label: "Purchased heat / steam (kWh)", unit: "kWh", factor: 0.171 },
  ],
  // The 5 Scope 3 categories PPN 006 requires as a minimum (numbered per the GHG Protocol's
  // 15-category scheme, matching the PPN 006 technical standard table).
  3: [
    { key: "upstream_road_tkm", label: "Upstream freight — road, laden avg (tonne.km)", unit: "tonne.km", factor: 0.1064, group: "upstream_transport" },
    { key: "upstream_sea_tkm", label: "Upstream freight — sea/container (tonne.km)", unit: "tonne.km", factor: 0.01167, group: "upstream_transport" },
    { key: "waste_landfill_t", label: "General waste to landfill (tonnes)", unit: "tonnes", factor: 467.05, group: "waste" },
    { key: "waste_recycled_t", label: "Waste — mixed recycling (tonnes)", unit: "tonnes", factor: 21.28, group: "waste" },
    { key: "waste_combustion_t", label: "Waste — combustion / energy recovery (tonnes)", unit: "tonnes", factor: 21.39, group: "waste" },
    { key: "car_business_km", label: "Car — unknown fuel/size, average (km)", unit: "km", factor: 0.1702, group: "business_travel", mode: "car" },
    { key: "car_petrol_small_business_km", label: "Car — petrol, small (≤1.7L) (km)", unit: "km", factor: 0.17987, group: "business_travel", mode: "car" },
    { key: "car_petrol_medium_business_km", label: "Car — petrol, medium (1.7–2.0L) (km)", unit: "km", factor: 0.22768, group: "business_travel", mode: "car" },
    { key: "car_petrol_large_business_km", label: "Car — petrol, large (2.0L+) (km)", unit: "km", factor: 0.34796, group: "business_travel", mode: "car" },
    { key: "car_diesel_small_business_km", label: "Car — diesel, small (≤1.4L) (km)", unit: "km", factor: 0.17323, group: "business_travel", mode: "car" },
    { key: "car_diesel_medium_business_km", label: "Car — diesel, medium (1.7–2.0L) (km)", unit: "km", factor: 0.20795, group: "business_travel", mode: "car" },
    { key: "car_diesel_large_business_km", label: "Car — diesel, large (2.0L+) (km)", unit: "km", factor: 0.25959, group: "business_travel", mode: "car" },
    { key: "car_hybrid_business_km", label: "Car — hybrid, average (km)", unit: "km", factor: 0.15007, group: "business_travel", mode: "car" },
    { key: "car_electric_business_km", label: "Car — electric, average (km)", unit: "km", factor: 0.06695, group: "business_travel", mode: "car" },
    { key: "car_lpg_business_km", label: "Car — LPG, average (km)", unit: "km", factor: 0.22043, group: "business_travel", mode: "car" },
    { key: "motorbike_business_km", label: "Motorbike, average (km)", unit: "km", factor: 0.14324, group: "business_travel", mode: "motorbike" },
    { key: "rail_business_km", label: "Rail — UK national rail (km)", unit: "km", factor: 0.04443, group: "business_travel", mode: "rail" },
    { key: "rail_international_business_km", label: "Rail — international rail (km)", unit: "km", factor: 0.00563, group: "business_travel", mode: "rail" },
    { key: "underground_business_km", label: "Rail — underground/metro (km)", unit: "km", factor: 0.03508, group: "business_travel", mode: "rail" },
    { key: "light_rail_business_km", label: "Rail — light rail/tram (km)", unit: "km", factor: 0.03609, group: "business_travel", mode: "rail" },
    { key: "flight_domestic_business_km", label: "Flight — domestic (km)", unit: "km", factor: 0.30608, group: "business_travel", mode: "flight" },
    { key: "flight_short_economy_business_km", label: "Flight — short-haul, economy (km)", unit: "km", factor: 0.20536, group: "business_travel", mode: "flight" },
    { key: "flight_short_business_km", label: "Flight — short-haul, business class (km)", unit: "km", factor: 0.30803, group: "business_travel", mode: "flight" },
    { key: "flight_long_economy_business_km", label: "Flight — long-haul, economy (km)", unit: "km", factor: 0.22472, group: "business_travel", mode: "flight" },
    { key: "flight_long_premium_business_km", label: "Flight — long-haul, premium economy (km)", unit: "km", factor: 0.35953, group: "business_travel", mode: "flight" },
    { key: "flight_long_business_business_km", label: "Flight — long-haul, business class (km)", unit: "km", factor: 0.65166, group: "business_travel", mode: "flight" },
    { key: "taxi_business_km", label: "Taxi — regular (km)", unit: "km", factor: 0.25982, group: "business_travel", mode: "taxi" },
    { key: "taxi_black_cab_business_km", label: "Taxi — black cab (km)", unit: "km", factor: 0.38238, group: "business_travel", mode: "taxi" },
    { key: "ferry_business_km", label: "Ferry — passenger (km)", unit: "km", factor: 0.13825, group: "business_travel", mode: "ferry" },
    { key: "car_commute_km", label: "Car — unknown fuel/size, average (km)", unit: "km", factor: 0.1702, group: "commuting", mode: "car" },
    { key: "car_petrol_small_commute_km", label: "Car — petrol, small (≤1.7L) (km)", unit: "km", factor: 0.17987, group: "commuting", mode: "car" },
    { key: "car_petrol_medium_commute_km", label: "Car — petrol, medium (1.7–2.0L) (km)", unit: "km", factor: 0.22768, group: "commuting", mode: "car" },
    { key: "car_petrol_large_commute_km", label: "Car — petrol, large (2.0L+) (km)", unit: "km", factor: 0.34796, group: "commuting", mode: "car" },
    { key: "car_diesel_small_commute_km", label: "Car — diesel, small (≤1.4L) (km)", unit: "km", factor: 0.17323, group: "commuting", mode: "car" },
    { key: "car_diesel_medium_commute_km", label: "Car — diesel, medium (1.7–2.0L) (km)", unit: "km", factor: 0.20795, group: "commuting", mode: "car" },
    { key: "car_diesel_large_commute_km", label: "Car — diesel, large (2.0L+) (km)", unit: "km", factor: 0.25959, group: "commuting", mode: "car" },
    { key: "car_hybrid_commute_km", label: "Car — hybrid, average (km)", unit: "km", factor: 0.15007, group: "commuting", mode: "car" },
    { key: "car_electric_commute_km", label: "Car — electric, average (km)", unit: "km", factor: 0.06695, group: "commuting", mode: "car" },
    { key: "motorbike_commute_km", label: "Motorbike, average (km)", unit: "km", factor: 0.14324, group: "commuting", mode: "motorbike" },
    { key: "rail_commute_km", label: "Rail — UK national rail (km)", unit: "km", factor: 0.04443, group: "commuting", mode: "rail" },
    { key: "underground_commute_km", label: "Rail — underground/metro (km)", unit: "km", factor: 0.03508, group: "commuting", mode: "rail" },
    { key: "light_rail_commute_km", label: "Rail — light rail/tram (km)", unit: "km", factor: 0.03609, group: "commuting", mode: "rail" },
    { key: "bus_commute_km", label: "Bus — local, average (km)", unit: "km", factor: 0.12708, group: "commuting", mode: "bus" },
    { key: "coach_commute_km", label: "Coach (km)", unit: "km", factor: 0.03374, group: "commuting", mode: "bus" },
    { key: "wfh_days", label: "Home-working (employee-days)", unit: "days", factor: 0.68, group: "commuting", mode: "other" },
    { key: "downstream_road_tkm", label: "Downstream freight — road, laden avg (tonne.km)", unit: "tonne.km", factor: 0.1064, group: "downstream_transport" },
    { key: "downstream_sea_tkm", label: "Downstream freight — sea/container (tonne.km)", unit: "tonne.km", factor: 0.01167, group: "downstream_transport" },
  ],
};
const ALL_CATS = {
  ...Object.fromEntries(FACTORS[1].map(f => [f.key, { ...f, scope: 1 }])),
  ...Object.fromEntries(FACTORS[2].map(f => [f.key, { ...f, scope: 2 }])),
  ...Object.fromEntries(FACTORS[3].map(f => [f.key, { ...f, scope: 3 }])),
};

// Plain-language definitions shown to viewers alongside the breakdown calculation
const SCOPE_INFO = {
  1: {
    label: "Scope 1",
    title: "Direct emissions",
    description: "Emissions from sources the organisation owns or controls directly — for example, burning fuel in a fleet of vehicles that aren't electrically powered, or gas heating at owned sites.",
    color: "#28402E",
  },
  2: {
    label: "Scope 2",
    title: "Indirect energy emissions",
    description: "Emissions caused indirectly, from the production of energy the organisation purchases and uses — for example, the emissions released generating the electricity used in its buildings.",
    color: "#8FBF8F",
  },
  3: {
    label: "Scope 3",
    title: "Other indirect emissions (PPN 006 subset)",
    description: "Emissions in the wider value chain that PPN 006 requires as a minimum: upstream & downstream transport, waste, business travel and employee commuting. Scope 3 is often 80%+ of an organisation's true footprint, but a CRP only needs these five categories.",
    color: "#C99A2E",
  },
};

// The 5 mandatory Scope 3 categories, numbered as in the GHG Protocol / PPN 006 technical standard table
const SCOPE3_GROUPS = {
  upstream_transport: { num: 4, label: "Upstream transportation & distribution", description: "Transport and distribution of goods purchased by the organisation, between suppliers and its own operations, in vehicles it doesn't own or control." },
  waste: { num: 5, label: "Waste generated in operations", description: "Disposal and treatment of waste generated by the organisation's own operations, handled by third-party waste contractors." },
  business_travel: { num: 6, label: "Business travel", description: "Employee travel for business purposes in vehicles not owned or operated by the organisation — rail, flights, taxis, and personal cars used on expenses." },
  commuting: { num: 7, label: "Employee commuting", description: "Employees' travel between home and their normal workplace, in vehicles not owned or operated by the organisation." },
  downstream_transport: { num: 9, label: "Downstream transportation & distribution", description: "Transport and distribution of the organisation's products after they leave its operations, where not already paid for and included upstream." },
};
const SCOPE3_GROUP_ORDER = ["upstream_transport", "waste", "business_travel", "commuting", "downstream_transport"];

const uid = () => Math.random().toString(36).slice(2, 10);
const thisYear = new Date().getFullYear();
const fmt = (n, d = 1) => Number(n).toLocaleString("en-GB", { maximumFractionDigits: d, minimumFractionDigits: d });

const emptyEntry = (year) => ({ id: uid(), year, scope: 1, category: "gas_kwh", quantity: "" });

export default function CarbonReductionPlanTool() {
  const [view, setView] = useState("dashboard"); // dashboard | plan
  const [orgName, setOrgName] = useState("Green Orbit Digital");
  const [baselineYear, setBaselineYear] = useState(thisYear - 1);
  const [targetPct, setTargetPct] = useState(10); // % reduction per contract year
  const [planPeriodYears, setPlanPeriodYears] = useState(5);
  const [supplierNetZeroYear, setSupplierNetZeroYear] = useState(2040);
  const [govNetZeroYear] = useState(2050);
  const [measures, setMeasures] = useState([
    "Switch remaining gas heating to air-source heat pumps at owned premises.",
    "Move company fleet to fully electric vehicles as leases expire.",
    "Procure REGO-backed renewable electricity tariff for all sites.",
    "Introduce cycle-to-work scheme and reduce non-essential business travel.",
  ]);
  const [entries, setEntries] = useState([
    { id: uid(), year: baselineYear, scope: 2, category: "elec_kwh_lb", quantity: "18400" },
    { id: uid(), year: baselineYear, scope: 1, category: "gas_kwh", quantity: "9200" },
    { id: uid(), year: baselineYear, scope: 3, category: "car_business_km", quantity: "3200" },
    { id: uid(), year: baselineYear, scope: 3, category: "car_commute_km", quantity: "21000" },
    { id: uid(), year: baselineYear, scope: 3, category: "waste_landfill_t", quantity: "1.2" },
    { id: uid(), year: thisYear, scope: 2, category: "elec_kwh_lb", quantity: "16100" },
    { id: uid(), year: thisYear, scope: 1, category: "gas_kwh", quantity: "7800" },
    { id: uid(), year: thisYear, scope: 3, category: "car_business_km", quantity: "2600" },
    { id: uid(), year: thisYear, scope: 3, category: "car_commute_km", quantity: "17800" },
    { id: uid(), year: thisYear, scope: 3, category: "waste_landfill_t", quantity: "0.9" },
  ]);

  const updateEntry = (id, patch) => setEntries(es => es.map(e => e.id === id ? { ...e, ...patch } : e));
  const removeEntry = (id) => setEntries(es => es.filter(e => e.id !== id));
  const addEntry = () => setEntries(es => [...es, emptyEntry(thisYear)]);
  const addTravelEntry = (patch) => setEntries(es => [...es, { id: uid(), ...patch }]);

  // computed emissions per entry
  const enriched = useMemo(() => entries.map(e => {
    const cat = ALL_CATS[e.category];
    const qty = parseFloat(e.quantity) || 0;
    const kg = qty * (cat?.factor || 0);
    return { ...e, catLabel: cat?.label || "—", unit: cat?.unit || "", qty, tco2e: kg / 1000 };
  }), [entries]);

  const years = useMemo(() => Array.from(new Set(enriched.map(e => e.year))).sort((a, b) => a - b), [enriched]);

  // Sums raw quantity (in each category's native unit — kWh, litres, kg) plus tCO2e
  // for a given scope's rows, per individual source category. Every category from
  // FACTORS[scope] is included even at zero, so the breakdown UI can show the full
  // set of expected bill types (e.g. gas + electricity) rather than only ones in use.
  const byCategoryForScope = (rows, scope) => Object.fromEntries(
    FACTORS[scope].map(f => {
      const catRows = rows.filter(r => r.category === f.key);
      return [f.key, {
        quantity: catRows.reduce((s, r) => s + r.qty, 0),
        unit: f.unit,
        label: f.label,
        tco2e: catRows.reduce((s, r) => s + r.tco2e, 0),
      }];
    })
  );

  const byYear = useMemo(() => years.map(y => {
    const rows = enriched.filter(e => e.year === y);
    const scope1Rows = rows.filter(r => r.scope === 1);
    const scope2Rows = rows.filter(r => r.scope === 2);
    const scope1ByCategory = byCategoryForScope(scope1Rows, 1);
    const scope2ByCategory = byCategoryForScope(scope2Rows, 2);
    const scope1 = scope1Rows.reduce((s, r) => s + r.tco2e, 0);
    const scope2 = scope2Rows.reduce((s, r) => s + r.tco2e, 0);
    const scope3Rows = rows.filter(r => r.scope === 3);
    const scope3 = scope3Rows.reduce((s, r) => s + r.tco2e, 0);
    const scope3ByGroup = Object.fromEntries(SCOPE3_GROUP_ORDER.map(g => [
      g,
      scope3Rows.filter(r => ALL_CATS[r.category]?.group === g).reduce((s, r) => s + r.tco2e, 0),
    ]));
    return { year: y, scope1, scope2, scope3, scope1ByCategory, scope2ByCategory, scope3ByGroup, total: scope1 + scope2 + scope3 };
  }), [years, enriched]);

  const emptyScope3ByGroup = Object.fromEntries(SCOPE3_GROUP_ORDER.map(g => [g, 0]));
  const emptyScope1ByCategory = byCategoryForScope([], 1);
  const emptyScope2ByCategory = byCategoryForScope([], 2);
  const baseline = byYear.find(y => y.year === baselineYear) || {
    total: 0, scope1: 0, scope2: 0, scope3: 0,
    scope1ByCategory: emptyScope1ByCategory, scope2ByCategory: emptyScope2ByCategory, scope3ByGroup: emptyScope3ByGroup,
  };

  const trajectory = useMemo(() => {
    const out = [];
    for (let i = 0; i <= planPeriodYears; i++) {
      const y = baselineYear + i;
      const target = baseline.total * Math.pow(1 - targetPct / 100, i);
      const actualRow = byYear.find(b => b.year === y);
      out.push({ year: y, target: Number(target.toFixed(2)), actual: actualRow ? Number(actualRow.total.toFixed(2)) : null });
    }
    return out;
  }, [baselineYear, planPeriodYears, targetPct, baseline.total, byYear]);

  const latest = byYear[byYear.length - 1];
  const pctChangeFromBaseline = latest && baseline.total ? ((latest.total - baseline.total) / baseline.total) * 100 : null;

  const handlePrint = () => { setView("plan"); setTimeout(() => window.print(), 150); };

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif", background: "#EDEFE7", minHeight: "100vh", color: "#16241B" }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only-plan { display: block !important; }
          body, .app-bg { background: white !important; }
          .plan-page { box-shadow: none !important; margin: 0 !important; }
        }
        .mono { font-family: 'IBM Plex Mono', 'Courier New', monospace; }
        input, select { font-family: inherit; }
        table.entries th, table.entries td { padding: 8px 10px; }
      `}</style>

      {/* Top nav */}
      <div className="no-print" style={{ background: "#16241B", color: "#EDEFE7", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Leaf size={22} color="#8FBF8F" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: 0.3 }}>Scope 1, 2 &amp; 3 Emissions Lab</div>
            <div style={{ fontSize: 12, opacity: 0.65 }}>Carbon Reduction Plan builder — PPN 006 (06/21) aligned</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setView("dashboard")} style={navBtn(view === "dashboard")}>
            <LayoutDashboard size={15} style={{ marginRight: 6, verticalAlign: -3 }} />Dashboard
          </button>
          <button onClick={() => setView("plan")} style={navBtn(view === "plan")}>
            <FileText size={15} style={{ marginRight: 6, verticalAlign: -3 }} />Carbon Reduction Plan
          </button>
          <button onClick={handlePrint} style={{ ...navBtn(false), background: "#8FBF8F", color: "#16241B", fontWeight: 600 }}>
            <Download size={15} style={{ marginRight: 6, verticalAlign: -3 }} />Export PDF
          </button>
        </div>
      </div>

      {view === "dashboard" ? (
        <Dashboard
          orgName={orgName} setOrgName={setOrgName}
          baselineYear={baselineYear} setBaselineYear={setBaselineYear}
          targetPct={targetPct} setTargetPct={setTargetPct}
          planPeriodYears={planPeriodYears} setPlanPeriodYears={setPlanPeriodYears}
          entries={enriched} updateEntry={updateEntry} removeEntry={removeEntry} addEntry={addEntry} addTravelEntry={addTravelEntry} thisYear={thisYear}
          byYear={byYear} trajectory={trajectory} baseline={baseline} latest={latest} pctChangeFromBaseline={pctChangeFromBaseline}
        />
      ) : (
        <PlanDocument
          orgName={orgName} baselineYear={baselineYear} targetPct={targetPct} planPeriodYears={planPeriodYears}
          supplierNetZeroYear={supplierNetZeroYear} setSupplierNetZeroYear={setSupplierNetZeroYear} govNetZeroYear={govNetZeroYear}
          byYear={byYear} baseline={baseline} latest={latest} trajectory={trajectory}
          measures={measures} setMeasures={setMeasures}
        />
      )}
    </div>
  );
}

function navBtn(active) {
  return {
    background: active ? "#28402E" : "transparent",
    color: "#EDEFE7", border: "1px solid rgba(237,239,231,0.25)", borderRadius: 6,
    padding: "8px 14px", fontSize: 13, cursor: "pointer",
  };
}

function Card({ children, style }) {
  return <div style={{ background: "#FBFBF7", border: "1px solid #D8DBCB", borderRadius: 10, padding: 18, ...style }}>{children}</div>;
}

function Dashboard(props) {
  const { orgName, setOrgName, baselineYear, setBaselineYear, targetPct, setTargetPct, planPeriodYears, setPlanPeriodYears,
    entries, updateEntry, removeEntry, addEntry, addTravelEntry, thisYear, byYear, trajectory, baseline, latest, pctChangeFromBaseline } = props;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 60px" }}>
      <div className="no-print" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 14, marginBottom: 20 }}>
        <Card>
          <Label>Organisation</Label>
          <input value={orgName} onChange={e => setOrgName(e.target.value)} style={inputStyle} />
        </Card>
        <Card>
          <Label>Baseline year</Label>
          <input type="number" value={baselineYear} onChange={e => setBaselineYear(Number(e.target.value))} style={inputStyle} />
        </Card>
        <Card>
          <Label>Annual reduction target (ERT %)</Label>
          <input type="number" value={targetPct} onChange={e => setTargetPct(Number(e.target.value))} style={inputStyle} />
        </Card>
        <Card>
          <Label>Plan period (years)</Label>
          <input type="number" value={planPeriodYears} onChange={e => setPlanPeriodYears(Number(e.target.value))} style={inputStyle} />
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard label="Baseline emissions" value={`${fmt(baseline.total)} tCO2e`} sub={`Year ${baselineYear}`} />
        <StatCard label="Latest reported emissions" value={latest ? `${fmt(latest.total)} tCO2e` : "—"} sub={latest ? `Year ${latest.year}` : "No data"} />
        <StatCard label="Change vs baseline" value={pctChangeFromBaseline !== null ? `${pctChangeFromBaseline > 0 ? "+" : ""}${fmt(pctChangeFromBaseline)}%` : "—"}
          sub={pctChangeFromBaseline !== null ? (pctChangeFromBaseline < 0 ? "Reducing ✓" : "Above baseline") : ""}
          accent={pctChangeFromBaseline !== null && pctChangeFromBaseline < 0 ? "#2F6D3B" : "#B5482A"} />
      </div>

      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>Actual emissions vs Emissions Reduction Target trajectory</div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={trajectory} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#D8DBCB" />
            <XAxis dataKey="year" stroke="#16241B" />
            <YAxis stroke="#16241B" label={{ value: "tCO2e", angle: -90, position: "insideLeft" }} />
            <Tooltip formatter={(v) => `${fmt(v)} tCO2e`} />
            <Legend />
            <Line type="monotone" dataKey="target" name="ERT trajectory" stroke="#2F6D3B" strokeDasharray="6 4" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="actual" name="Actual" stroke="#B5482A" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>Emissions by scope, per year</div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={byYear} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#D8DBCB" />
            <XAxis dataKey="year" stroke="#16241B" />
            <YAxis stroke="#16241B" label={{ value: "tCO2e", angle: -90, position: "insideLeft" }} />
            <Tooltip formatter={(v) => `${fmt(v)} tCO2e`} />
            <Legend />
            <Bar dataKey="scope1" name="Scope 1" stackId="a" fill="#28402E" />
            <Bar dataKey="scope2" name="Scope 2" stackId="a" fill="#8FBF8F" />
            <Bar dataKey="scope3" name="Scope 3" stackId="a" fill="#C99A2E" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <ScopeBreakdownCard byYear={byYear} />

      <TravelCalculator addTravelEntry={addTravelEntry} thisYear={thisYear} />

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Activity data log</div>
          <button onClick={addEntry} style={addBtn}><Plus size={14} style={{ marginRight: 4, verticalAlign: -2 }} />Add entry</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="entries" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #D8DBCB", color: "#4A5A45" }}>
                <th>Year</th><th>Scope</th><th>Category</th><th>Quantity</th><th>Unit</th><th>tCO2e</th><th></th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} style={{ borderBottom: "1px solid #EEF0E7" }}>
                  <td><input type="number" value={e.year} onChange={ev => updateEntry(e.id, { year: Number(ev.target.value) })} style={cellInput} /></td>
                  <td>
                    <select value={e.scope} onChange={ev => {
                      const scope = Number(ev.target.value);
                      updateEntry(e.id, { scope, category: FACTORS[scope][0].key });
                    }} style={cellInput}>
                      <option value={1}>Scope 1</option>
                      <option value={2}>Scope 2</option>
                      <option value={3}>Scope 3</option>
                    </select>
                  </td>
                  <td>
                    <select value={e.category} onChange={ev => updateEntry(e.id, { category: ev.target.value })} style={{ ...cellInput, minWidth: 240 }}>
                      {e.scope === 3
                        ? SCOPE3_GROUP_ORDER.map(g => (
                          <optgroup key={g} label={`Cat ${SCOPE3_GROUPS[g].num} — ${SCOPE3_GROUPS[g].label}`}>
                            {FACTORS[3].filter(f => f.group === g).map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                          </optgroup>
                        ))
                        : FACTORS[e.scope].map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </select>
                  </td>
                  <td><input type="number" value={e.quantity} onChange={ev => updateEntry(e.id, { quantity: ev.target.value })} style={{ ...cellInput, width: 100 }} /></td>
                  <td className="mono" style={{ color: "#4A5A45" }}>{e.unit}</td>
                  <td className="mono" style={{ fontWeight: 600 }}>{fmt(e.tco2e, 3)}</td>
                  <td><button onClick={() => removeEntry(e.id)} style={trashBtn}><Trash2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 11, color: "#6B7A66", marginTop: 10 }}>
          Conversion factors are illustrative UK-average figures for demonstration. Replace with the latest DEFRA/BEIS GHG Conversion Factors for Company Reporting (or your verified supplier-specific factors) before formal submission.
        </div>
      </Card>
    </div>
  );
}

const TRAVEL_MODES = [
  { key: "car", label: "Car" },
  { key: "flight", label: "Flight" },
  { key: "rail", label: "Rail" },
  { key: "taxi", label: "Taxi" },
  { key: "bus", label: "Bus / coach" },
  { key: "motorbike", label: "Motorbike" },
  { key: "ferry", label: "Ferry" },
];
const TRAVEL_PURPOSES = [
  { key: "business_travel", label: "Business travel (Cat 6)" },
  { key: "commuting", label: "Employee commuting (Cat 7)" },
];

function TravelCalculator({ addTravelEntry, thisYear }) {
  const [purpose, setPurpose] = useState("business_travel");
  const [mode, setMode] = useState("car");
  const availableModes = TRAVEL_MODES.filter(m => FACTORS[3].some(f => f.group === purpose && f.mode === m.key));
  const options = FACTORS[3].filter(f => f.group === purpose && f.mode === mode);
  const [category, setCategory] = useState(options[0]?.key || "");
  const activeCategory = options.some(o => o.key === category) ? category : options[0]?.key;
  const [distanceKm, setDistanceKm] = useState("");
  const [roundTrip, setRoundTrip] = useState(false);
  const [trips, setTrips] = useState(1);
  const [year, setYear] = useState(thisYear);
  const [justAdded, setJustAdded] = useState(false);

  const onPurposeChange = (p) => {
    setPurpose(p);
    const first = TRAVEL_MODES.find(m => FACTORS[3].some(f => f.group === p && f.mode === m.key));
    setMode(first?.key || "car");
  };
  const onModeChange = (m) => {
    setMode(m);
    const first = FACTORS[3].find(f => f.group === purpose && f.mode === m);
    setCategory(first?.key || "");
  };

  const cat = ALL_CATS[activeCategory];
  const legKm = parseFloat(distanceKm) || 0;
  const tripCount = parseInt(trips, 10) || 1;
  const totalKm = legKm * (roundTrip ? 2 : 1) * tripCount;
  const tco2e = totalKm * (cat?.factor || 0) / 1000;

  const handleAdd = () => {
    if (!activeCategory || totalKm <= 0) return;
    addTravelEntry({ year, scope: 3, category: activeCategory, quantity: String(totalKm) });
    setDistanceKm("");
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  };

  return (
    <Card style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Travel emissions calculator</div>
      <div style={{ fontSize: 12.5, color: "#6B7A66", marginBottom: 14 }}>
        Forecast emissions for a flight, rail journey, or car/taxi trip, then add it straight to the activity data log against the right Scope 3 category.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 10, marginBottom: 12 }}>
        <div>
          <Label>Purpose</Label>
          <select value={purpose} onChange={e => onPurposeChange(e.target.value)} style={inputStyle}>
            {TRAVEL_PURPOSES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <Label>Mode</Label>
          <select value={mode} onChange={e => onModeChange(e.target.value)} style={inputStyle}>
            {availableModes.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <Label>{mode === "car" ? "Fuel type & size" : mode === "flight" ? "Haul & cabin class" : mode === "rail" ? "Rail type" : "Type"}</Label>
          <select value={activeCategory || ""} onChange={e => setCategory(e.target.value)} style={inputStyle}>
            {options.map(o => <option key={o.key} value={o.key}>{o.label.replace(/^[A-Za-z /]+— /, "")}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: 10, marginBottom: 14 }}>
        <div>
          <Label>Distance, one-way (km)</Label>
          <input type="number" value={distanceKm} onChange={e => setDistanceKm(e.target.value)} style={inputStyle} placeholder="e.g. 340" />
        </div>
        <div>
          <Label>Trips</Label>
          <input type="number" min={1} value={trips} onChange={e => setTrips(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <Label>Year</Label>
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={inputStyle} />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 9 }}>
          <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input type="checkbox" checked={roundTrip} onChange={e => setRoundTrip(e.target.checked)} />
            Round trip
          </label>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F3F5EC", border: "1px solid #D8DBCB", borderRadius: 8, padding: "12px 16px", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: "#6B7A66", textTransform: "uppercase", letterSpacing: 0.4 }}>Total distance</div>
          <div className="mono" style={{ fontSize: 15, fontWeight: 700 }}>{fmt(totalKm, 0)} km</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#6B7A66", textTransform: "uppercase", letterSpacing: 0.4 }}>Estimated emissions</div>
          <div className="mono" style={{ fontSize: 15, fontWeight: 700 }}>{fmt(tco2e, 3)} tCO2e</div>
        </div>
        <button onClick={handleAdd} disabled={totalKm <= 0} style={{ ...addBtn, opacity: totalKm > 0 ? 1 : 0.5, cursor: totalKm > 0 ? "pointer" : "not-allowed" }}>
          <Plus size={13} style={{ marginRight: 4, verticalAlign: -2 }} />{justAdded ? "Added ✓" : "Add to activity log"}
        </button>
      </div>
      <div style={{ fontSize: 11, color: "#6B7A66", marginTop: 10 }}>
        Distance-based factors are DEFRA-derived, well-to-tank inclusive kg CO2e per passenger-km (2023/24). For flights, use straight-line distance as a starting estimate — airlines' great-circle mileage tools give a more precise figure.
      </div>
    </Card>
  );
}

function ScopeBreakdownCard({ byYear }) {
  const years = byYear.map(y => y.year);
  const [selectedYear, setSelectedYear] = useState(years[years.length - 1] ?? null);
  const activeYear = years.includes(selectedYear) ? selectedYear : years[years.length - 1];
  const row = byYear.find(y => y.year === activeYear) || { scope1: 0, scope2: 0, scope3: 0, scope3ByGroup: {}, total: 0 };
  const pieData = [1, 2, 3].map(s => ({ name: SCOPE_INFO[s].label, value: row[`scope${s}`] || 0 }));
  const hasData = row.total > 0;

  return (
    <>
      <Card style={{ marginBottom: 20 }} id="scope-overview-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Scope 1, 2 &amp; 3 breakdown calculation</div>
          {years.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Label>Year</Label>
              <select value={activeYear ?? ""} onChange={e => setSelectedYear(Number(e.target.value))} style={{ ...cellInput, width: "auto" }}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(200px, 280px) 1fr", gap: 20, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={pieData.some(d => d.value > 0) ? 3 : 0} startAngle={90} endAngle={-270}>
                  {pieData.map((d, i) => <Cell key={d.name} fill={SCOPE_INFO[i + 1].color} />)}
                </Pie>
                <Tooltip formatter={(v) => `${fmt(v)} tCO2e`} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none" }}>
              <div style={{ fontSize: 20, fontWeight: 700 }} className="mono">{fmt(row.total)}</div>
              <div style={{ fontSize: 10, color: "#6B7A66", textTransform: "uppercase", letterSpacing: 0.4 }}>tCO2e total</div>
            </div>
          </div>

          <div>
            {!hasData && (
              <div style={{ fontSize: 13, color: "#6B7A66", marginBottom: 10 }}>Add activity data below for {activeYear ?? "a reporting year"} to see the Scope 1 / 2 / 3 breakdown.</div>
            )}
            {[1, 2, 3].map(scope => {
              const info = SCOPE_INFO[scope];
              const value = row[`scope${scope}`] || 0;
              const pct = row.total ? (value / row.total) * 100 : 0;
              return (
                <div key={scope} style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: info.color, marginTop: 3, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {info.label} — {info.title}
                      <span className="mono" style={{ fontWeight: 700, marginLeft: 8, color: "#16241B" }}>{fmt(value)} tCO2e</span>
                      <span style={{ fontWeight: 600, marginLeft: 6, color: "#6B7A66" }}>({fmt(pct, 0)}%)</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: "#4A5A45", lineHeight: 1.5, marginTop: 2 }}>{info.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <ScopeSourceBreakdown scope={1} row={row} year={activeYear} />
      <ScopeSourceBreakdown scope={2} row={row} year={activeYear} />
      <Scope3CategoryBreakdown row={row} year={activeYear} />
    </>
  );
}

function ScopeSourceBreakdown({ scope, row, year }) {
  const info = SCOPE_INFO[scope];
  const byCategory = row?.[`scope${scope}ByCategory`] || {};
  const scopeTotal = row?.[`scope${scope}`] || 0;
  const categories = FACTORS[scope];
  const hasData = scopeTotal > 0;

  const barData = categories.map(f => ({
    name: f.label.split(" (")[0],
    fullName: f.label,
    unit: f.unit,
    value: Number((byCategory[f.key]?.tco2e || 0).toFixed(3)),
  }));

  return (
    <Card style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{info.label} — bill/meter source breakdown</div>
      <div style={{ fontSize: 12.5, color: "#6B7A66", marginBottom: 14 }}>
        Units of energy or fuel taken directly from {scope === 1 ? "fuel/utility bills and vehicle records" : "electricity bills and supplier certificates"}, for {year ?? "the selected year"}.
      </div>

      {!hasData ? (
        <div style={{ fontSize: 13, color: "#6B7A66" }}>Add {info.label} activity data below to see the source-level breakdown.</div>
      ) : (
        <div className="chart-print" style={{ marginBottom: 14 }}>
          <ResponsiveContainer width="100%" height={Math.max(120, categories.length * 32)}>
            <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 24, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D8DBCB" />
              <XAxis type="number" stroke="#16241B" fontSize={12} label={{ value: "tCO2e", position: "insideBottom", offset: -3, fontSize: 11 }} />
              <YAxis type="category" dataKey="name" stroke="#16241B" fontSize={11} width={150} />
              <Tooltip formatter={(v, n, p) => [`${fmt(v, 3)} tCO2e`, p?.payload?.fullName]} />
              <Bar dataKey="value" fill={info.color} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={th}>Source (bill / meter type)</th>
              <th style={th}>Quantity</th>
              <th style={th}>Unit</th>
              <th style={th}>tCO2e</th>
              <th style={th}>% of {info.label}</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(f => {
              const cat = byCategory[f.key] || { quantity: 0, tco2e: 0 };
              const pct = scopeTotal ? (cat.tco2e / scopeTotal) * 100 : 0;
              return (
                <tr key={f.key}>
                  <td style={td}>{f.label}</td>
                  <td style={td} className="mono">{fmt(cat.quantity, cat.quantity && cat.quantity < 10 ? 3 : 0)}</td>
                  <td style={td} className="mono">{f.unit}</td>
                  <td style={td} className="mono">{fmt(cat.tco2e, 3)}</td>
                  <td style={td} className="mono">{hasData ? `${fmt(pct, 0)}%` : "—"}</td>
                </tr>
              );
            })}
            <tr style={{ fontWeight: 700 }}>
              <td style={td} colSpan={3}>Total {info.label}</td>
              <td style={td} className="mono">{fmt(scopeTotal, 3)}</td>
              <td style={td} className="mono">100%</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11, color: "#6B7A66", marginTop: 10 }}>
        Quantities are in each source's native unit as billed (kWh for gas/electricity, litres for liquid fuel, kg for refrigerant), so they can be checked directly against supplier statements before conversion to tCO2e.
      </div>
    </Card>
  );
}

function Scope3CategoryBreakdown({ row, year }) {
  const groupRow = row?.scope3ByGroup || {};
  const scope3Total = row?.scope3 || 0;
  const barData = SCOPE3_GROUP_ORDER.map(g => ({
    name: `Cat ${SCOPE3_GROUPS[g].num}`,
    fullName: SCOPE3_GROUPS[g].label,
    value: Number((groupRow[g] || 0).toFixed(3)),
  }));
  const hasData = scope3Total > 0;

  return (
    <Card style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Scope 3 — the 5 categories required by PPN 006</div>
      <div style={{ fontSize: 12.5, color: "#6B7A66", marginBottom: 14 }}>
        PPN 006 doesn't require all 15 GHG Protocol Scope 3 categories — only these five, for {year ?? "the selected year"}.
      </div>

      {!hasData ? (
        <div style={{ fontSize: 13, color: "#6B7A66" }}>Add Scope 3 activity data below to see the category-level breakdown.</div>
      ) : (
        <div className="chart-print" style={{ marginBottom: 14 }}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 24, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D8DBCB" />
              <XAxis type="number" stroke="#16241B" fontSize={12} label={{ value: "tCO2e", position: "insideBottom", offset: -3, fontSize: 11 }} />
              <YAxis type="category" dataKey="name" stroke="#16241B" fontSize={12} width={56} />
              <Tooltip formatter={(v, n, p) => [`${fmt(v, 3)} tCO2e`, p?.payload?.fullName]} />
              <Bar dataKey="value" fill={SCOPE_INFO[3].color} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {SCOPE3_GROUP_ORDER.map(g => {
          const info = SCOPE3_GROUPS[g];
          const value = groupRow[g] || 0;
          const pct = scope3Total ? (value / scope3Total) * 100 : 0;
          return (
            <div key={g} style={{ display: "flex", gap: 10, alignItems: "flex-start", borderTop: "1px solid #EEF0E7", paddingTop: 10 }}>
              <div className="mono" style={{ fontSize: 11, fontWeight: 700, color: "#8A6B14", background: "#F6EFDC", borderRadius: 4, padding: "2px 6px", marginTop: 1, flexShrink: 0 }}>
                Cat {info.num}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  {info.label}
                  <span className="mono" style={{ fontWeight: 700, marginLeft: 8, color: "#16241B" }}>{fmt(value, 3)} tCO2e</span>
                  {hasData && <span style={{ fontWeight: 600, marginLeft: 6, color: "#6B7A66" }}>({fmt(pct, 0)}% of Scope 3)</span>}
                </div>
                <div style={{ fontSize: 12.5, color: "#4A5A45", lineHeight: 1.5, marginTop: 2 }}>{info.description}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: "#6B7A66", marginTop: 12 }}>
        If a category genuinely doesn't apply (e.g. no owned products to distribute downstream), PPN 006 expects a stated reason rather than a blank or a "0" — see the plan document's Scope 3 notes.
      </div>
    </Card>
  );
}

function Label({ children }) { return <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: "#6B7A66", marginBottom: 6 }}>{children}</div>; }
function StatCard({ label, value, sub, accent }) {
  return (
    <Card>
      <Label>{label}</Label>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent || "#16241B" }} className="mono">{value}</div>
      <div style={{ fontSize: 12, color: "#6B7A66", marginTop: 2 }}>{sub}</div>
    </Card>
  );
}

const inputStyle = { width: "100%", border: "1px solid #D8DBCB", borderRadius: 6, padding: "8px 10px", fontSize: 14, background: "#fff", boxSizing: "border-box" };
const cellInput = { border: "1px solid #E3E5D8", borderRadius: 4, padding: "5px 7px", fontSize: 13, background: "#fff", width: 80 };
const addBtn = { background: "#28402E", color: "#fff", border: "none", borderRadius: 6, padding: "7px 12px", fontSize: 13, cursor: "pointer" };
const trashBtn = { background: "transparent", border: "none", cursor: "pointer", color: "#B5482A" };

function PlanDocument({ orgName, baselineYear, targetPct, planPeriodYears, supplierNetZeroYear, setSupplierNetZeroYear, govNetZeroYear,
  byYear, baseline, latest, trajectory, measures, setMeasures }) {

  const updateMeasure = (i, v) => setMeasures(m => m.map((x, idx) => idx === i ? v : x));
  const removeMeasure = (i) => setMeasures(m => m.filter((_, idx) => idx !== i));
  const addMeasure = () => setMeasures(m => [...m, ""]);
  const finalTarget = trajectory[trajectory.length - 1];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px 80px" }}>
      <div className="plan-page" style={{ background: "#fff", border: "1px solid #D8DBCB", borderRadius: 4, padding: "48px 56px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>

        <div style={{ borderBottom: "3px solid #16241B", paddingBottom: 16, marginBottom: 28 }}>
          <div style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: "#6B7A66" }}>Carbon Reduction Plan</div>
          <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 30, margin: "4px 0 0" }}>{orgName || "[Organisation name]"}</h1>
          <div style={{ fontSize: 13, color: "#6B7A66", marginTop: 4 }}>Prepared in line with PPN 06/21 — Carbon Reduction Plans for procurement of major government contracts</div>
        </div>

        <Section title="1. Commitment to achieving Net Zero">
          <p>
            {orgName || "[Organisation]"} is committed to achieving Net Zero emissions by <EditableInline value={supplierNetZeroYear} onChange={setSupplierNetZeroYear} width={60} /> across our direct (Scope 1), energy indirect (Scope 2) and the required subset of other indirect (Scope 3) emissions, and to supporting the UK government's target of achieving Net Zero emissions by {govNetZeroYear}.
          </p>
          <p>
            This plan sets out our baseline emissions, our progress against our Emissions Reduction Target (ERT), and the carbon reduction measures we have implemented and plan to implement in support of that commitment.
          </p>
        </Section>

        <Section title="2. Baseline emissions footprint">
          <p>Baseline year: <strong>{baselineYear}</strong>. Baseline emissions were calculated using activity data for owned/controlled facilities and vehicles (Scope 1), purchased electricity and heat (Scope 2), and the five PPN 006 Scope 3 categories set out in Section 3.</p>
          <ul style={{ paddingLeft: 20, margin: "6px 0 14px", lineHeight: 1.6 }}>
            <li><strong>Scope 1 — direct emissions:</strong> {SCOPE_INFO[1].description}</li>
            <li><strong>Scope 2 — indirect energy emissions:</strong> {SCOPE_INFO[2].description}</li>
            <li><strong>Scope 3 — other indirect emissions:</strong> {SCOPE_INFO[3].description}</li>
          </ul>
          <table style={tableStyle}>
            <thead><tr><th style={th}>Emissions category</th><th style={th}>tCO2e</th><th style={th}>% of baseline</th></tr></thead>
            <tbody>
              <tr><td style={td}>Scope 1</td><td style={td} className="mono">{fmt(baseline.scope1)}</td><td style={td} className="mono">{fmt(baseline.total ? (baseline.scope1 / baseline.total) * 100 : 0, 0)}%</td></tr>
              <tr><td style={td}>Scope 2</td><td style={td} className="mono">{fmt(baseline.scope2)}</td><td style={td} className="mono">{fmt(baseline.total ? (baseline.scope2 / baseline.total) * 100 : 0, 0)}%</td></tr>
              <tr><td style={td}>Scope 3 (PPN 006 subset)</td><td style={td} className="mono">{fmt(baseline.scope3)}</td><td style={td} className="mono">{fmt(baseline.total ? (baseline.scope3 / baseline.total) * 100 : 0, 0)}%</td></tr>
              <tr style={{ fontWeight: 700 }}><td style={td}>Total</td><td style={td} className="mono">{fmt(baseline.total)}</td><td style={td} className="mono">100%</td></tr>
            </tbody>
          </table>
        </Section>

        <Section title="3. Scope 1 — direct emissions, activity data by source">
          <p>
            Figures below are taken directly from fuel and utility bills, meter readings, and vehicle fuel records for the most recent reporting year{latest ? ` (${latest.year})` : ""}, before conversion to tCO2e using DEFRA/BEIS conversion factors.
          </p>
          <table style={tableStyle}>
            <thead><tr><th style={th}>Source</th><th style={th}>Quantity</th><th style={th}>Unit</th><th style={th}>tCO2e</th></tr></thead>
            <tbody>
              {FACTORS[1].map(f => {
                const cat = latest?.scope1ByCategory?.[f.key] || { quantity: 0, tco2e: 0 };
                return (
                  <tr key={f.key}>
                    <td style={td}>{f.label}</td>
                    <td style={td} className="mono">{fmt(cat.quantity, cat.quantity && cat.quantity < 10 ? 3 : 0)}</td>
                    <td style={td} className="mono">{f.unit}</td>
                    <td style={td} className="mono">{fmt(cat.tco2e, 3)}</td>
                  </tr>
                );
              })}
              <tr style={{ fontWeight: 700 }}>
                <td style={td} colSpan={3}>Total Scope 1</td>
                <td style={td} className="mono">{fmt(latest?.scope1 || 0, 3)}</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section title="4. Scope 2 — indirect energy emissions, activity data by source">
          <p>
            Figures below are taken directly from electricity and purchased heat/steam bills for the most recent reporting year{latest ? ` (${latest.year})` : ""}. Location-based figures use the grid average emissions intensity; market-based figures reflect our specific supply contracts (e.g. REGO-backed renewable tariffs), reported per PPN 006's dual-reporting requirement for Scope 2.
          </p>
          <table style={tableStyle}>
            <thead><tr><th style={th}>Source</th><th style={th}>Quantity</th><th style={th}>Unit</th><th style={th}>tCO2e</th></tr></thead>
            <tbody>
              {FACTORS[2].map(f => {
                const cat = latest?.scope2ByCategory?.[f.key] || { quantity: 0, tco2e: 0 };
                return (
                  <tr key={f.key}>
                    <td style={td}>{f.label}</td>
                    <td style={td} className="mono">{fmt(cat.quantity, cat.quantity && cat.quantity < 10 ? 3 : 0)}</td>
                    <td style={td} className="mono">{f.unit}</td>
                    <td style={td} className="mono">{fmt(cat.tco2e, 3)}</td>
                  </tr>
                );
              })}
              <tr style={{ fontWeight: 700 }}>
                <td style={td} colSpan={3}>Total Scope 2 (location-based)</td>
                <td style={td} className="mono">{fmt(latest?.scope2 || 0, 3)}</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section title="5. Scope 3 emissions — required category breakdown">
          <p>
            PPN 006 does not require all 15 GHG Protocol Scope 3 categories — only the five below. Figures shown are for the most recent reporting year{latest ? ` (${latest.year})` : ""}.
          </p>
          <table style={tableStyle}>
            <thead><tr><th style={th}>Category</th><th style={th}>Description</th><th style={th}>tCO2e</th></tr></thead>
            <tbody>
              {SCOPE3_GROUP_ORDER.map(g => {
                const info = SCOPE3_GROUPS[g];
                const value = latest?.scope3ByGroup?.[g] || 0;
                return (
                  <tr key={g}>
                    <td style={td}><strong>Cat {info.num}</strong> — {info.label}</td>
                    <td style={{ ...td, fontSize: 12.5 }}>{info.description}</td>
                    <td style={td} className="mono">{fmt(value, 3)}</td>
                  </tr>
                );
              })}
              <tr style={{ fontWeight: 700 }}>
                <td style={td} colSpan={2}>Total Scope 3 (PPN 006 subset)</td>
                <td style={td} className="mono">{fmt(latest?.scope3 || 0, 3)}</td>
              </tr>
            </tbody>
          </table>
          <p style={{ fontSize: 12, color: "#6B7A66", marginTop: 8 }}>
            Where a category above shows zero because it genuinely doesn't apply to our operations (for example, no owned products requiring downstream distribution), this is stated as the reason rather than left unexplained, in line with PPN 006 guidance.
          </p>
        </Section>

        <Section title="6. Current emissions reporting">
          <p>Emissions have been re-assessed annually since the baseline year, as set out in Table 1 below.</p>
          <table style={tableStyle}>
            <thead><tr><th style={th}>Reporting year</th><th style={th}>Scope 1</th><th style={th}>Scope 2</th><th style={th}>Scope 3</th><th style={th}>Total (tCO2e)</th><th style={th}>1 / 2 / 3 split</th></tr></thead>
            <tbody>
              {byYear.map(y => (
                <tr key={y.year}>
                  <td style={td}>{y.year}</td>
                  <td style={td} className="mono">{fmt(y.scope1)}</td>
                  <td style={td} className="mono">{fmt(y.scope2)}</td>
                  <td style={td} className="mono">{fmt(y.scope3)}</td>
                  <td style={td} className="mono"><b>{fmt(y.total)}</b></td>
                  <td style={td} className="mono">{fmt(y.total ? (y.scope1 / y.total) * 100 : 0, 0)}% / {fmt(y.total ? (y.scope2 / y.total) * 100 : 0, 0)}% / {fmt(y.total ? (y.scope3 / y.total) * 100 : 0, 0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {latest && (
            <p style={{ marginTop: 10 }}>
              Most recent reporting year ({latest.year}) total emissions: <strong className="mono">{fmt(latest.total)} tCO2e</strong>, compared to a baseline of <strong className="mono">{fmt(baseline.total)} tCO2e</strong> in {baselineYear}.
            </p>
          )}
        </Section>

        <Section title="7. Emissions Reduction Target">
          <p>
            {orgName || "[Organisation]"} commits to reducing its Contract/Organisational Carbon Footprint by <strong>{targetPct}%</strong> per contract year, for a period of <strong>{planPeriodYears} years</strong> from the baseline year, focusing initially on identified GHG emissions hotspots.
          </p>
          <div style={{ background: "#F3F5EC", border: "1px solid #D8DBCB", borderRadius: 8, padding: "14px 18px", margin: "14px 0" }}>
            <div style={{ fontSize: 13, color: "#4A5A45" }}>Projected emissions at end of plan period ({finalTarget?.year})</div>
            <div style={{ fontSize: 22, fontWeight: 700 }} className="mono">{fmt(finalTarget?.target)} tCO2e</div>
          </div>
          <div className="chart-print">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trajectory} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3E5D8" />
                <XAxis dataKey="year" stroke="#16241B" fontSize={12} />
                <YAxis stroke="#16241B" fontSize={12} label={{ value: "tCO2e", angle: -90, position: "insideLeft", fontSize: 12 }} />
                <Tooltip formatter={(v) => `${fmt(v)} tCO2e`} />
                <Legend />
                <Line type="monotone" dataKey="target" name="ERT trajectory" stroke="#2F6D3B" strokeDasharray="6 4" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="actual" name="Actual" stroke="#B5482A" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="8. Carbon reduction measures">
          <p>The following environmental management measures and projects have been or will be implemented to achieve the stated emissions reduction target:</p>
          <ul style={{ paddingLeft: 20, lineHeight: 1.7 }}>
            {measures.map((m, i) => (
              <li key={i} className="no-print-flex" style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 4 }}>
                <textarea value={m} onChange={e => updateMeasure(i, e.target.value)} rows={1}
                  style={{ flex: 1, border: "1px solid transparent", background: "transparent", fontFamily: "inherit", fontSize: 14, resize: "vertical", padding: "2px 4px" }}
                  onFocus={e => e.target.style.border = "1px solid #D8DBCB"} onBlur={e => e.target.style.border = "1px solid transparent"} />
                <button className="no-print" onClick={() => removeMeasure(i)} style={{ ...trashBtn, marginTop: 2 }}><Trash2 size={13} /></button>
              </li>
            ))}
          </ul>
          <button className="no-print" onClick={addMeasure} style={addBtn}><Plus size={13} style={{ marginRight: 4, verticalAlign: -2 }} />Add measure</button>
        </Section>

        <Section title="9. Declaration and sign-off">
          <p>This Carbon Reduction Plan has been reviewed and signed off by the board (or equivalent management body).</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 20 }}>
            <div>
              <div style={{ borderBottom: "1px solid #16241B", height: 32 }}></div>
              <div style={{ fontSize: 12, color: "#6B7A66", marginTop: 4 }}>Signature</div>
            </div>
            <div>
              <div style={{ borderBottom: "1px solid #16241B", height: 32 }}></div>
              <div style={{ fontSize: 12, color: "#6B7A66", marginTop: 4 }}>Date</div>
            </div>
          </div>
        </Section>

        <div style={{ marginTop: 32, fontSize: 10, color: "#9AA592", borderTop: "1px solid #E3E5D8", paddingTop: 10 }}>
          Generated by the Scope 1 &amp; 2 Emissions Lab. Conversion factors are illustrative; verify against current DEFRA/BEIS GHG Conversion Factors before formal submission under PPN 06/21 or equivalent.
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: 17, borderBottom: "1px solid #D8DBCB", paddingBottom: 6, marginBottom: 10 }}>{title}</h2>
      <div style={{ fontSize: 14, lineHeight: 1.6, color: "#20301F" }}>{children}</div>
    </div>
  );
}

function EditableInline({ value, onChange, width }) {
  return <input value={value} onChange={e => onChange(e.target.value)} style={{ width, border: "none", borderBottom: "1px dashed #6B7A66", background: "transparent", fontWeight: 700, fontFamily: "inherit", fontSize: "inherit" }} />;
}

const tableStyle = { width: "100%", borderCollapse: "collapse", fontSize: 13, margin: "10px 0" };
const th = { textAlign: "left", borderBottom: "2px solid #16241B", padding: "6px 10px", background: "#F3F5EC" };
const td = { borderBottom: "1px solid #E3E5D8", padding: "6px 10px" };
