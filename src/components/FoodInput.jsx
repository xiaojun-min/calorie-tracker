import { useState, useRef } from "react";

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

  console.log("[Upload] File selected:", {
    name: file.name,
    type: file.type || "(no type)",
    sizeMB: (file.size / 1024 / 1024).toFixed(2),
  });

  // Attempt 1: createImageBitmap → canvas (decodes HEIC internally on iOS 15+)
  if (typeof createImageBitmap === "function") {
    try {
      console.log("[Upload] Attempt 1: createImageBitmap...");
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height, 1));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("getContext returned null");
      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close?.();
      const out = canvas.toDataURL("image/jpeg", 0.85);
      const b64 = out.split(",")[1];
      if (b64) {
        console.log("[Upload] Attempt 1 OK:", { w, h, base64Chars: b64.length });
        return { b64, preview: out };
      }
      throw new Error("toDataURL produced empty output");
    } catch (err) {
      console.warn("[Upload] Attempt 1 failed:", err.message || String(err));
    }
  } else {
    console.log("[Upload] createImageBitmap not available, skipping attempt 1");
  }

  // Attempt 2: FileReader → Image element → canvas
  console.log("[Upload] Attempt 2: FileReader → Image → canvas...");
  const dataUrl = await readFileAsDataUrl(file);
  const mime = dataUrl.split(",")[0].match(/:(.*?);/)?.[1] || "unknown";
  console.log("[Upload] Detected MIME type:", mime);

  if (mime === "image/heic" || mime === "image/heif") {
    throw new Error(
      "HEIC format not supported. On your iPhone go to:\nSettings → Camera → Formats → Most Compatible\nThen retake the photo."
    );
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
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("getContext returned null (attempt 2)");

  try {
    ctx.drawImage(img, 0, 0, w, h);
  } catch (drawErr) {
    console.error("[Upload] drawImage failed:", drawErr);
    throw new Error(
      `Canvas drawImage failed for ${mime} (${img.width}×${img.height}). ` +
      "On iPhone: Settings → Camera → Formats → Most Compatible"
    );
  }

  const out = canvas.toDataURL("image/jpeg", 0.85);
  const b64 = out.split(",")[1];
  if (!b64) throw new Error("toDataURL produced empty output (attempt 2)");
  console.log("[Upload] Attempt 2 OK:", { w, h, base64Chars: b64.length });
  return { b64, preview: out };
}

const MANUAL_FIELDS = [
  { key: "calories",     label: "Calories",  unit: "kcal" },
  { key: "protein",      label: "Protein",   unit: "g" },
  { key: "carbs",        label: "Carbs",     unit: "g" },
  { key: "fat",          label: "Fat",       unit: "g" },
  { key: "fiber",        label: "Fiber",     unit: "g" },
  { key: "sugar",        label: "Sugar",     unit: "g" },
  { key: "sodium",       label: "Sodium",    unit: "mg" },
  { key: "saturated_fat",label: "Sat. Fat",  unit: "g" },
];

const EMPTY_MANUAL = Object.fromEntries(MANUAL_FIELDS.map(f => [f.key, ""]));

export default function FoodInput({ onAdd, loading }) {
  const [mode, setMode] = useState("text");
  const [description, setDescription] = useState("");
  const [imageBase64, setImageBase64] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [photoError, setPhotoError] = useState("");
  const [portionText, setPortionText] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualVals, setManualVals] = useState(EMPTY_MANUAL);
  const fileRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError("");
    try {
      const { b64, preview } = await fileToJpegBase64(file);
      console.log("[Upload] Done — image ready for analysis");
      setImageBase64(b64);
      setImagePreview(preview);
    } catch (err) {
      const msg = err?.message || String(err) || "Unknown error";
      console.error("[Upload] Failed:", msg);
      setPhotoError(msg);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (mode === "manual") {
      onAdd({
        manualNutrition: {
          name: manualName.trim() || "Food",
          emoji: "🍽️",
          calories: parseFloat(manualVals.calories) || 0,
          protein: parseFloat(manualVals.protein) || 0,
          carbs: parseFloat(manualVals.carbs) || 0,
          fat: parseFloat(manualVals.fat) || 0,
          fiber: parseFloat(manualVals.fiber) || 0,
          sugar: parseFloat(manualVals.sugar) || 0,
          sodium: parseFloat(manualVals.sodium) || 0,
          saturated_fat: parseFloat(manualVals.saturated_fat) || 0,
          health_rating: null,
        },
      });
      setManualName("");
      setManualVals(EMPTY_MANUAL);
      return;
    }
    onAdd({
      description,
      imageBase64,
      imageMimeType: imageBase64 ? "image/jpeg" : null,
      imageThumbnail: imagePreview,
      portionText: portionText.trim(),
    });
    setDescription("");
    setImageBase64(null);
    setImagePreview(null);
    setPhotoError("");
    setPortionText("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function removePhoto() {
    setImageBase64(null);
    setImagePreview(null);
    setPhotoError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  const canSubmit = mode === "manual"
    ? manualName.trim() && (parseFloat(manualVals.calories) > 0)
    : mode === "text" ? description.trim() : imageBase64;

  return (
    <div className="food-input-card">
      {/* Text / Photo / Manual toggle */}
      <div className="mode-toggle">
        <button
          type="button"
          className={`mode-btn ${mode === "text" ? "active" : ""}`}
          onClick={() => setMode("text")}
        >
          ✏️ Describe
        </button>
        <button
          type="button"
          className={`mode-btn ${mode === "photo" ? "active" : ""}`}
          onClick={() => setMode("photo")}
        >
          📷 Photo
        </button>
        <button
          type="button"
          className={`mode-btn ${mode === "manual" ? "active" : ""}`}
          onClick={() => setMode("manual")}
        >
          🔢 Manual
        </button>
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        {mode === "text" ? (
          <textarea
            className="food-textarea"
            placeholder="e.g. 2 scrambled eggs with toast"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        ) : mode === "manual" ? (
          <>
            <input
              type="text"
              className="food-textarea"
              style={{ resize: "none", padding: "12px 14px" }}
              placeholder="Food name (e.g. Chicken salad)"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
            />
            <div className="manual-nutrition-grid">
              {MANUAL_FIELDS.map(({ key, label, unit }) => (
                <div key={key} className="manual-field">
                  <label className="manual-field-label">{label}</label>
                  <div className="manual-field-input-row">
                    <input
                      type="number"
                      className="manual-field-input"
                      min="0"
                      placeholder="0"
                      value={manualVals[key]}
                      onChange={(e) => setManualVals(prev => ({ ...prev, [key]: e.target.value }))}
                    />
                    <span className="manual-field-unit">{unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="photo-area">
              {imagePreview ? (
                <div className="photo-preview-wrapper">
                  <img
                    src={imagePreview}
                    alt="food preview"
                    className="photo-preview"
                    onClick={() => fileRef.current?.click()}
                  />
                  <button type="button" className="remove-photo-btn" onClick={removePhoto}>
                    ✕ Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="upload-btn"
                  onClick={() => fileRef.current?.click()}
                >
                  <span className="upload-icon">📸</span>
                  <span>Choose photo or take one</span>
                </button>
              )}
              {photoError && <p className="photo-error">{photoError}</p>}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                style={{ display: "none" }}
              />
            </div>
            {imageBase64 && (
              <textarea
                className="food-textarea"
                placeholder="Add context (optional): e.g. I only ate the burger, skipped the fries"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            )}
          </>
        )}

        {/* Portion field for text/photo modes */}
        {mode !== "manual" && canSubmit && (
          <div className="portion-selector">
            <span className="portion-label">Portion eaten (optional)</span>
            <input
              className="portion-text-input"
              type="text"
              placeholder="e.g. 1 teaspoon, 50g, half a bowl"
              value={portionText}
              onChange={(e) => setPortionText(e.target.value)}
            />
          </div>
        )}

        <button type="submit" className="analyze-btn" disabled={!canSubmit || loading}>
          {loading ? "⏳ Analyzing..." : mode === "manual" ? "➕ Add Entry" : "✨ Analyze"}
        </button>
      </form>
    </div>
  );
}
