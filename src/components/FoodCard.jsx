export default function FoodCard({ entry, onDelete, t }) {
  return (
    <div className="food-card">
      <div className="food-card-header">
        <span className="food-emoji">{entry.emoji}</span>
        <div className="food-name-time">
          <span className="food-name">{entry.name}</span>
          <span className="food-time">{entry.time}</span>
        </div>
        <button
          className="delete-btn"
          onClick={() => onDelete(entry.id)}
          aria-label={t.deleteEntry}
        >
          🗑
        </button>
      </div>

      {entry.imagePreview && (
        <img
          src={entry.imagePreview}
          alt={entry.name}
          className="food-card-image"
        />
      )}

      <div className="nutrition-grid">
        <div className="nutrition-item calories">
          <span className="nutrition-value">{entry.calories}</span>
          <span className="nutrition-label">{t.kcal}</span>
        </div>
        <div className="nutrition-item">
          <span className="nutrition-value">{entry.protein}{t.g}</span>
          <span className="nutrition-label">{t.protein}</span>
        </div>
        <div className="nutrition-item">
          <span className="nutrition-value">{entry.carbs}{t.g}</span>
          <span className="nutrition-label">{t.carbs}</span>
        </div>
        <div className="nutrition-item">
          <span className="nutrition-value">{entry.fat}{t.g}</span>
          <span className="nutrition-label">{t.fat}</span>
        </div>
      </div>
    </div>
  );
}
