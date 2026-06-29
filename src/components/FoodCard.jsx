export default function FoodCard({ entry, onDelete }) {
  const rating = entry.health_rating;
  const ratingClass = rating >= 7 ? "good" : rating >= 4 ? "fair" : "poor";

  return (
    <div className="food-card">
      <div className="food-card-header">
        <span className="food-emoji">{entry.emoji}</span>
        <div className="food-name-time">
          <span className="food-name">{entry.name}</span>
          <div className="food-card-meta">
            <span className="food-time">{entry.time}</span>
            {rating != null && (
              <span className={`health-badge ${ratingClass}`}>★ {rating}/10</span>
            )}
          </div>
        </div>
        <button
          className="delete-btn"
          onClick={() => onDelete(entry.id)}
          aria-label="Delete"
        >
          🗑
        </button>
      </div>

      {entry.imagePreview && (
        <img src={entry.imagePreview} alt={entry.name} className="food-card-image" />
      )}

      <div className="nutrition-grid">
        <div className="nutrition-item calories">
          <span className="nutrition-value">{entry.calories}</span>
          <span className="nutrition-label">kcal</span>
        </div>
        <div className="nutrition-item">
          <span className="nutrition-value">{entry.protein}g</span>
          <span className="nutrition-label">Protein</span>
        </div>
        <div className="nutrition-item">
          <span className="nutrition-value">{entry.carbs}g</span>
          <span className="nutrition-label">Carbs</span>
        </div>
        <div className="nutrition-item">
          <span className="nutrition-value">{entry.fat}g</span>
          <span className="nutrition-label">Fat</span>
        </div>
        <div className="nutrition-item">
          <span className="nutrition-value">{entry.fiber ?? 0}g</span>
          <span className="nutrition-label">Fiber</span>
        </div>
        <div className="nutrition-item">
          <span className="nutrition-value">{entry.sugar ?? 0}g</span>
          <span className="nutrition-label">Sugar</span>
        </div>
        <div className="nutrition-item">
          <span className="nutrition-value">{entry.sodium ?? 0}</span>
          <span className="nutrition-label">Sodium mg</span>
        </div>
        <div className="nutrition-item">
          <span className="nutrition-value">{entry.saturated_fat ?? 0}g</span>
          <span className="nutrition-label">Sat.Fat</span>
        </div>
      </div>
    </div>
  );
}
