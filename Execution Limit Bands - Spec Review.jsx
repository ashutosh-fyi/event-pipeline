import { useState, useEffect, useRef } from "react";

/* ═══ DATA ═══ */
const APPS = [
  { id: "app_dt", name: "Device Tracking (IoT)", abbr: "DT", color: "#1B6AC9", allEnvs: true },
  { id: "app_om", name: "Order Management", abbr: "OM", color: "#E8590C", allEnvs: false },
  { id: "app_cs", name: "Customer Support", abbr: "CS", color: "#0CA678", allEnvs: true },
];
const ENV_MAP = {
  app_dt: [
    { id: "env_dev", name: "Development", namespaces: ["default", "iot-sensors"] },
    { id: "env_stage", name: "Staging", namespaces: ["default"] },
    { id: "env_prod", name: "Production", namespaces: ["default", "iot-sensors", "fleet-gps"] },
  ],
  app_om: [
    { id: "env_dev", name: "Development", namespaces: ["default"] },
    { id: "env_prod", name: "Production", namespaces: ["default", "checkout"] },
  ],
  app_cs: [
    { id: "env_dev", name: "Development", namespaces: ["default", "ticketing"] },
    { id: "env_stage", name: "Staging", namespaces: ["default"] },
  ],
};
const FUNC_MAP = {
  default: ["trackingevent", "processPayload", "validateSchema"],
  "iot-sensors": ["sensorIngest", "alertThreshold", "batchUpload"],
  "fleet-gps": ["locationPing", "geofenceCheck"],
  checkout: ["orderConfirm", "inventorySync"],
  ticketing: ["ticketCreate", "ticketEscalate", "autoReply"],
};
const BANDS = Array.from({ length: 12 }, (_, i) => ({
  id: `band_0_${(i + 1) * 5}`, lower: 0, upper: (i + 1) * 5,
  label: `Up to ${(i + 1) * 5}s`,
}));
const BAND_GROUPS = [
  { label: "Quick", desc: "Lightweight tasks — webhooks, cache lookups, simple validations", range: "up to 15s", bands: BANDS.slice(0, 3) },
  { label: "Standard", desc: "API calls, DB queries, moderate data processing", range: "up to 30s", bands: BANDS.slice(3, 6) },
  { label: "Extended", desc: "Multi-step workflows, external service chains, batch inserts", range: "up to 45s", bands: BANDS.slice(6, 9) },
  { label: "Heavy", desc: "Large data transforms, report generation, file processing", range: "up to 60s", bands: BANDS.slice(9, 12) },
];

function rng(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateInQueue(count = 5) {
  const users = ["nethandoe@zylker.com", "admin@zylker.com", "saravanan@zylker.com"];
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    id: `iq_${i}`, time: new Date(now - i * 86400000 * (1 + Math.random())),
    user: users[rng(0, 2)],
    waitDuration: rng(1, 300),
  })).sort((a, b) => b.time - a.time);
}
function generateFailed(count = 3) {
  const users = ["nethandoe@zylker.com", "admin@zylker.com"];
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    id: `fl_${i}`, time: new Date(now - i * 86400000 * 2 - rng(0, 86400000)),
    user: users[rng(0, 1)],
    reason: ["Exceeded limit: 15s", "Timeout connecting to upstream", "Function threw unhandled exception"][rng(0, 2)],
  })).sort((a, b) => b.time - a.time);
}
function generateLogs(bandId, count = 8) {
  const band = BANDS.find(b => b.id === bandId);
  const users = ["nethandoe@zylker.com", "admin@zylker.com", "saravanan@zylker.com"];
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const dur = +(Math.random() * (band.upper + 3)).toFixed(2);
    const exceeded = dur > band.upper;
    const addedTime = new Date(now - i * 3600000 * (2 + Math.random() * 10));
    const completedTime = new Date(addedTime.getTime() + dur * 1000 + rng(200, 5000));
    return {
      id: `log_${i}`, addedTime, completedTime, user: users[rng(0, 2)],
      duration: dur, status: exceeded ? "Failed" : "Success",
    };
  }).sort((a, b) => b.addedTime - a.addedTime);
}

function fmtDate(d) {
  const mo = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const h = d.getHours(), ampm = h >= 12 ? "PM" : "AM", hh = h % 12 || 12;
  return `${mo[d.getMonth()]} ${String(d.getDate()).padStart(2,"0")} ${d.getFullYear()}, ${String(hh).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}.${String(d.getSeconds()).padStart(2,"0")} ${ampm}`;
}
function fmtWait(sec) {
  if (sec >= 60) return `${Math.floor(sec / 60)} Min`;
  if (sec >= 1) return `${sec} Sec`;
  return `${sec * 1000} Ms`;
}

/* ═══ PALETTE ═══ */
const C = {
  bg: "#F4F5F7", white: "#FFFFFF", border: "#E4E7EC", borderLight: "#EEF0F4",
  text: "#1A1A1A", textSec: "#6B7280", textLabel: "#8B8FA3",
  blue: "#1B6AC9", blueLight: "#E8F0FE", blueBorder: "#B8D4F5",
  red: "#DC2626", redLight: "#FEF2F2",
  green: "#16A34A", greenLight: "#F0FDF4",
  orange: "#EA580C", orangeLight: "#FFF7ED",
  yellow: "#D97706",
};
const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

/* ═══ ATOMS ═══ */
const AppBadge = ({ app }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
    <span style={{ width: 24, height: 24, borderRadius: 4, background: app.color, color: "#fff", fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{app.abbr}</span>
    {app.name}
  </span>
);
const Sel = ({ value, onChange, options, placeholder, disabled }) => (
  <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} style={{
    width: "100%", maxWidth: 440, padding: "10px 12px", borderRadius: 4,
    border: `1px solid ${C.border}`, background: disabled ? C.bg : C.white,
    color: value ? C.text : C.textLabel, fontSize: 14, fontFamily: font,
    cursor: disabled ? "not-allowed" : "pointer", outline: "none",
  }}>
    <option value="" disabled>{placeholder}</option>
    {options.map(o => <option key={typeof o === "string" ? o : o.value} value={typeof o === "string" ? o : o.value}>{typeof o === "string" ? o : o.label}</option>)}
  </select>
);
const Btn = ({ children, disabled, onClick, style: s }) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding: "9px 24px", borderRadius: 4, background: disabled ? "#B8D4F5" : C.blue,
    color: "#fff", border: "none", fontSize: 14, fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer", fontFamily: font, ...s,
  }}>{children}</button>
);
const BtnO = ({ children, onClick, color = C.blue, style: s }) => (
  <button onClick={onClick} style={{
    padding: "8px 18px", borderRadius: 4, background: C.white, color,
    border: `1px solid ${color}`, fontSize: 13, fontWeight: 500,
    cursor: "pointer", fontFamily: font, display: "inline-flex", alignItems: "center", gap: 6, ...s,
  }}>{children}</button>
);
const Chk = ({ checked, onChange }) => (
  <span onClick={onChange} style={{
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 18, height: 18, borderRadius: 3, border: `1.5px solid ${checked ? C.blue : C.border}`,
    background: checked ? C.blue : C.white, cursor: "pointer", flexShrink: 0,
  }}>{checked && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}</span>
);

/* ═══ BAND SELECTOR ═══ */
const BandSelector = ({ value, onChange }) => {
  const [og, setOg] = useState(value ? BAND_GROUPS.findIndex(g => g.bands.some(b => b.id === value)) : 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 440 }}>
      {BAND_GROUPS.map((group, gi) => {
        const open = og === gi, hasSel = group.bands.some(b => b.id === value);
        return (
          <div key={gi}>
            <button onClick={() => setOg(open ? -1 : gi)} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
              padding: "10px 14px", background: hasSel ? C.blueLight : C.bg,
              border: `1px solid ${hasSel ? C.blueBorder : C.border}`,
              borderRadius: open ? "6px 6px 0 0" : 6, cursor: "pointer", fontFamily: font,
              fontSize: 13, fontWeight: 600, color: hasSel ? C.blue : C.text,
            }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                <span>{group.label} <span style={{ fontWeight: 400, fontSize: 12, color: C.textLabel }}>({group.range})</span></span>
                <span style={{ fontSize: 11.5, fontWeight: 400, color: C.textSec }}>{group.desc}</span>
              </div>
              <span style={{ fontSize: 10, color: C.textLabel, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s", flexShrink: 0, marginLeft: 8 }}>▼</span>
            </button>
            {open && (
              <div style={{ border: `1px solid ${C.border}`, borderTop: "none", borderRadius: "0 0 6px 6px", overflow: "hidden" }}>
                {group.bands.map((band, bi) => {
                  const a = value === band.id;
                  return (
                    <button key={band.id} onClick={() => onChange(band.id)} style={{
                      display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 14px",
                      background: a ? C.blueLight : C.white, border: "none",
                      borderBottom: bi < group.bands.length - 1 ? `1px solid ${C.borderLight}` : "none",
                      cursor: "pointer", fontFamily: font, fontSize: 13.5, textAlign: "left",
                    }}>
                      <span style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${a ? C.blue : C.border}`, background: a ? C.blue : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {a && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
                      </span>
                      <span style={{ fontWeight: a ? 600 : 400, color: a ? C.blue : C.text, fontVariantNumeric: "tabular-nums", minWidth: 72 }}>0 – {band.upper}s</span>
                      <span style={{ flex: 1, height: 4, borderRadius: 2, background: C.borderLight, overflow: "hidden" }}>
                        <span style={{ display: "block", height: "100%", width: `${(band.upper / 60) * 100}%`, background: a ? C.blue : "#CBD5E1", borderRadius: 2 }} />
                      </span>
                      <span style={{ fontSize: 12, color: C.textLabel, minWidth: 50, textAlign: "right" }}>max {band.upper}s</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ═══ STEP NAV ═══ */
const StepNav = ({ steps, current }) => (
  <div style={{ display: "flex", flexDirection: "column" }}>
    {steps.map((s, i) => {
      const done = i < current, active = i === current;
      return (
        <div key={s} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${done || active ? C.blue : C.border}`, background: done ? C.blue : "transparent" }}>
              {done ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> : <span style={{ fontSize: 11, fontWeight: 600, color: active ? C.blue : C.textLabel }}>{i + 1}</span>}
            </div>
            {i < steps.length - 1 && <div style={{ width: 2, height: 28, background: done ? C.blue : C.border, margin: "2px 0" }} />}
          </div>
          <span style={{ fontSize: 13.5, fontWeight: active ? 600 : 400, color: active ? C.blue : C.textSec, paddingTop: 2 }}>{s}</span>
        </div>
      );
    })}
  </div>
);

/* ═══ HEALTH GAUGE (SVG arc) ═══ */
const HealthGauge = ({ value = 65 }) => {
  // value 0-100, maps to arc from 180deg to 0deg
  const r = 70, cx = 85, cy = 85, sw = 14;
  const startAngle = Math.PI, endAngle = 0;
  const range = startAngle - endAngle;
  const angle = startAngle - (value / 100) * range;
  const x1 = cx + r * Math.cos(startAngle), y1 = cy - r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle), y2 = cy - r * Math.sin(endAngle);
  const nx = cx + r * Math.cos(angle), ny = cy - r * Math.sin(angle);
  // gradient segments: green(0-33) yellow(33-66) red(66-100)
  const label = value < 35 ? "LOW" : value < 65 ? "MEDIUM" : "HIGH";
  const labelColor = value < 35 ? C.red : value < 65 ? C.yellow : C.green;
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
      <svg width="170" height="105" viewBox="0 0 170 105">
        {/* Background arc */}
        <path d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${cx} ${cy - r}`} fill="none" stroke="#EF4444" strokeWidth={sw} strokeLinecap="round" />
        <path d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx + r * Math.cos(Math.PI / 3)} ${cy - r * Math.sin(Math.PI / 3)}`} fill="none" stroke="#F59E0B" strokeWidth={sw} />
        <path d={`M ${cx + r * Math.cos(Math.PI / 3)} ${cy - r * Math.sin(Math.PI / 3)} A ${r} ${r} 0 0 1 ${x2} ${y2}`} fill="none" stroke="#22C55E" strokeWidth={sw} strokeLinecap="round" />
        {/* Needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={C.text} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5" fill={C.text} />
        <text x={cx} y={cy + 22} textAnchor="middle" fontSize="13" fontWeight="700" fill={labelColor} fontFamily={font}>{label}</text>
      </svg>
    </div>
  );
};

/* ═══ INSIGHTS SLIDE-OUT PANEL ═══ */
const InsightsPanel = ({ open, onClose, logs, band, config }) => {
  if (!open) return null;
  const total = logs.length;
  const success = logs.filter(l => l.status === "Success").length;
  const failed = total - success;
  const termRate = total > 0 ? ((failed / total) * 100).toFixed(1) : "0";
  const durations = logs.map(l => l.duration).sort((a, b) => a - b);
  const avgProc = durations.length ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 1000) : 0;
  const avgWait = rng(200, 800);
  const health = Math.max(10, Math.min(90, 100 - parseFloat(termRate) * 5));
  const completed = Math.round((success / Math.max(total, 1)) * 100);
  const inProgress = rng(10, 30);
  const pending = 100 - completed - inProgress;

  const showRec = parseFloat(termRate) >= 5 || (durations.length && durations[Math.floor(durations.length * 0.95)] >= 0.9 * band.upper);
  const nextBand = BANDS[BANDS.indexOf(band) + 1];
  const env = (ENV_MAP[config.appId] || []).find(e => e.id === config.envId);
  const isDevEnv = env?.name === "Development";

  return (
    <div style={{
      position: "absolute", top: 0, right: 0, width: 320, height: "100%",
      background: C.white, borderLeft: `1px solid ${C.border}`, boxShadow: "-4px 0 20px rgba(0,0,0,0.06)",
      overflowY: "auto", zIndex: 50, display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Pipeline Insights</span>
          <select style={{ fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 4, padding: "3px 6px", fontFamily: font, color: C.textSec, background: C.white }}>
            <option>Last 30 days</option>
            <option>Last 7 days</option>
            <option>Last 24h</option>
          </select>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, color: C.textSec, cursor: "pointer", padding: "2px 4px" }}>✕</button>
      </div>

      <div style={{ padding: "16px 20px", flex: 1 }}>
        {/* Environment note */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", background: C.blueLight, borderRadius: 6, marginBottom: 16, fontSize: 12, color: C.blue, lineHeight: 1.5 }}>
          <span>🌐</span>
          <span>Environment: <strong>{env?.name || "—"}</strong></span>
        </div>

        {/* Recommendation banner */}
        {showRec && nextBand && (
          <div style={{ padding: "10px 12px", background: C.orangeLight, border: "1px solid #FED7AA", borderRadius: 6, marginBottom: 16, fontSize: 12.5, color: C.text, lineHeight: 1.5 }}>
            <strong style={{ color: C.orange }}>⚠ Terminations detected.</strong>
            <div style={{ marginTop: 4 }}>Consider switching to <strong>{nextBand.label}</strong> to reduce failures.</div>
          </div>
        )}

        {/* Dev env education tip */}
        {!isDevEnv && (
          <div style={{ padding: "10px 12px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 6, marginBottom: 16, fontSize: 12, color: "#92400E", lineHeight: 1.5 }}>
            💡 <strong>Tip:</strong> Create a pipeline in a <strong>Dev</strong> environment first to observe average waiting times and tune your execution limit before production.
          </div>
        )}
        {isDevEnv && (
          <div style={{ padding: "10px 12px", background: C.greenLight, border: "1px solid #BBF7D0", borderRadius: 6, marginBottom: 16, fontSize: 12, color: "#166534", lineHeight: 1.5 }}>
            ✓ You're in a <strong>Dev</strong> environment — use these metrics to fine-tune your execution limit before deploying to Production.
          </div>
        )}

        {/* Pipeline Health */}
        <h4 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700 }}>Pipeline Health</h4>
        <HealthGauge value={health} />

        {/* Pipeline Summary */}
        <h4 style={{ margin: "20px 0 12px", fontSize: 14, fontWeight: 700 }}>Pipeline Summary</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            ["Task Produced:", total * 100 + rng(100, 500)],
            ["Avg Processing Time:", `${avgProc} ms`],
            ["Avg Waiting Time:", `${avgWait} ms`],
            ["Incoming Message Rate:", rng(3000, 9000)],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.borderLight}` }}>
              <span style={{ fontSize: 13, color: C.textSec }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Execution Limit Metrics */}
        <h4 style={{ margin: "20px 0 12px", fontSize: 14, fontWeight: 700 }}>Execution Limit</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            ["Current Band:", band?.label],
            ["Terminated Events:", `${failed} (${termRate}%)`],
            ["p50 Duration:", `${durations[Math.floor(durations.length * 0.5)]?.toFixed(1) || "—"}s`],
            ["p95 Duration:", `${durations[Math.floor(durations.length * 0.95)]?.toFixed(1) || "—"}s`],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.borderLight}` }}>
              <span style={{ fontSize: 13, color: C.textSec }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Progress tracker */}
        <h4 style={{ margin: "20px 0 8px", fontSize: 14, fontWeight: 700 }}>Progress tracker</h4>
        <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>{total * 250 + rng(100, 500)} Tasks processed</p>
        <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
          <div style={{ width: `${completed}%`, background: C.blue }} />
          <div style={{ width: `${inProgress}%`, background: C.orange }} />
          <div style={{ width: `${pending}%`, background: "#E5E7EB" }} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12 }}>
          <span><span style={{ color: C.blue }}>●</span> Completed: <strong>{completed}%</strong></span>
          <span><span style={{ color: C.orange }}>●</span> Inprogress: <strong>{inProgress}%</strong></span>
          <span><span style={{ color: "#9CA3AF" }}>●</span> Pending: <strong>{Math.max(0, pending)}%</strong></span>
        </div>
      </div>
    </div>
  );
};

/* ═══ WIZARD ═══ */
const CreationWizard = ({ onClose, onCreate }) => {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [linkName, setLinkName] = useState("");
  const [pipeType, setPipeType] = useState("standard");
  const [appId, setAppId] = useState("");
  const [envId, setEnvId] = useState("");
  const [namespace, setNamespace] = useState("");
  const [funcName, setFuncName] = useState("");
  const [bandId, setBandId] = useState("");

  const app = APPS.find(a => a.id === appId);
  const envs = appId ? (ENV_MAP[appId] || []) : [];
  const env = envs.find(e => e.id === envId);
  const nsList = env ? env.namespaces : [];
  const funcs = namespace ? (FUNC_MAP[namespace] || FUNC_MAP["default"]) : [];
  const canCreate = appId && envId && namespace && funcName && bandId;

  useEffect(() => { setLinkName(displayName.trim().replace(/\s+/g, "_")); }, [displayName]);

  const hints = step === 0 ? [
    "Ensure to name your event pipeline with terms that are descriptive, memorable, and reflective of their functionality.",
    "The link name will be appended to the endpoint URL generated.",
  ] : [
    app?.allEnvs
      ? `${app.name} is configured for all environments (Dev, Staging, Prod).`
      : app
      ? `${app.name} is available in ${envs.map(e => e.name).join(", ")}.`
      : "Select an application to see available environments.",
    "Start with a Development environment to test and observe average waiting times before going to Production.",
    "Events exceeding the execution limit are automatically terminated to protect system stability.",
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: C.white, display: "flex", flexDirection: "column", fontFamily: font }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Create Event Pipeline</span>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: C.textSec, cursor: "pointer", lineHeight: 1 }}>✕</button>
      </div>
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div style={{ width: 180, padding: "28px 20px", borderRight: `1px solid ${C.border}`, flexShrink: 0 }}>
          <StepNav steps={["Pipeline Details", "Actions"]} current={step} />
        </div>
        <div style={{ flex: 1, padding: "28px 36px", overflowY: "auto" }}>
          {step === 0 && (
            <div>
              <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>Pipeline Details</h2>
              <p style={{ margin: "0 0 24px", fontSize: 14, color: C.textSec }}>Name and describe the type of your pipeline.</p>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Display Name</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Event Pipeline" style={{ width: "100%", maxWidth: 440, padding: "10px 12px", borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: font, outline: "none", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = C.blue} onBlur={e => e.target.style.borderColor = C.border} />
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, marginTop: 20 }}>Link Name</label>
              <input value={linkName} onChange={e => setLinkName(e.target.value)} placeholder="Event_Pipeline" style={{ width: "100%", maxWidth: 440, padding: "10px 12px", borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: font, outline: "none", boxSizing: "border-box", color: C.textSec }} />
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 10, marginTop: 24 }}>Pipeline Type</label>
              <div style={{ display: "flex", gap: 12, maxWidth: 520 }}>
                {[
                  { id: "standard", name: "Standard", desc: "Processes events in a best-effort order, ensuring reliable delivery without strict ordering" },
                  { id: "fifo", name: "FIFO", desc: "Guarantees events are processed in the exact order they are added, maintaining strict sequence integrity" },
                ].map(t => (
                  <button key={t.id} onClick={() => setPipeType(t.id)} style={{
                    flex: 1, padding: "14px 16px", borderRadius: 6, textAlign: "left", cursor: "pointer", fontFamily: font,
                    border: `1.5px solid ${pipeType === t.id ? C.blue : C.border}`, background: pipeType === t.id ? C.blueLight : C.white,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${pipeType === t.id ? C.blue : C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>{pipeType === t.id && <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.blue }} />}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: pipeType === t.id ? C.text : C.textSec }}>{t.name}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12.5, color: C.textSec, lineHeight: 1.5 }}>{t.desc}</p>
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 28 }}><Btn disabled={!displayName.trim()} onClick={() => setStep(1)}>Next</Btn></div>
            </div>
          )}
          {step === 1 && (
            <div>
              <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>Actions</h2>
              <p style={{ margin: "0 0 24px", fontSize: 14, color: C.textSec }}>Configure the application, function, and execution limit.</p>

              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Application</label>
              <Sel value={appId} onChange={v => { setAppId(v); setEnvId(""); setNamespace(""); setFuncName(""); }} options={APPS.map(a => ({ value: a.id, label: a.name }))} placeholder="Choose application" />
              {app && (
                <div style={{ marginTop: 6, marginBottom: 2 }}>
                  <AppBadge app={app} />
                  {app.allEnvs && <span style={{ fontSize: 11, color: C.green, marginLeft: 8, fontWeight: 500 }}>✓ Available in all environments</span>}
                </div>
              )}

              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, marginTop: 18 }}>Environment</label>
              <Sel value={envId} onChange={v => { setEnvId(v); setNamespace(""); setFuncName(""); }} options={envs.map(e => ({ value: e.id, label: e.name }))} placeholder="Choose environment" disabled={!appId} />

              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, marginTop: 18 }}>Namespace</label>
              <Sel value={namespace} onChange={v => { setNamespace(v); setFuncName(""); }} options={nsList} placeholder="Choose namespace" disabled={!envId} />

              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, marginTop: 18 }}>Function</label>
              <Sel value={funcName} onChange={setFuncName} options={funcs} placeholder="Choose function" disabled={!namespace} />

              <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, margin: "24px 0 20px", maxWidth: 440 }} />

              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Execution Limit <span style={{ color: C.red }}>*</span></label>
              <p style={{ margin: "0 0 10px", fontSize: 13, color: C.textSec }}>Maximum time allowed per event execution.</p>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", marginBottom: 14, maxWidth: 440, background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 6, fontSize: 12.5, color: "#92400E", lineHeight: 1.5 }}>
                ⚠ Events that exceed this limit are automatically stopped to protect system stability.
              </div>
              <BandSelector value={bandId} onChange={setBandId} />
              <div style={{ marginTop: 10 }}>
                <a href="#" onClick={e => e.preventDefault()} style={{ fontSize: 12.5, color: C.blue, textDecoration: "none" }}>ℹ How to choose an execution limit</a>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
                <button onClick={() => setStep(0)} style={{ padding: "9px 18px", borderRadius: 4, background: "transparent", color: C.textSec, border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: font }}>Back</button>
                <Btn disabled={!canCreate} onClick={() => onCreate({ name: displayName, linkName, pipeType, appId, envId, namespace, funcName, bandId })}>Create Pipeline</Btn>
              </div>
            </div>
          )}
        </div>
        <div style={{ width: 220, padding: "28px 20px", borderLeft: `1px solid ${C.border}`, flexShrink: 0, overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
            <span style={{ fontSize: 14 }}>⚙</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Hints</span>
          </div>
          {hints.map((h, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.textLabel, marginTop: 7, flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 12.5, color: C.textSec, lineHeight: 1.6 }}>{h}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ═══ CHANGE BAND MODAL ═══ */
const ChangeBandModal = ({ open, onClose, currentBandId, onConfirm }) => {
  const [sel, setSel] = useState(currentBandId);
  useEffect(() => { if (open) setSel(currentBandId); }, [open, currentBandId]);
  if (!open) return null;
  const cur = BANDS.find(b => b.id === currentBandId);
  const nxt = BANDS.find(b => b.id === sel);
  const isLower = nxt && cur && nxt.upper < cur.upper;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: 8, padding: 24, width: "100%", maxWidth: 480, maxHeight: "80vh", overflow: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.15)" }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700 }}>Change Execution Limit</h3>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: C.textSec }}>Current: <strong>{cur?.label}</strong></p>
        <BandSelector value={sel} onChange={setSel} />
        {isLower && <div style={{ display: "flex", gap: 8, padding: "10px 12px", background: C.orangeLight, border: "1px solid #FED7AA", borderRadius: 6, marginTop: 14, fontSize: 13, color: C.orange }}>⚠ Lowering the limit may increase terminations.</div>}
        <div style={{ display: "flex", gap: 6, padding: "10px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, marginTop: 12, fontSize: 12.5, color: C.textSec }}>ℹ️ Changes affect only new events.</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <BtnO onClick={onClose} color={C.textSec}>Cancel</BtnO>
          <Btn disabled={sel === currentBandId} onClick={() => { onConfirm(sel); onClose(); }}>Save Changes</Btn>
        </div>
      </div>
    </div>
  );
};

/* ═══ MAIN APP ═══ */
export default function App() {
  const [showWizard, setShowWizard] = useState(true);
  const [config, setConfig] = useState(null);
  const [inQueue, setInQueue] = useState([]);
  const [failed, setFailed] = useState([]);
  const [logs, setLogs] = useState([]);
  const [tab, setTab] = useState("In Queue");
  const [showInsights, setShowInsights] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");

  const handleCreate = (cfg) => {
    setConfig(cfg);
    setInQueue(generateInQueue(6));
    setFailed(generateFailed(3));
    setLogs(generateLogs(cfg.bandId, 10));
    setShowWizard(false);
    setTab("In Queue");
  };
  const handleChangeBand = (newId) => {
    setConfig(prev => ({ ...prev, bandId: newId }));
    setLogs(generateLogs(newId, 10));
  };

  const band = config ? BANDS.find(b => b.id === config.bandId) : null;
  const cfgApp = config ? APPS.find(a => a.id === config.appId) : null;
  const cfgEnv = config ? (ENV_MAP[config.appId] || []).find(e => e.id === config.envId) : null;

  const currentList = tab === "In Queue" ? inQueue : tab === "Failed" ? failed : logs;
  const filtered = search ? currentList.filter(l =>
    Object.values(l).some(v => String(v).toLowerCase().includes(search.toLowerCase()))
  ) : currentList;

  const allChecked = filtered.length > 0 && filtered.every(l => selected.includes(l.id));

  return (
    <div style={{ fontFamily: font, display: "flex", height: "100vh", background: C.bg, color: C.text, fontSize: 14 }}>
      {/* Sidebar */}
      <div style={{ width: 200, background: C.white, borderRight: `1px solid ${C.border}`, flexShrink: 0, overflowY: "auto" }}>
        <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${C.border}` }}>
          <svg width="22" height="22" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill={C.blue}/><text x="12" y="16" textAnchor="middle" fontSize="11" fill="#fff" fontWeight="700">C</text></svg>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Creator</span>
        </div>
        {[
          ["DEVELOP", [["⚙","Solutions",false],["◎","Microservices",true]]],
          ["DEPLOY", [["🌐","Environments"],["📱","Mobile"],["🚪","Portal"]]],
          ["MANAGE", [["👤","Users"],["🏢","Organization"],["✓","Governance"],["📊","Metrics"],["⚡","Operations"],["💳","Billing"]]],
        ].map(([section, items]) => (
          <div key={section}>
            <div style={{ padding: "16px 16px 6px", fontSize: 11, fontWeight: 600, color: C.textLabel, letterSpacing: "0.06em" }}>{section}</div>
            {items.map(([ic, lb, active]) => (
              <button key={lb} style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 16px",
                background: active ? C.blueLight : "transparent", color: active ? C.blue : C.textSec,
                border: "none", borderLeft: active ? `3px solid ${C.blue}` : "3px solid transparent",
                fontSize: 13.5, fontWeight: active ? 600 : 400, cursor: "pointer", fontFamily: font, textAlign: "left",
              }}><span style={{ fontSize: 15, width: 20, textAlign: "center", opacity: 0.7 }}>{ic}</span>{lb}</button>
            ))}
          </div>
        ))}
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 24px", background: C.white, borderBottom: `1px solid ${C.border}`, flexShrink: 0, minHeight: 54 }}>
          {!config ? (
            <span style={{ fontSize: 15, fontWeight: 600, color: C.textSec }}>Microservices</span>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => { setConfig(null); setShowWizard(true); setShowInsights(false); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.textSec, padding: "2px 6px" }}>←</button>
              <span style={{ width: 36, height: 36, borderRadius: 8, background: cfgApp?.color, color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{cfgApp?.abbr}</span>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{config.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, padding: "2px 8px", borderRadius: 4, background: C.greenLight, color: C.green }}>Active</span>
                </div>
                <div style={{ fontSize: 12, color: C.textSec }}>Endpoint URL: <span style={{ color: C.blue }}>https://www.zohoapis.in/creator/custom/.../{config.linkName}</span> 📋</div>
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            {config && (
              <>
                <BtnO onClick={() => setShowChangeModal(true)}>⚙ Manage Boost</BtnO>
                <BtnO onClick={() => setShowInsights(!showInsights)} color={showInsights ? C.blue : C.textSec}>📊 Insights</BtnO>
                <span style={{ width: 34, height: 34, borderRadius: 4, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 }}>⋯</span>
              </>
            )}
            {!config && <Btn onClick={() => setShowWizard(true)}>+ Create Pipeline</Btn>}
          </div>
        </div>

        {/* Detail view */}
        {config && (
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            {/* Left panel */}
            <div style={{ width: 340, padding: "20px 24px", borderRight: `1px solid ${C.border}`, background: C.white, overflowY: "auto", flexShrink: 0 }}>
              {[
                ["Pipeline Type", config.pipeType === "fifo" ? "FIFO" : "Standard"],
                ["Application", "__app__"],
                ["Environment", cfgEnv?.name],
                ["Namespace", config.namespace],
                ["Function", "__func__"],
                ["Execution Limit", "__band__"],
                ["Failed Processing", "__dlq__"],
                ["Content Type", "application/json"],
                ["Method", "POST"],
                ["Public Key", "__key__"],
              ].map(([k, v]) => (
                <div key={k} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12.5, color: C.textLabel, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                    {k} {(k === "Failed Processing" || k === "Execution Limit") && <span style={{ cursor: "help" }}>ⓘ</span>}
                  </div>
                  {v === "__app__" ? <AppBadge app={cfgApp} /> :
                   v === "__func__" ? <a href="#" onClick={e => e.preventDefault()} style={{ color: C.blue, textDecoration: "none", fontSize: 14 }}>{config.funcName} ↗</a> :
                   v === "__band__" ? (
                     <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                       <span style={{ fontSize: 14, fontWeight: 600 }}>{band?.label}</span>
                       <button onClick={() => setShowChangeModal(true)} style={{ background: "none", border: "none", color: C.blue, fontSize: 12, cursor: "pointer", padding: 0, fontFamily: font, textDecoration: "underline" }}>Change</button>
                     </div>
                   ) :
                   v === "__dlq__" ? <span>Move To DLQ <span style={{ color: C.textLabel, margin: "0 4px" }}>·</span> <a href="#" onClick={e => e.preventDefault()} style={{ color: C.blue, textDecoration: "none" }}>Manage</a></span> :
                   v === "__key__" ? <span style={{ fontSize: 13 }}><a href="#" onClick={e => e.preventDefault()} style={{ color: C.blue, textDecoration: "none" }}>http://creator.zoho.com/...ticket_API</a> 📋</span> :
                   <div style={{ fontSize: 14, fontWeight: 500 }}>{v}</div>
                  }
                </div>
              ))}
              {/* Quota */}
              <div style={{ marginTop: 4, marginBottom: 20 }}>
                <div style={{ fontSize: 12.5, color: C.textLabel, marginBottom: 6 }}>Execution Quota ⓘ</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 6, background: C.borderLight, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: "76%", background: C.blue, borderRadius: 3 }} />
                  </div>
                  <a href="#" onClick={e => e.preventDefault()} style={{ color: C.blue, textDecoration: "none", fontSize: 12, whiteSpace: "nowrap" }}>+ Add Quota</a>
                </div>
                <div style={{ display: "flex", gap: 14, fontSize: 12, marginTop: 6 }}>
                  <span><span style={{ color: C.blue }}>●</span> InQueue <strong>76%</strong></span>
                  <span><span style={{ color: C.textLabel }}>●</span> Available: <strong>09%</strong></span>
                </div>
              </div>
              <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, margin: "0 0 16px" }} />
              <div style={{ fontSize: 12.5, color: C.textLabel, marginBottom: 3 }}>Updated On</div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Oct 11 2022, 12:36 PM</div>
              <div style={{ fontSize: 12.5, color: C.textLabel, marginBottom: 3 }}>Updated By</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Nethandoe@gmail.com</div>
            </div>

            {/* Right: tabs + table */}
            <div style={{ flex: 1, overflowY: "auto", background: C.white, position: "relative" }}>
              {/* Tabs */}
              <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, background: C.white, zIndex: 10 }}>
                {["In Queue", "Failed", "Logs"].map(t => (
                  <button key={t} onClick={() => { setTab(t); setSelected([]); setSearch(""); }} style={{
                    padding: "12px 20px", fontSize: 14, fontWeight: tab === t ? 600 : 400,
                    color: tab === t ? C.blue : C.textSec, background: "none", border: "none",
                    borderBottom: tab === t ? `2px solid ${C.blue}` : "2px solid transparent",
                    cursor: "pointer", fontFamily: font,
                  }}>{t}</button>
                ))}
              </div>

              {/* Search (Logs tab) */}
              {tab === "Logs" && (
                <div style={{ padding: "12px 16px" }}>
                  <div style={{ position: "relative", maxWidth: 280 }}>
                    <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.textLabel, fontSize: 14 }}>🔍</span>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs" style={{
                      width: "100%", padding: "8px 12px 8px 32px", borderRadius: 4, border: `1px solid ${C.border}`,
                      fontSize: 13, fontFamily: font, outline: "none", boxSizing: "border-box",
                    }} />
                  </div>
                </div>
              )}

              {/* Selection bar */}
              {selected.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 16px", background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{selected.length} Row{selected.length > 1 ? "s" : ""} selected</span>
                  <span style={{ color: C.red, fontSize: 13, cursor: "pointer" }}>🗑 Remove</span>
                </div>
              )}

              {/* Table */}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, fontFamily: font }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    <th style={{ padding: "10px 12px", width: 36, textAlign: "center" }}>
                      <Chk checked={allChecked} onChange={() => allChecked ? setSelected([]) : setSelected(filtered.map(l => l.id))} />
                    </th>
                    {tab === "In Queue" && <>
                      <th style={thStyle}>Added Time</th>
                      <th style={thStyle}>Added By</th>
                      <th style={thStyle}>Waiting Duration</th>
                    </>}
                    {tab === "Failed" && <>
                      <th style={thStyle}>Added Time</th>
                      <th style={thStyle}>Added By</th>
                      <th style={thStyle}>Failure Reason</th>
                    </>}
                    {tab === "Logs" && <>
                      <th style={thStyle}>Added Time</th>
                      <th style={thStyle}>Action Completed On</th>
                      <th style={thStyle}>Status</th>
                    </>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(row => (
                    <tr key={row.id} style={{ borderBottom: `1px solid ${C.borderLight}` }}
                      onMouseEnter={e => e.currentTarget.style.background = "#FAFBFC"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <Chk checked={selected.includes(row.id)} onChange={() => setSelected(s => s.includes(row.id) ? s.filter(x => x !== row.id) : [...s, row.id])} />
                      </td>
                      {tab === "In Queue" && <>
                        <td style={tdStyle}>{fmtDate(row.time)}</td>
                        <td style={{ ...tdStyle, color: C.textSec }}>{row.user}</td>
                        <td style={tdStyle}>{fmtWait(row.waitDuration)}</td>
                      </>}
                      {tab === "Failed" && <>
                        <td style={tdStyle}>{fmtDate(row.time)}</td>
                        <td style={{ ...tdStyle, color: C.textSec }}>{row.user}</td>
                        <td style={{ ...tdStyle, color: C.red, fontSize: 12.5 }}>{row.reason}</td>
                      </>}
                      {tab === "Logs" && <>
                        <td style={tdStyle}>{fmtDate(row.addedTime)}</td>
                        <td style={tdStyle}>{fmtDate(row.completedTime)}</td>
                        <td style={tdStyle}>
                          <span style={{ fontSize: 12, fontWeight: 500, padding: "2px 8px", borderRadius: 4, background: row.status === "Success" ? C.greenLight : C.redLight, color: row.status === "Success" ? C.green : C.red }}>
                            {row.status}
                          </span>
                        </td>
                      </>}
                    </tr>
                  ))}
                  {filtered.length === 0 && <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: C.textLabel }}>No data found.</td></tr>}
                </tbody>
              </table>

              {/* Insights slide-out */}
              <InsightsPanel open={showInsights} onClose={() => setShowInsights(false)} logs={logs} band={band} config={config} />
            </div>
          </div>
        )}

        {!config && !showWizard && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", color: C.textSec }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📡</div>
              <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No pipelines yet</p>
              <p style={{ fontSize: 13 }}>Create your first event pipeline to get started.</p>
            </div>
          </div>
        )}
      </div>

      {showWizard && <CreationWizard onClose={() => { if (config) setShowWizard(false); }} onCreate={handleCreate} />}
      {config && <ChangeBandModal open={showChangeModal} onClose={() => setShowChangeModal(false)} currentBandId={config.bandId} onConfirm={handleChangeBand} />}
    </div>
  );
}

const thStyle = { padding: "10px 12px", textAlign: "left", fontSize: 13, fontWeight: 500, color: "#8B8FA3" };
const tdStyle = { padding: "10px 12px" };
