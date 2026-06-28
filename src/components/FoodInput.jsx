import { useState, useRef } from "react";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

async function fileToJpegBase64(file) {
  const MAX = 1200;

  // Primary: createImageBitmap (iOS 15+, handles HEIC natively, no callback nesting)
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
      if (!ctx) throw new Error("No canvas context");
      ctx.drawImage(bitmap, 0, 0, w, h);
      if (bitmap.close) bitmap.close();
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      const b64 = dataUrl.split(",")[1];
      if (b64) return { b64, preview: dataUrl };
      throw new Error("Canvas produced empty output");
    } catch (err) {
      console.warn("createImageBitmap failed, trying fallback:", err.message);
    }
  }

  // Fallback: FileReader → Image element → canvas
  const dataUrl = await readFileAsDataUrl(file);

  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onerror = () => reject(new Error("Image failed to load"));
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
  if (!ctx) throw new Error("No canvas context");
  ctx.drawImage(img, 0, 0, w, h);
  const result = canvas.toDataURL("image/jpeg", 0.85);
  const b64 = result.split(",")[1];
  if (!b64) throw new Error("Canvas produced empty output");
  return { b64, preview: result };
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
      setPhotoError(`Photo error: ${msg}`);
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
