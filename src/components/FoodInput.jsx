import { useState, useRef } from "react";

export default function FoodInput({ onAdd, t, loading }) {
  const [mode, setMode] = useState("text");
  const [description, setDescription] = useState("");
  const [imageBase64, setImageBase64] = useState(null);
  const [imageMimeType, setImageMimeType] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const [header, b64] = dataUrl.split(",");
      const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
      setImageBase64(b64);
      setImageMimeType(mime);
      setImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(e) {
    e.preventDefault();
    onAdd({ description, imageBase64, imageMimeType });
    setDescription("");
    setImageBase64(null);
    setImageMimeType(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function removePhoto() {
    setImageBase64(null);
    setImageMimeType(null);
    setImagePreview(null);
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
          ✏️ {t.typeFood}
        </button>
        <button
          type="button"
          className={`mode-btn ${mode === "photo" ? "active" : ""}`}
          onClick={() => setMode("photo")}
        >
          📷 {t.uploadPhoto}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        {mode === "text" ? (
          <textarea
            className="food-textarea"
            placeholder={t.descriptionPlaceholder}
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
                <button
                  type="button"
                  className="remove-photo-btn"
                  onClick={removePhoto}
                >
                  ✕ {t.removePhoto}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="upload-btn"
                onClick={() => fileRef.current?.click()}
              >
                <span className="upload-icon">📸</span>
                <span>{t.uploadPhoto}</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFile}
              style={{ display: "none" }}
            />
          </div>
        )}

        <button
          type="submit"
          className="analyze-btn"
          disabled={!canSubmit || loading}
        >
          {loading ? `⏳ ${t.analyzing}` : `✨ ${t.analyze}`}
        </button>
      </form>
    </div>
  );
}
