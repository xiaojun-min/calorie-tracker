import { useState } from "react";

const NUTRITION_FIELDS = [
  { key: "calories",      label: "Calories",  unit: "kcal" },
  { key: "protein",       label: "Protein",   unit: "g" },
  { key: "carbs",         label: "Carbs",     unit: "g" },
  { key: "fat",           label: "Fat",       unit: "g" },
  { key: "fiber",         label: "Fiber",     unit: "g" },
  { key: "sugar",         label: "Sugar",     unit: "g" },
  { key: "sodium",        label: "Sodium",    unit: "mg" },
  { key: "saturated_fat", label: "Sat. Fat",  unit: "g" },
];

export default function FoodCard({ entry, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(entry.name);
  const [editDate, setEditDate] = useState(entry.date);
  const [editNutrition, setEditNutrition] = useState({});

  const rating = entry.health_rating;
  const ratingClass = rating >= 7 ? "good" : rating >= 4 ? "fair" : "poor";

  function openEdit() {
    setEditName(entry.name);
    setEditDate(entry.date);
    setEditNutrition({
      calories:      entry.calories ?? 0,
      protein:       entry.protein ?? 0,
      carbs:         entry.carbs ?? 0,
      fat:           entry.fat ?? 0,
      fiber:         entry.fiber ?? 0,
      sugar:         entry.sugar ?? 0,
      sodium:        entry.sodium ?? 0,
      saturated_fat: entry.saturated_fat ?? 0,
    });
    setEditing(true);
  }

  function handleSave() {
    onEdit(entry.id, {
      date: editDate,
      name: editName.trim() || entry.name,
      ...Object.fromEntries(
        NUTRITION_FIELDS.map(({ key }) => [key, parseFloat(editNutrition[key]) || 0])
      ),
    });
    setEditing(false);
  }

  function setField(key, value) {
    setEditNutrition((prev) => ({ ...prev, [key]: value }));
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
            <label className="edit-label">Food name</label>
            <input
              type="text"
              className="edit-date-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Food name"
            />
          </div>
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
            <label className="edit-label">Nutrition</label>
            <div className="manual-nutrition-grid">
              {NUTRITION_FIELDS.map(({ key, label, unit }) => (
                <div key={key} className="manual-field">
                  <label className="manual-field-label">{label}</label>
                  <div className="manual-field-input-row">
                    <input
                      type="number"
                      className="manual-field-input"
                      min="0"
                      value={editNutrition[key] ?? 0}
                      onChange={(e) => setField(key, e.target.value)}
                    />
                    <span className="manual-field-unit">{unit}</span>
                  </div>
                </div>
              ))}
            </div>
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
