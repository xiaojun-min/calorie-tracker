export default function DailyTotal({ entries }) {
  const total = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      protein: acc.protein + (e.protein || 0),
      carbs: acc.carbs + (e.carbs || 0),
      fat: acc.fat + (e.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

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
      </div>
    </div>
  );
}
