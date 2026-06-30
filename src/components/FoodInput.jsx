import { useState, useRef } from "react";
import { scanLabel } from "../api/claude";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.readAsDataURL(file);
  });
}

async function fileToJpegBase64(file) {
  const MAX = 1200;
  console.log("[Upload] File selected:", { name: file.name, type: file.type || "(no type)", sizeMB: (file.size / 1024 / 1024).toFixed(2) });

  if (typeof createImageBitmap === "function") {
    try {
      console.log("[Upload] Attempt 1: createImageBitmap...");
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height, 1));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("getContext returned null");
      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close?.();
      const out = canvas.toDataURL("image/jpeg", 0.85);
      const b64 = out.split(",")[1];
      if (b64) { console.log("[Upload] Attempt 1 OK:", { w, h, base64Chars: b64.length }); return { b64, preview: out }; }
      throw new Error("toDataURL produced empty output");
    } catch (err) { console.warn("[Upload] Attempt 1 failed:", err.message || String(err)); }
  } else {
    console.log("[Upload] createImageBitmap not available, skipping attempt 1");
  }

  console.log("[Upload] Attempt 2: FileReader → Image → canvas...");
  const dataUrl = await readFileAsDataUrl(file);
  const mime = dataUrl.split(",")[0].match(/:(.*?);/)?.[1] || "unknown";
  console.log("[Upload] Detected MIME type:", mime);
  if (mime === "image/heic" || mime === "image/heif") {
    throw new Error("HEIC format not supported. On your iPhone go to:\nSettings → Camera → Formats → Most Compatible\nThen retake the photo.");
  }
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onerror = () => reject(new Error(`Image element failed to load (type: ${mime})`));
    el.onload = () => resolve(el);
    el.src = dataUrl;
  });
  console.log("[Upload] Image loaded:", { width: img.width, height: img.height });
  const scale = Math.min(1, MAX / Math.max(img.width, img.height, 1));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("getContext returned null (attempt 2)");
  try { ctx.drawImage(img, 0, 0, w, h); } catch (drawErr) {
    console.error("[Upload] drawImage failed:", drawErr);
    throw new Error(`Canvas drawImage failed for ${mime} (${img.width}×${img.height}). On iPhone: Settings → Camera → Formats → Most Compatible`);
  }
  const out = canvas.toDataURL("image/jpeg", 0.85);
  const b64 = out.split(",")[1];
  if (!b64) throw new Error("toDataURL produced empty output (attempt 2)");
  console.log("[Upload] Attempt 2 OK:", { w, h, base64Chars: b64.length });
  return { b64, preview: out };
}

const MANUAL_FIELDS = [
  { key: "calories",      label: "Calories",  unit: "kcal" },
  { key: "protein",       label: "Protein",   unit: "g" },
  { key: "carbs",         label: "Carbs",     unit: "g" },
  { key: "fat",           label: "Fat",       unit: "g" },
  { key: "fiber",         label: "Fiber",     unit: "g" },
  { key: "sugar",         label: "Sugar",     unit: "g" },
  { key: "sodium",        label: "Sodium",    unit: "mg" },
  { key: "saturated_fat", label: "Sat. Fat",  unit: "g" },
];

const EMPTY_MANUAL = Object.fromEntries(MANUAL_FIELDS.map(f => [f.key, ""]));

function loadLibrary() {
  try { return JSON.parse(localStorage.getItem("food_library") || "[]"); }
  catch { return []; }
}

function saveLibrary(foods) {
  localStorage.setItem("food_library", JSON.stringify(foods));
}

export default function FoodInput({ onAdd, loading }) {
  const [mode, setMode] = useState("text");

  // text / photo state
  const [description, setDescription] = useState("");
  const [imageBase64, setImageBase64] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [photoError, setPhotoError] = useState("");
  const [portionText, setPortionText] = useState("");
  const fileRef = useRef(null);

  // manual entry state
  const [manualName, setManualName] = useState("");
  const [manualVals, setManualVals] = useState(EMPTY_MANUAL);

  // label scan state
  const [labelImage, setLabelImage] = useState(null);
  const [labelPreview, setLabelPreview] = useState(null);
  const [labelError, setLabelError] = useState("");
  const [labelLoading, setLabelLoading] = useState(false);
  const [scannedFood, setScannedFood] = useState(null); // result after scan
  const [labelSaved, setLabelSaved] = useState(false);
  const labelFileRef = useRef(null);

  // my foods state
  const [myFoods, setMyFoods] = useState(loadLibrary);
  const [selectedFood, setSelectedFood] = useState(null);
  const [servings, setServings] = useState("1");

  function resetPhoto() {
    setImageBase64(null); setImagePreview(null); setPhotoError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function resetLabel() {
    setLabelImage(null); setLabelPreview(null); setLabelError("");
    setScannedFood(null); setLabelSaved(false);
    if (labelFileRef.current) labelFileRef.current.value = "";
  }

  async function handlePhotoFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError("");
    try {
      const { b64, preview } = await fileToJpegBase64(file);
      console.log("[Upload] Done — image ready for analysis");
      setImageBase64(b64); setImagePreview(preview);
    } catch (err) {
      const msg = err?.message || String(err) || "Unknown error";
      console.error("[Upload] Failed:", msg);
      setPhotoError(msg);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleLabelFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLabelError(""); setScannedFood(null); setLabelSaved(false);
    try {
      const { b64, preview } = await fileToJpegBase64(file);
      setLabelImage(b64); setLabelPreview(preview);
    } catch (err) {
      setLabelError(err?.message || "Could not load photo.");
      if (labelFileRef.current) labelFileRef.current.value = "";
    }
  }

  async function handleScanLabel() {
    if (!labelImage) return;
    const apiKey = localStorage.getItem("anthropic_api_key") || import.meta.env.ANTHROPIC_API_KEY || "";
    setLabelLoading(true); setLabelError("");
    try {
      const result = await scanLabel({ imageBase64: labelImage, imageMimeType: "image/jpeg", apiKey });
      setScannedFood(result);
    } catch (err) {
      setLabelError(err.message || "Could not read label.");
    } finally {
      setLabelLoading(false);
    }
  }

  function handleSaveToLibrary() {
    if (!scannedFood) return;
    const food = { id: Date.now(), ...scannedFood };
    const updated = [food, ...myFoods];
    setMyFoods(updated);
    saveLibrary(updated);
    setLabelSaved(true);
    setTimeout(() => { resetLabel(); setLabelSaved(false); }, 1500);
  }

  function handleDeleteFood(id) {
    const updated = myFoods.filter(f => f.id !== id);
    setMyFoods(updated);
    saveLibrary(updated);
    if (selectedFood?.id === id) setSelectedFood(null);
  }

  function handleLogSavedFood() {
    if (!selectedFood) return;
    const mult = parseFloat(servings) || 1;
    const servingLabel = mult === 1 ? selectedFood.serving_size : `${mult}× ${selectedFood.serving_size}`;
    onAdd({
      manualNutrition: {
        name: `${selectedFood.name} (${servingLabel})`,
        emoji: selectedFood.emoji || "🍽️",
        calories:      Math.round((selectedFood.calories      || 0) * mult),
        protein:       Math.round((selectedFood.protein       || 0) * mult),
        carbs:         Math.round((selectedFood.carbs         || 0) * mult),
        fat:           Math.round((selectedFood.fat           || 0) * mult),
        fiber:         Math.round((selectedFood.fiber         || 0) * mult),
        sugar:         Math.round((selectedFood.sugar         || 0) * mult),
        sodium:        Math.round((selectedFood.sodium        || 0) * mult),
        saturated_fat: Math.round((selectedFood.saturated_fat || 0) * mult),
        health_rating: selectedFood.health_rating ?? null,
      },
    });
    setSelectedFood(null);
    setServings("1");
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (mode === "manual") {
      onAdd({
        manualNutrition: {
          name: manualName.trim() || "Food",
          emoji: "🍽️",
          calories:      parseFloat(manualVals.calories)      || 0,
          protein:       parseFloat(manualVals.protein)       || 0,
          carbs:         parseFloat(manualVals.carbs)         || 0,
          fat:           parseFloat(manualVals.fat)           || 0,
          fiber:         parseFloat(manualVals.fiber)         || 0,
          sugar:         parseFloat(manualVals.sugar)         || 0,
          sodium:        parseFloat(manualVals.sodium)        || 0,
          saturated_fat: parseFloat(manualVals.saturated_fat) || 0,
          health_rating: null,
        },
      });
      setManualName(""); setManualVals(EMPTY_MANUAL);
      return;
    }
    onAdd({
      description,
      imageBase64,
      imageMimeType: imageBase64 ? "image/jpeg" : null,
      imageThumbnail: imagePreview,
      portionText: portionText.trim(),
    });
    setDescription(""); resetPhoto(); setPortionText("");
  }

  const canSubmitAI = mode === "text" ? description.trim() : imageBase64;
  const canSubmitManual = manualName.trim() && parseFloat(manualVals.calories) > 0;

  return (
    <div className="food-input-card">
      <div className="mode-toggle">
        <button type="button" className={`mode-btn ${mode === "text"    ? "active" : ""}`} onClick={() => setMode("text")}>✏️ Describe</button>
        <button type="button" className={`mode-btn ${mode === "photo"   ? "active" : ""}`} onClick={() => setMode("photo")}>📷 Photo</button>
        <button type="button" className={`mode-btn ${mode === "manual"  ? "active" : ""}`} onClick={() => setMode("manual")}>🔢 Manual</button>
        <button type="button" className={`mode-btn ${mode === "label"   ? "active" : ""}`} onClick={() => setMode("label")}>📦 Label</button>
        <button type="button" className={`mode-btn ${mode === "myfoods" ? "active" : ""}`} onClick={() => setMode("myfoods")}>⭐ My Foods</button>
      </div>

      {/* ── Text mode ── */}
      {mode === "text" && (
        <form onSubmit={handleSubmit} className="input-form">
          <textarea
            className="food-textarea"
            placeholder="e.g. 2 scrambled eggs with toast"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          {canSubmitAI && (
            <div className="portion-selector">
              <span className="portion-label">Portion eaten (optional)</span>
              <input className="portion-text-input" type="text" placeholder="e.g. half a bowl, 50g" value={portionText} onChange={(e) => setPortionText(e.target.value)} />
            </div>
          )}
          <button type="submit" className="analyze-btn" disabled={!canSubmitAI || loading}>
            {loading ? "⏳ Analyzing..." : "✨ Analyze"}
          </button>
        </form>
      )}

      {/* ── Photo mode ── */}
      {mode === "photo" && (
        <form onSubmit={handleSubmit} className="input-form">
          <div className="photo-area">
            {imagePreview ? (
              <div className="photo-preview-wrapper">
                <img src={imagePreview} alt="food preview" className="photo-preview" onClick={() => fileRef.current?.click()} />
                <button type="button" className="remove-photo-btn" onClick={resetPhoto}>✕ Remove</button>
              </div>
            ) : (
              <button type="button" className="upload-btn" onClick={() => fileRef.current?.click()}>
                <span className="upload-icon">📸</span>
                <span>Choose photo or take one</span>
              </button>
            )}
            {photoError && <p className="photo-error">{photoError}</p>}
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoFile} style={{ display: "none" }} />
          </div>
          {imageBase64 && (
            <textarea className="food-textarea" placeholder="Add context (optional): e.g. I only ate the burger, skipped the fries" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          )}
          {canSubmitAI && (
            <div className="portion-selector">
              <span className="portion-label">Portion eaten (optional)</span>
              <input className="portion-text-input" type="text" placeholder="e.g. half, 1/3, 200g" value={portionText} onChange={(e) => setPortionText(e.target.value)} />
            </div>
          )}
          <button type="submit" className="analyze-btn" disabled={!canSubmitAI || loading}>
            {loading ? "⏳ Analyzing..." : "✨ Analyze"}
          </button>
        </form>
      )}

      {/* ── Manual mode ── */}
      {mode === "manual" && (
        <form onSubmit={handleSubmit} className="input-form">
          <input type="text" className="food-textarea" style={{ resize: "none", padding: "12px 14px" }} placeholder="Food name (e.g. Chicken salad)" value={manualName} onChange={(e) => setManualName(e.target.value)} />
          <div className="manual-nutrition-grid">
            {MANUAL_FIELDS.map(({ key, label, unit }) => (
              <div key={key} className="manual-field">
                <label className="manual-field-label">{label}</label>
                <div className="manual-field-input-row">
                  <input type="number" className="manual-field-input" min="0" placeholder="0" value={manualVals[key]} onChange={(e) => setManualVals(prev => ({ ...prev, [key]: e.target.value }))} />
                  <span className="manual-field-unit">{unit}</span>
                </div>
              </div>
            ))}
          </div>
          <button type="submit" className="analyze-btn" disabled={!canSubmitManual || loading}>➕ Add Entry</button>
        </form>
      )}

      {/* ── Label scan mode ── */}
      {mode === "label" && (
        <div className="input-form">
          {!scannedFood ? (
            <>
              <div className="photo-area">
                {labelPreview ? (
                  <div className="photo-preview-wrapper">
                    <img src={labelPreview} alt="label" className="photo-preview" onClick={() => labelFileRef.current?.click()} />
                    <button type="button" className="remove-photo-btn" onClick={resetLabel}>✕ Remove</button>
                  </div>
                ) : (
                  <button type="button" className="upload-btn" onClick={() => labelFileRef.current?.click()}>
                    <span className="upload-icon">📦</span>
                    <span>Photo of nutrition label</span>
                  </button>
                )}
                {labelError && <p className="photo-error">{labelError}</p>}
                <input ref={labelFileRef} type="file" accept="image/*" onChange={handleLabelFile} style={{ display: "none" }} />
              </div>
              {labelImage && (
                <button type="button" className="analyze-btn" onClick={handleScanLabel} disabled={labelLoading}>
                  {labelLoading ? "⏳ Reading label..." : "🔍 Read Nutrition Label"}
                </button>
              )}
            </>
          ) : (
            <div className="scanned-result">
              <div className="scanned-header">
                <span className="scanned-emoji">{scannedFood.emoji}</span>
                <div>
                  <p className="scanned-name">{scannedFood.name}</p>
                  <p className="scanned-serving">Per {scannedFood.serving_size}</p>
                </div>
              </div>
              <div className="manual-nutrition-grid" style={{ marginTop: 10 }}>
                {MANUAL_FIELDS.map(({ key, label, unit }) => (
                  <div key={key} className="manual-field">
                    <span className="manual-field-label">{label}</span>
                    <div className="manual-field-input-row">
                      <span className="manual-field-input" style={{ display: "flex", alignItems: "center", fontWeight: 700 }}>{scannedFood[key] ?? 0}</span>
                      <span className="manual-field-unit">{unit}</span>
                    </div>
                  </div>
                ))}
              </div>
              {labelSaved ? (
                <p className="label-saved-msg">✅ Saved to My Foods!</p>
              ) : (
                <div className="label-actions">
                  <button type="button" className="edit-cancel-btn" onClick={resetLabel}>Try again</button>
                  <button type="button" className="edit-save-btn" onClick={handleSaveToLibrary}>⭐ Save to My Foods</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── My Foods mode ── */}
      {mode === "myfoods" && (
        <div className="input-form">
          {myFoods.length === 0 ? (
            <div className="myfoods-empty">
              <p>No saved foods yet.</p>
              <p>Go to <strong>📦 Label</strong> to scan a nutrition label and save it here.</p>
            </div>
          ) : selectedFood ? (
            <div className="myfoods-log-panel">
              <div className="scanned-header">
                <span className="scanned-emoji">{selectedFood.emoji}</span>
                <div>
                  <p className="scanned-name">{selectedFood.name}</p>
                  <p className="scanned-serving">{selectedFood.calories} kcal per {selectedFood.serving_size}</p>
                </div>
              </div>
              <div className="serving-row">
                <label className="portion-label">Servings</label>
                <div className="manual-field-input-row" style={{ flex: 1 }}>
                  <input
                    type="number"
                    className="manual-field-input"
                    min="0.25" step="0.25"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                  />
                  <span className="manual-field-unit">× {selectedFood.serving_size}</span>
                </div>
              </div>
              <p className="serving-calc">
                = {Math.round((selectedFood.calories || 0) * (parseFloat(servings) || 1))} kcal
                · {Math.round((selectedFood.protein || 0) * (parseFloat(servings) || 1))}g protein
              </p>
              <div className="label-actions">
                <button type="button" className="edit-cancel-btn" onClick={() => { setSelectedFood(null); setServings("1"); }}>Back</button>
                <button type="button" className="edit-save-btn" onClick={handleLogSavedFood}>➕ Log</button>
              </div>
            </div>
          ) : (
            <div className="myfoods-list">
              {myFoods.map((food) => (
                <div key={food.id} className="myfoods-row" onClick={() => { setSelectedFood(food); setServings("1"); }}>
                  <span className="myfoods-emoji">{food.emoji}</span>
                  <div className="myfoods-info">
                    <span className="myfoods-name">{food.name}</span>
                    <span className="myfoods-meta">{food.calories} kcal · {food.serving_size}</span>
                  </div>
                  <button
                    type="button"
                    className="delete-btn"
                    style={{ flexShrink: 0 }}
                    onClick={(e) => { e.stopPropagation(); handleDeleteFood(food.id); }}
                    aria-label="Delete"
                  >🗑</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
