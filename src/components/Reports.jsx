import { useState } from "react";
import FoodCard from "./FoodCard";

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function getLastNDates(n) {
  const dates = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(d.toLocaleDateString("en-CA"));
  }
  return dates;
}

function getStreak(grouped) {
  let streak = 0;
  const check = new Date();
  const today = check.toLocaleDateString("en-CA");
  if (!grouped[today]?.length) check.setDate(check.getDate() - 1);
  while (true) {
    const dateStr = check.toLocaleDateString("en-CA");
    if (grouped[dateStr]?.length > 0) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function sumDay(entries, key) {
  return entries.reduce((s, e) => s + (e[key] || 0), 0);
}

const MACROS = [
  { key: "calories", label: "Cal", unit: "kcal", color: "#FF6B47" },
  { key: "protein",  label: "Protein", unit: "g",    color: "#4CAF50" },
  { key: "carbs",    label: "Carbs",   unit: "g",    color: "#2196F3" },
  { key: "fat",      label: "Fat",     unit: "g",    color: "#FF9800" },
  { key: "fiber",    label: "Fiber",   unit: "g",    color: "#7CB342" },
  { key: "sodium",   label: "Sodium",  unit: "mg",   color: "#8E24AA" },
];

export default function Reports({ entries, onDelete, onEdit, calorieGoal = 0, nutritionGoals = null }) {
  const [chartMacro, setChartMacro] = useState("calories");

  const grouped = entries.reduce((acc, e) => {
    const key = e.date || "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  const last7 = getLastNDates(7);

  // All macros per day for the last 7 days
  const dailyTotals = last7.map((date) => {
    const es = grouped[date] || [];
    return {
      date,
      calories:      sumDay(es, "calories"),
      protein:       sumDay(es, "protein"),
      carbs:         sumDay(es, "carbs"),
      fat:           sumDay(es, "fat"),
      fiber:         sumDay(es, "fiber"),
      sugar:         sumDay(es, "sugar"),
      sodium:        sumDay(es, "sodium"),
      saturated_fat: sumDay(es, "saturated_fat"),
    };
  });

  // 7-day averages (only over days that have data)
  const daysWithData = dailyTotals.filter((d) => d.calories > 0);
  const weeklyAvg = daysWithData.length > 0
    ? Object.fromEntries(
        MACROS.map(({ key }) => [
          key,
          Math.round(daysWithData.reduce((s, d) => s + (d[key] || 0), 0) / daysWithData.length),
        ])
      )
    : null;

  // Chart for selected macro
  const activeMacro = MACROS.find((m) => m.key === chartMacro) || MACROS[0];
  const chartVals = dailyTotals.map((d) => d[chartMacro] || 0);
  const chartGoal = chartMacro === "calories" ? calorieGoal : (nutritionGoals?.[chartMacro] || 0);
  const maxVal = Math.max(...chartVals, chartGoal || 0, 1);

  // Summary
  const datesWithEntries = Object.keys(grouped).filter((d) => grouped[d].length > 0);
  const totalEntries = entries.length;
  const streak = getStreak(grouped);

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="reports-page">
      {/* Top summary row */}
      <div className="reports-summary">
        <div className="summary-stat">
          <span className="summary-value">{streak}</span>
          <span className="summary-label">Day streak</span>
        </div>
        <div className="summary-stat">
          <span className="summary-value">{datesWithEntries.length}</span>
          <span className="summary-label">Days logged</span>
        </div>
        <div className="summary-stat">
          <span className="summary-value">{totalEntries}</span>
          <span className="summary-label">Total entries</span>
        </div>
      </div>

      {/* 7-day averages */}
      {weeklyAvg && (
        <div className="weekly-chart-card">
          <h3 className="chart-title">7-Day Averages</h3>
          <div className="avg-grid">
            {MACROS.map(({ key, label, unit, color }) => {
              const val = weeklyAvg[key] || 0;
              const goal = key === "calories" ? calorieGoal : (nutritionGoals?.[key] || 0);
              const over = goal > 0 && val > goal;
              return (
                <div key={key} className="avg-item">
                  <span className="avg-val" style={{ color: over ? "#E53935" : color }}>
                    {val}
                  </span>
                  <span className="avg-unit">{unit}</span>
                  <span className="avg-label">{label}</span>
                  {goal > 0 && (
                    <span className="avg-goal" style={{ color: over ? "#E53935" : "var(--text-muted)" }}>
                      / {goal}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly bar chart with macro selector */}
      <div className="weekly-chart-card">
        <h3 className="chart-title">Last 7 Days</h3>
        <div className="macro-tabs">
          {MACROS.map(({ key, label, color }) => (
            <button
              key={key}
              type="button"
              className={`macro-tab ${chartMacro === key ? "active" : ""}`}
              style={chartMacro === key ? { background: color, borderColor: color } : {}}
              onClick={() => setChartMacro(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="weekly-chart">
          {dailyTotals.map((day) => {
            const val = day[chartMacro] || 0;
            const heightPct = Math.round((val / maxVal) * 100);
            const goalPct = chartGoal > 0 ? val / chartGoal : 0;
            const isOver = chartGoal > 0 && goalPct >= 1;
            const dayName = new Date(day.date + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "short",
            });
            return (
              <div key={day.date} className="chart-col">
                <span className="chart-cal-label">
                  {val > 0 ? Math.round(val) : ""}
                </span>
                <div className="chart-bar-track">
                  <div
                    className="chart-bar-fill"
                    style={{
                      height: `${heightPct}%`,
                      background: val === 0 ? "transparent" : isOver ? "#E53935" : activeMacro.color,
                    }}
                  />
                </div>
                <span className="chart-day-label">{dayName}</span>
              </div>
            );
          })}
        </div>
        {chartGoal > 0 && (
          <p className="chart-goal-note">
            Goal: {chartGoal} {activeMacro.unit}/{activeMacro.label === "Cal" ? "day" : "day"}
          </p>
        )}
      </div>

      {/* Entry history with per-day nutrition breakdown */}
      {sortedDates.length === 0 ? (
        <div className="empty-state">
          <span className="empty-emoji">📷</span>
          <p>No food history yet. Start logging meals!</p>
        </div>
      ) : (
        <div className="history-list">
          <p className="history-device-note">
            📱 History is saved on this device only. Entries logged on another browser won&apos;t appear here.
          </p>
          {sortedDates.map((date) => {
            const dayEntries = grouped[date];
            const es = dayEntries;
            const dayTotal = {
              calories:      Math.round(sumDay(es, "calories")),
              protein:       Math.round(sumDay(es, "protein")),
              carbs:         Math.round(sumDay(es, "carbs")),
              fat:           Math.round(sumDay(es, "fat")),
              fiber:         Math.round(sumDay(es, "fiber")),
              sodium:        Math.round(sumDay(es, "sodium")),
              saturated_fat: Math.round(sumDay(es, "saturated_fat")),
            };
            return (
              <div key={date} className="history-group">
                <div className="history-date-header">
                  <span className="history-date-label">{formatDate(date)}</span>
                  <span className="history-date-total">{dayTotal.calories} kcal</span>
                </div>
                <div className="day-nutrition-row">
                  <span style={{ color: "#4CAF50" }}>P {dayTotal.protein}g</span>
                  <span style={{ color: "#2196F3" }}>C {dayTotal.carbs}g</span>
                  <span style={{ color: "#FF9800" }}>F {dayTotal.fat}g</span>
                  <span style={{ color: "#7CB342" }}>Fiber {dayTotal.fiber}g</span>
                  <span style={{ color: "#8E24AA" }}>Na {dayTotal.sodium}mg</span>
                </div>
                <div className="entries-list">
                  {dayEntries.map((entry) => (
                    <FoodCard key={entry.id} entry={entry} onDelete={onDelete} onEdit={onEdit} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
