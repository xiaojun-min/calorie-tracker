import { useState } from "react";

export default function FoodCard({ entry, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [editDate, setEditDate] = useState(entry.date);
  const [editMultiplier, setEditMultiplier] = useState("1");

  const rating = entry.health_rating;
  const ratingClass = rating >= 7 ? "good" : rating >= 4 ? "fair" : "poor";

  function openEdit() {
    setEditDate(entry.date);
    setEditMultiplier("1");
    setEditing(true);
  }

  function handleSave() {
    const mult = Math.max(0.1, Math.min(10, Number(editMultiplier) || 1));
    onEdit(entry.id, { date: editDate, multiplier: mult });
    setEditing(false);
  }

  function adjustMult(delta) {
    const next = Math.max(0.1, Math.min(10, parseFloat((Number(editMultiplier) + delta).toFixed(2))));
    setEditMultiplier(String(next));
  }

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
        <div className="food-card-actions">
          <button className="edit-btn" onClick={openEdit} aria-label="Edit">✏️</button>
          <button className="delete-btn" onClick={() => onDelete(entry.id)} aria-label="Delete">🗑</button>
        </div>
      </div>

      {editing && (
        <div className="edit-panel">
          <div className="edit-row">
            <label className="edit-label">Date</label>
            <input
              type="date"
              className="edit-date-input"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
            />
          </div>
          <div className="edit-row">
            <label className="edit-label">Portion scale</label>
            <div className="edit-multiplier-row">
              <button type="button" className="mult-btn" onClick={() => adjustMult(-0.25)}>−</button>
              <input
                type="number"
                className="edit-mult-input"
                min="0.1" max="10" step="0.25"
                value={editMultiplier}
                onChange={(e) => setEditMultiplier(e.target.value)}
              />
              <button type="button" className="mult-btn" onClick={() => adjustMult(0.25)}>+</button>
            </div>
            <p className="edit-hint">1 = no change · 0.5 = half · 2 = double</p>
          </div>
          <div className="edit-actions">
            <button type="button" className="edit-cancel-btn" onClick={() => setEditing(false)}>Cancel</button>
            <button type="button" className="edit-save-btn" onClick={handleSave}>Save</button>
          </div>
        </div>
      )}

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
