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
  // If no entries today, start counting from yesterday
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

export default function Reports({ entries, onDelete, calorieGoal = 0 }) {
  const grouped = entries.reduce((acc, e) => {
    const key = e.date || "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  const last7 = getLastNDates(7);
  const dailyTotals = last7.map((date) => ({
    date,
    calories: (grouped[date] || []).reduce((s, e) => s + (e.calories || 0), 0),
  }));

  const maxCal = Math.max(...dailyTotals.map((d) => d.calories), calorieGoal || 0, 500);

  // Summary stats
  const datesWithEntries = Object.keys(grouped).filter((d) => grouped[d].length > 0);
  const totalEntries = entries.length;
  const avgCalories =
    datesWithEntries.length > 0
      ? Math.round(
          datesWithEntries.reduce(
            (s, d) => s + grouped[d].reduce((a, e) => a + (e.calories || 0), 0),
            0
          ) / datesWithEntries.length
        )
      : 0;
  const streak = getStreak(grouped);

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="reports-page">
      {/* Summary cards */}
      <div className="reports-summary">
        <div className="summary-stat">
          <span className="summary-value">{streak}</span>
          <span className="summary-label">Day streak</span>
        </div>
        <div className="summary-stat">
          <span className="summary-value">{avgCalories || "—"}</span>
          <span className="summary-label">Avg kcal/day</span>
        </div>
        <div className="summary-stat">
          <span className="summary-value">{totalEntries}</span>
          <span className="summary-label">Total entries</span>
        </div>
      </div>

      {/* Weekly bar chart */}
      <div className="weekly-chart-card">
        <h3 className="chart-title">Last 7 Days</h3>
        <div className="weekly-chart">
          {dailyTotals.map(({ date, calories }) => {
            const heightPct = maxCal > 0 ? Math.round((calories / maxCal) * 100) : 0;
            const calPct = calorieGoal > 0 ? calories / calorieGoal : 0;
            const barClass =
              calories === 0 ? "empty" : calPct >= 1 ? "over" : calPct >= 0.85 ? "warn" : "good";
            const dayName = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "short",
            });
            return (
              <div key={date} className="chart-col">
                <span className="chart-cal-label">{calories > 0 ? Math.round(calories) : ""}</span>
                <div className="chart-bar-track">
                  <div
                    className={`chart-bar-fill ${barClass}`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span className="chart-day-label">{dayName}</span>
              </div>
            );
          })}
        </div>
        {calorieGoal > 0 && (
          <p className="chart-goal-note">Goal: {calorieGoal} kcal/day</p>
        )}
      </div>

      {/* Entry history */}
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
            const total = dayEntries.reduce((s, e) => s + (e.calories || 0), 0);
            return (
              <div key={date} className="history-group">
                <div className="history-date-header">
                  <span className="history-date-label">{formatDate(date)}</span>
                  <span className="history-date-total">{Math.round(total)} kcal</span>
                </div>
                <div className="entries-list">
                  {dayEntries.map((entry) => (
                    <FoodCard key={entry.id} entry={entry} onDelete={onDelete} />
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
