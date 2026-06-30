import { useState, useEffect } from "react";
import { toDisplay, toKg } from "../utils/weight";

function getToday() {
  return new Date().toLocaleDateString("en-CA");
}

function shortDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function WeightChart({ data, unit }) {
  if (data.length < 2) return null;

  const W = 320;
  const H = 160;
  const pad = { top: 14, right: 12, bottom: 28, left: 44 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;

  // Convert to display unit for the chart
  const displayData = data.map((d) => ({ ...d, w: toDisplay(d.weight, unit) }));
  const weights = displayData.map((d) => d.w);
  const rawMin = Math.min(...weights);
  const rawMax = Math.max(...weights);
  const padding = Math.max((rawMax - rawMin) * 0.25, unit === "lb" ? 1 : 0.5);
  const minW = rawMin - padding;
  const maxW = rawMax + padding;
  const wRange = maxW - minW;

  const px = (i) => pad.left + (i / (displayData.length - 1)) * cW;
  const py = (w) => pad.top + cH - ((w - minW) / wRange) * cH;

  const yLabels = [rawMin, (rawMin + rawMax) / 2, rawMax].map(
    (v) => (unit === "lb" ? Math.round(v * 2) / 2 : Math.round(v * 10) / 10)
  );

  const maxLabels = Math.min(displayData.length, 5);
  const xIdxs = Array.from({ length: maxLabels }, (_, i) =>
    Math.round((i / (maxLabels - 1)) * (displayData.length - 1))
  );

  const linePath = displayData
    .map((d, i) => `${i === 0 ? "M" : "L"} ${px(i).toFixed(1)} ${py(d.w).toFixed(1)}`)
    .join(" ");

  const areaPath =
    `${linePath} L ${px(displayData.length - 1).toFixed(1)} ${(pad.top + cH).toFixed(1)} ` +
    `L ${pad.left} ${(pad.top + cH).toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {yLabels.map((val, i) => (
        <g key={i}>
          <line
            x1={pad.left} y1={py(val).toFixed(1)}
            x2={pad.left + cW} y2={py(val).toFixed(1)}
            stroke="rgba(0,0,0,0.07)" strokeWidth="1"
          />
          <text x={pad.left - 5} y={py(val) + 4} textAnchor="end" fontSize="9.5" fill="#999">
            {val}
          </text>
        </g>
      ))}

      {xIdxs.map((i) => (
        <text key={i} x={px(i).toFixed(1)} y={H - 5} textAnchor="middle" fontSize="9" fill="#999">
          {shortDate(displayData[i].date)}
        </text>
      ))}

      <path d={areaPath} fill="rgba(255,107,71,0.10)" />
      <path d={linePath} fill="none" stroke="#FF6B47" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {displayData.map((d, i) => (
        <circle key={d.id} cx={px(i).toFixed(1)} cy={py(d.w).toFixed(1)}
          r="4" fill="white" stroke="#FF6B47" strokeWidth="2.5" />
      ))}
    </svg>
  );
}

const RANGES = [
  { key: "7d",  label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "all", label: "All time" },
];

export default function WeightTracker() {
  const [entries, setEntries] = useState(() => {
    try { return JSON.parse(localStorage.getItem("weight_entries") || "[]"); }
    catch { return []; }
  });
  const [unit, setUnit] = useState(() => localStorage.getItem("weight_unit") || "kg");
  const [weightInput, setWeightInput] = useState("");
  const [editing, setEditing] = useState(false);
  const [range, setRange] = useState("30d");

  useEffect(() => {
    try { localStorage.setItem("weight_entries", JSON.stringify(entries)); }
    catch {}
  }, [entries]);

  useEffect(() => {
    localStorage.setItem("weight_unit", unit);
  }, [unit]);

  const today = getToday();
  const todayEntry = entries.find((e) => e.date === today);

  function handleSave() {
    const val = parseFloat(weightInput);
    if (!val || val <= 0) return;
    const kg = toKg(val, unit);
    if (todayEntry) {
      setEntries((prev) => prev.map((e) => (e.date === today ? { ...e, weight: kg } : e)));
    } else {
      setEntries((prev) => [
        ...prev,
        {
          id: Date.now(),
          date: today,
          weight: kg,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
    setWeightInput("");
    setEditing(false);
  }

  function handleDelete(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function switchUnit(newUnit) {
    // Convert any in-progress input value to the new unit
    if (weightInput) {
      const val = parseFloat(weightInput);
      if (val > 0) {
        const kg = toKg(val, unit);
        setWeightInput(String(toDisplay(kg, newUnit)));
      }
    }
    setUnit(newUnit);
  }

  // Sorted ascending for chart + diffs
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  // Diffs in kg between consecutive days
  const diffs = {};
  for (let i = 1; i < sorted.length; i++) {
    diffs[sorted[i].id] = sorted[i].weight - sorted[i - 1].weight;
  }

  // Chart data filtered by range
  const cutoff = new Date();
  if (range === "7d") cutoff.setDate(cutoff.getDate() - 6);
  else if (range === "30d") cutoff.setDate(cutoff.getDate() - 29);
  else cutoff.setFullYear(2000);
  const cutoffStr = cutoff.toLocaleDateString("en-CA");
  const chartData = sorted.filter((e) => e.date >= cutoffStr);

  const latest = sorted[sorted.length - 1];
  const rangeFirst = chartData[0];
  const rangeLast = chartData[chartData.length - 1];
  const netChangeKg =
    rangeFirst && rangeLast && rangeFirst !== rangeLast
      ? rangeLast.weight - rangeFirst.weight
      : null;

  const netChangeDisplay = netChangeKg !== null
    ? toDisplay(Math.abs(netChangeKg), unit)
    : null;

  const placeholder = unit === "lb" ? "e.g. 145" : "e.g. 65.5";
  const step = unit === "lb" ? "0.5" : "0.1";

  return (
    <div className="weight-page">
      {/* Log today's weight */}
      <div className="weight-log-card">
        <div className="weight-log-header">
          <span className="weight-log-title">⚖️ Today&apos;s Weight</span>
          <div className="unit-toggle">
            <button
              className={`unit-btn ${unit === "kg" ? "active" : ""}`}
              onClick={() => switchUnit("kg")}
            >kg</button>
            <button
              className={`unit-btn ${unit === "lb" ? "active" : ""}`}
              onClick={() => switchUnit("lb")}
            >lb</button>
          </div>
        </div>

        {todayEntry && !editing ? (
          <div className="weight-today-display">
            <div className="weight-today-values">
              <span className="weight-today-val">{toDisplay(todayEntry.weight, unit)}</span>
              <span className="weight-today-unit">{unit}</span>
            </div>
            <div className="weight-today-secondary">
              {unit === "kg"
                ? <span className="weight-secondary-val">{toDisplay(todayEntry.weight, "lb")} lb</span>
                : <span className="weight-secondary-val">{toDisplay(todayEntry.weight, "kg")} kg</span>
              }
              <button className="edit-btn" onClick={() => { setWeightInput(String(toDisplay(todayEntry.weight, unit))); setEditing(true); }}>
                ✏️
              </button>
            </div>
          </div>
        ) : (
          <div className="weight-input-row">
            <input
              type="number"
              className="weight-input"
              placeholder={placeholder}
              step={step}
              min={unit === "lb" ? "44" : "20"}
              max={unit === "lb" ? "1100" : "500"}
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus={editing}
            />
            <span className="weight-input-unit">{unit}</span>
            <button
              className="weight-save-btn"
              onClick={handleSave}
              disabled={!weightInput || parseFloat(weightInput) <= 0}
            >
              Save
            </button>
            {editing && (
              <button className="edit-cancel-btn" onClick={() => { setEditing(false); setWeightInput(""); }}>
                Cancel
              </button>
            )}
          </div>
        )}
      </div>

      {/* Chart */}
      {entries.length > 0 && (
        <div className="weekly-chart-card">
          <div className="weight-chart-header">
            <h3 className="chart-title">Weight Over Time</h3>
            {netChangeDisplay !== null && (
              <span className={`weight-net-change ${netChangeKg > 0 ? "up" : netChangeKg < 0 ? "down" : "same"}`}>
                {netChangeKg > 0 ? "+" : netChangeKg < 0 ? "−" : ""}{netChangeDisplay} {unit}
              </span>
            )}
          </div>

          <div className="macro-tabs">
            {RANGES.map(({ key, label }) => (
              <button
                key={key}
                className={`macro-tab ${range === key ? "active" : ""}`}
                style={range === key ? { background: "#FF6B47", borderColor: "#FF6B47" } : {}}
                onClick={() => setRange(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {chartData.length < 2 ? (
            <p className="chart-goal-note">Log at least 2 days to see the chart.</p>
          ) : (
            <>
              <WeightChart data={chartData} unit={unit} />
              {latest && (
                <p className="chart-goal-note">
                  Latest: <strong>{toDisplay(latest.weight, unit)} {unit}</strong> on {shortDate(latest.date)}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* History */}
      {entries.length === 0 ? (
        <div className="empty-state">
          <span className="empty-emoji">⚖️</span>
          <p>No weight logged yet. Enter your weight above to start tracking!</p>
        </div>
      ) : (
        <div className="weight-history-card">
          <h3 className="chart-title">History</h3>
          <div className="weight-history-list">
            {[...sorted].reverse().map((entry) => {
              const diffKg = diffs[entry.id];
              const diffDisplay = diffKg !== undefined
                ? toDisplay(Math.abs(diffKg), unit)
                : null;
              return (
                <div key={entry.id} className="weight-history-row">
                  <div className="weight-history-left">
                    <span className="weight-history-date">{formatDate(entry.date)}</span>
                    <span className="weight-history-both">
                      {unit === "kg"
                        ? `${toDisplay(entry.weight, "lb")} lb`
                        : `${toDisplay(entry.weight, "kg")} kg`}
                    </span>
                  </div>
                  <div className="weight-history-right">
                    {diffKg !== undefined && (
                      <span className={`weight-diff ${diffKg > 0 ? "up" : diffKg < 0 ? "down" : "same"}`}>
                        {diffKg > 0 ? "▲" : diffKg < 0 ? "▼" : "—"} {diffDisplay}
                      </span>
                    )}
                    <span className="weight-history-val">{toDisplay(entry.weight, unit)} {unit}</span>
                    <button className="delete-btn" onClick={() => handleDelete(entry.id)} aria-label="Delete">🗑</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
