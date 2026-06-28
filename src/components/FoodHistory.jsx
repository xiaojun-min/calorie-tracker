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

export default function FoodHistory({ entries, onDelete }) {
  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-emoji">📷</span>
        <p>No food history yet. Start logging meals!</p>
      </div>
    );
  }

  const grouped = entries.reduce((acc, entry) => {
    const key = entry.date || "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="history-list">
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
  );
}
