export default function DailyTotal({ entries, t }) {
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
      <h2 className="daily-total-title">📊 {t.dailyTotal}</h2>
      <div className="nutrition-grid total-grid">
        <div className="nutrition-item calories total-item">
          <span className="nutrition-value total-value">{Math.round(total.calories)}</span>
          <span className="nutrition-label">{t.kcal}</span>
        </div>
        <div className="nutrition-item total-item">
          <span className="nutrition-value total-value">{Math.round(total.protein)}{t.g}</span>
          <span className="nutrition-label">{t.protein}</span>
        </div>
        <div className="nutrition-item total-item">
          <span className="nutrition-value total-value">{Math.round(total.carbs)}{t.g}</span>
          <span className="nutrition-label">{t.carbs}</span>
        </div>
        <div className="nutrition-item total-item">
          <span className="nutrition-value total-value">{Math.round(total.fat)}{t.g}</span>
          <span className="nutrition-label">{t.fat}</span>
        </div>
      </div>
    </div>
  );
}
