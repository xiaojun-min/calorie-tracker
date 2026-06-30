export default function RecentFoods({ entries, onAdd, loading }) {
  // Deduplicate by name, keeping the most recent occurrence of each food
  const recent = [];
  const seen = new Set();
  for (const e of entries) {
    if (!seen.has(e.name)) {
      seen.add(e.name);
      recent.push(e);
      if (recent.length === 4) break;
    }
  }

  if (recent.length === 0) return null;

  function relog(entry) {
    onAdd({
      manualNutrition: {
        name:          entry.name,
        emoji:         entry.emoji,
        calories:      entry.calories,
        protein:       entry.protein,
        carbs:         entry.carbs,
        fat:           entry.fat,
        fiber:         entry.fiber  ?? 0,
        sugar:         entry.sugar  ?? 0,
        sodium:        entry.sodium ?? 0,
        saturated_fat: entry.saturated_fat ?? 0,
        health_rating: entry.health_rating ?? null,
      },
    });
  }

  return (
    <div className="recent-foods">
      <p className="recent-foods-label">Quick add</p>
      <div className="recent-foods-list">
        {recent.map((e) => (
          <button
            key={e.id}
            type="button"
            className="recent-food-chip"
            onClick={() => relog(e)}
            disabled={loading}
          >
            <span className="recent-food-emoji">{e.emoji}</span>
            <span className="recent-food-name">{e.name}</span>
            <span className="recent-food-cal">{e.calories} kcal</span>
          </button>
        ))}
      </div>
    </div>
  );
}
