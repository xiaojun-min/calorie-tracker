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

  // Attempt 1: createImageBitmap → canvas (decodes HEIC internally on iOS 15+)
  if (typeof createImageBitmap === "function") {
    try {
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
      if (b64) return { b64, preview: out };
      throw new Error("toDataURL produced empty output");
    } catch (err) {
      console.warn("[attempt1 createImageBitmap]", err.message || String(err));
    }
  }

  // Attempt 2: FileReader → Image element → canvas
  const dataUrl = await readFileAsDataUrl(file);
  const mime = dataUrl.split(",")[0].match(/:(.*?);/)?.[1] || "unknown";

  // iOS can display HEIC in <img> but cannot draw it to canvas — give actionable message
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
    // Safari throws bare TypeError here for HEIC and some other formats
    throw new Error(
      `Canvas drawImage failed for ${mime} (${img.width}×${img.height}). ` +
      "On iPhone: Settings → Camera → Formats → Most Compatible"
    );
  }

  const out = canvas.toDataURL("image/jpeg", 0.85);
  const b64 = out.split(",")[1];
  if (!b64) throw new Error("toDataURL produced empty output (attempt 2)");
  return { b64, preview: out };
}

export default function FoodInput({ onAdd, loading }) {
  const [mode, setMode] = useState("text");
  const [description, setDescription] = useState("");
  const [imageBase64, setImageBase64] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [photoError, setPhotoError] = useState("");
  const fileRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError("");
    try {
      const { b64, preview } = await fileToJpegBase64(file);
      setImageBase64(b64);
      setImagePreview(preview);
    } catch (err) {
      const msg = err?.message || String(err) || "Unknown error";
      setPhotoError(msg);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    onAdd({
      description,
      imageBase64,
      imageMimeType: imageBase64 ? "image/jpeg" : null,
      imageThumbnail: imagePreview,
    });
    setDescription("");
    setImageBase64(null);
    setImagePreview(null);
    setPhotoError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function removePhoto() {
    setImageBase64(null);
    setImagePreview(null);
    setPhotoError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  const canSubmit = mode === "text" ? description.trim() : imageBase64;

  return (
    <div className="food-input-card">
      <div className="mode-toggle">
        <button
          type="button"
          className={`mode-btn ${mode === "text" ? "active" : ""}`}
          onClick={() => setMode("text")}
        >
          ✏️ Type food
        </button>
        <button
          type="button"
          className={`mode-btn ${mode === "photo" ? "active" : ""}`}
          onClick={() => setMode("photo")}
        >
          📷 Photo
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
        ) : (
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
        )}

        <button type="submit" className="analyze-btn" disabled={!canSubmit || loading}>
          {loading ? "⏳ Analyzing..." : "✨ Analyze"}
        </button>
      </form>
    </div>
  );
}
