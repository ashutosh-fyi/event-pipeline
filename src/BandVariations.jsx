import { useState, useRef, useEffect } from "react";

/* ═══ SHARED DATA ═══ */
const BANDS = Array.from({ length: 12 }, (_, i) => ({
  id: `band_0_${(i + 1) * 5}`, lower: 0, upper: (i + 1) * 5,
  label: `Up to ${(i + 1) * 5}s`,
}));
const BAND_GROUPS = [
  { label: "Quick", desc: "Webhooks, cache lookups, simple validations", range: "up to 15s", bands: BANDS.slice(0, 3), color: "#22C55E" },
  { label: "Standard", desc: "API calls, DB queries, moderate processing", range: "up to 30s", bands: BANDS.slice(3, 6), color: "#3B82F6" },
  { label: "Extended", desc: "Multi-step workflows, external service chains", range: "up to 45s", bands: BANDS.slice(6, 9), color: "#F59E0B" },
  { label: "Heavy", desc: "Large data transforms, report generation", range: "up to 60s", bands: BANDS.slice(9, 12), color: "#EF4444" },
];
const C = {
  bg: "#F4F5F7", white: "#FFFFFF", border: "#E4E7EC", borderLight: "#EEF0F4",
  text: "#1A1A1A", textSec: "#6B7280", textLabel: "#8B8FA3",
  blue: "#1B6AC9", blueLight: "#E8F0FE", blueBorder: "#B8D4F5",
};
const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

function getGroup(bandId) {
  return BAND_GROUPS.find(g => g.bands.some(b => b.id === bandId));
}
function getBand(bandId) {
  return BANDS.find(b => b.id === bandId);
}

/* ═══ VARIATION A: Horizontal Slider ═══ */
const SliderSelector = ({ value, onChange }) => {
  const trackRef = useRef(null);
  const idx = BANDS.findIndex(b => b.id === value);
  const activeIdx = idx >= 0 ? idx : 0;
  const band = BANDS[activeIdx];
  const group = getGroup(band.id);

  const handleClick = (e) => {
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const pct = x / rect.width;
    const snapIdx = Math.round(pct * (BANDS.length - 1));
    onChange(BANDS[Math.max(0, Math.min(snapIdx, BANDS.length - 1))].id);
  };

  return (
    <div style={{ maxWidth: 440 }}>
      {/* Tier labels */}
      <div style={{ display: "flex", marginBottom: 8 }}>
        {BAND_GROUPS.map(g => (
          <div key={g.label} style={{ flex: 1, textAlign: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: g.color }}>{g.label}</span>
          </div>
        ))}
      </div>

      {/* Track */}
      <div ref={trackRef} onClick={handleClick} style={{ position: "relative", height: 40, cursor: "pointer", userSelect: "none" }}>
        {/* Background track */}
        <div style={{ position: "absolute", top: 16, left: 0, right: 0, height: 8, borderRadius: 4, background: C.borderLight, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${((activeIdx + 1) / BANDS.length) * 100}%`, borderRadius: 4, background: `linear-gradient(90deg, #22C55E, #3B82F6, #F59E0B, #EF4444)`, backgroundSize: "440px 8px", transition: "width 0.15s ease" }} />
        </div>

        {/* Tick marks */}
        {BANDS.map((b, i) => {
          const left = `${(i / (BANDS.length - 1)) * 100}%`;
          const isGroupBoundary = i === 0 || i === 3 || i === 6 || i === 9;
          return (
            <div key={b.id} style={{ position: "absolute", left, top: isGroupBoundary ? 10 : 13, width: 2, height: isGroupBoundary ? 20 : 14, background: i <= activeIdx ? group.color : C.border, borderRadius: 1, transform: "translateX(-1px)", transition: "background 0.15s" }} />
          );
        })}

        {/* Thumb */}
        <div style={{
          position: "absolute", left: `${(activeIdx / (BANDS.length - 1)) * 100}%`, top: 8,
          width: 24, height: 24, borderRadius: "50%", background: C.white,
          border: `3px solid ${group.color}`, transform: "translateX(-12px)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.15)", transition: "left 0.15s ease",
        }} />
      </div>

      {/* Scale labels */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        {[0, 15, 30, 45, 60].map(s => (
          <span key={s} style={{ fontSize: 11, color: C.textLabel }}>{s}s</span>
        ))}
      </div>

      {/* Current value display */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, padding: "10px 14px", background: C.bg, borderRadius: 6, border: `1px solid ${C.border}` }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: group.color }} />
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>0 – {band.upper}s</span>
          <span style={{ fontSize: 12, color: C.textSec, marginLeft: 8 }}>{group.label}</span>
        </div>
        <span style={{ fontSize: 12, color: C.textSec }}>{group.desc}</span>
      </div>
    </div>
  );
};

/* ═══ VARIATION B: Visual Tier Cards ═══ */
const TierCardSelector = ({ value, onChange }) => {
  const group = getGroup(value);
  const selGroupIdx = group ? BAND_GROUPS.indexOf(group) : -1;

  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
        {BAND_GROUPS.map((g, gi) => {
          const active = gi === selGroupIdx;
          return (
            <button key={g.label} onClick={() => onChange(g.bands[0].id)} style={{
              padding: "12px 10px", borderRadius: 8, cursor: "pointer", fontFamily: font,
              border: `2px solid ${active ? g.color : C.border}`,
              background: active ? `${g.color}0D` : C.white,
              textAlign: "center", transition: "all 0.15s",
            }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>
                {gi === 0 ? "⚡" : gi === 1 ? "🔄" : gi === 2 ? "🔗" : "🏋️"}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: active ? g.color : C.text, marginBottom: 2 }}>{g.label}</div>
              <div style={{ fontSize: 11, color: C.textSec }}>{g.range}</div>
            </button>
          );
        })}
      </div>

      {/* Fine-tune within selected group */}
      {selGroupIdx >= 0 && (
        <div style={{ padding: "12px 14px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.white }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textSec, marginBottom: 4 }}>Fine-tune within {BAND_GROUPS[selGroupIdx].label}</div>
          <p style={{ fontSize: 12, color: C.textLabel, margin: "0 0 10px" }}>{BAND_GROUPS[selGroupIdx].desc}</p>
          <div style={{ display: "flex", gap: 6 }}>
            {BAND_GROUPS[selGroupIdx].bands.map(band => {
              const a = value === band.id;
              return (
                <button key={band.id} onClick={() => onChange(band.id)} style={{
                  flex: 1, padding: "10px 8px", borderRadius: 6, cursor: "pointer", fontFamily: font,
                  border: `2px solid ${a ? BAND_GROUPS[selGroupIdx].color : C.border}`,
                  background: a ? `${BAND_GROUPS[selGroupIdx].color}12` : C.white,
                  fontSize: 13, fontWeight: a ? 700 : 400,
                  color: a ? BAND_GROUPS[selGroupIdx].color : C.text,
                }}>0 – {band.upper}s</button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══ VARIATION C: Single Flat List ═══ */
const FlatListSelector = ({ value, onChange }) => {
  return (
    <div style={{ maxWidth: 440, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
      {BAND_GROUPS.map((group, gi) => (
        <div key={group.label}>
          {/* Tier divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: C.bg, borderBottom: `1px solid ${C.border}`, borderTop: gi > 0 ? `1px solid ${C.border}` : "none" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: group.color }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{group.label}</span>
            <span style={{ fontSize: 11, color: C.textSec }}>— {group.desc}</span>
          </div>
          {group.bands.map((band, bi) => {
            const a = value === band.id;
            return (
              <button key={band.id} onClick={() => onChange(band.id)} style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "11px 14px",
                background: a ? `${group.color}0D` : C.white, border: "none",
                borderBottom: (gi < BAND_GROUPS.length - 1 || bi < group.bands.length - 1) ? `1px solid ${C.borderLight}` : "none",
                cursor: "pointer", fontFamily: font, fontSize: 13.5, textAlign: "left",
                borderLeft: a ? `3px solid ${group.color}` : "3px solid transparent",
              }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${a ? group.color : C.border}`, background: a ? group.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {a && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
                </span>
                <span style={{ fontWeight: a ? 600 : 400, color: a ? C.text : C.textSec, minWidth: 72, fontVariantNumeric: "tabular-nums" }}>0 – {band.upper}s</span>
                <span style={{ flex: 1, height: 4, borderRadius: 2, background: C.borderLight, overflow: "hidden" }}>
                  <span style={{ display: "block", height: "100%", width: `${(band.upper / 60) * 100}%`, background: a ? group.color : "#CBD5E1", borderRadius: 2, transition: "background 0.15s" }} />
                </span>
                <span style={{ fontSize: 12, color: C.textLabel, minWidth: 44, textAlign: "right" }}>max {band.upper}s</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/* ═══ VARIATION D: Segmented Bar ═══ */
const SegmentedBarSelector = ({ value, onChange }) => {
  const idx = BANDS.findIndex(b => b.id === value);
  const activeIdx = idx >= 0 ? idx : -1;
  const band = activeIdx >= 0 ? BANDS[activeIdx] : null;
  const group = band ? getGroup(band.id) : null;

  return (
    <div style={{ maxWidth: 440 }}>
      {/* Tier labels above bar */}
      <div style={{ display: "flex", marginBottom: 6 }}>
        {BAND_GROUPS.map(g => (
          <div key={g.label} style={{ flex: 3, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: g.color }}>{g.label}</span>
            <span style={{ fontSize: 10, color: C.textLabel }}>{g.range}</span>
          </div>
        ))}
      </div>

      {/* Segmented bar */}
      <div style={{ display: "flex", gap: 2, padding: "2px", background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
        {BANDS.map((b, i) => {
          const g = getGroup(b.id);
          const active = i === activeIdx;
          const filled = i <= activeIdx;
          return (
            <button key={b.id} onClick={() => onChange(b.id)} style={{
              flex: 1, height: 36, border: "none", cursor: "pointer",
              borderRadius: 6, fontFamily: font,
              background: active ? g.color : filled ? `${g.color}25` : "transparent",
              color: active ? "#fff" : filled ? g.color : C.textLabel,
              fontSize: 11, fontWeight: active ? 700 : 500,
              transition: "all 0.15s ease",
              position: "relative",
            }}>
              {b.upper}
            </button>
          );
        })}
      </div>

      {/* Scale */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, padding: "0 2px" }}>
        <span style={{ fontSize: 10, color: C.textLabel }}>0s</span>
        <span style={{ fontSize: 10, color: C.textLabel }}>60s</span>
      </div>

      {/* Selected info */}
      {band && group && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, padding: "10px 14px", background: `${group.color}08`, borderRadius: 8, border: `1px solid ${group.color}30` }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: `${group.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: group.color }}>{band.upper}</span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Events can run up to {band.upper} seconds</div>
            <div style={{ fontSize: 12, color: C.textSec }}>{group.label} — {group.desc}</div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══ COMPARISON PAGE ═══ */
export default function BandVariations() {
  const [vA, setVA] = useState("band_0_15");
  const [vB, setVB] = useState("band_0_15");
  const [vC, setVC] = useState("band_0_15");
  const [vD, setVD] = useState("band_0_15");

  const Card = ({ title, subtitle, children }) => (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "24px 28px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.text }}>{title}</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textSec }}>{subtitle}</p>
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ fontFamily: font, background: C.bg, minHeight: "100vh", padding: "32px 40px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Execution Limit Selector — Layout Variations</h1>
        <p style={{ fontSize: 14, color: C.textSec, marginBottom: 32 }}>Compare all 4 approaches. Each is fully interactive.</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <Card title="A. Horizontal Slider" subtitle="Drag/click to pick a limit. Snap points at every 5s increment.">
            <SliderSelector value={vA} onChange={setVA} />
          </Card>

          <Card title="B. Visual Tier Cards" subtitle="Pick a tier first, then fine-tune the exact limit within it.">
            <TierCardSelector value={vB} onChange={setVB} />
          </Card>

          <Card title="C. Single Flat List" subtitle="All 12 options in one scrollable list with tier dividers.">
            <FlatListSelector value={vC} onChange={setVC} />
          </Card>

          <Card title="D. Segmented Bar" subtitle="Click a segment — the bar fills up to that point.">
            <SegmentedBarSelector value={vD} onChange={setVD} />
          </Card>
        </div>
      </div>
    </div>
  );
}
