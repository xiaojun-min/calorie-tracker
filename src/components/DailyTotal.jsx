export default function DailyTotal({ entries, calorieGoal = 0 }) {
  const total = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      protein: acc.protein + (e.protein || 0),
      carbs: acc.carbs + (e.carbs || 0),
      fat: acc.fat + (e.fat || 0),
      fiber: acc.fiber + (e.fiber || 0),
      sugar: acc.sugar + (e.sugar || 0),
      sodium: acc.sodium + (e.sodium || 0),
      saturated_fat: acc.saturated_fat + (e.saturated_fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0, saturated_fat: 0 }
  );

  const pct = calorieGoal > 0 ? Math.round((total.calories / calorieGoal) * 100) : 0;

  return (
    <div className="daily-total">
      <h2 className="daily-total-title">📊 Today&apos;s Total</h2>
      <div className="nutrition-grid total-grid">
        <div className="nutrition-item calories total-item">
          <span className="nutrition-value total-value">{Math.round(total.calories)}</span>
          <span className="nutrition-label">kcal</span>
        </div>
        <div className="nutrition-item total-item">
          <span className="nutrition-value total-value">{Math.round(total.protein)}g</span>
          <span className="nutrition-label">Protein</span>
        </div>
        <div className="nutrition-item total-item">
          <span className="nutrition-value total-value">{Math.round(total.carbs)}g</span>
          <span className="nutrition-label">Carbs</span>
        </div>
        <div className="nutrition-item total-item">
          <span className="nutrition-value total-value">{Math.round(total.fat)}g</span>
          <span className="nutrition-label">Fat</span>
        </div>
        <div className="nutrition-item total-item">
          <span className="nutrition-value total-value">{Math.round(total.fiber)}g</span>
          <span className="nutrition-label">Fiber</span>
        </div>
        <div className="nutrition-item total-item">
          <span className="nutrition-value total-value">{Math.round(total.sugar)}g</span>
          <span className="nutrition-label">Sugar</span>
        </div>
        <div className="nutrition-item total-item">
          <span className="nutrition-value total-value">{Math.round(total.sodium)}</span>
          <span className="nutrition-label">Sodium mg</span>
        </div>
        <div className="nutrition-item total-item">
          <span className="nutrition-value total-value">{Math.round(total.saturated_fat)}g</span>
          <span className="nutrition-label">Sat.Fat</span>
        </div>
      </div>

      {calorieGoal > 0 && (
        <div className="goal-progress-wrapper">
          <div className="goal-progress-labels">
            <span>{Math.round(total.calories)} / {calorieGoal} kcal</span>
            <span>{pct}%</span>
          </div>
          <div className="goal-progress-bar-track">
            <div
              className={`goal-progress-bar-fill ${pct >= 100 ? "over" : pct >= 85 ? "warn" : ""}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
