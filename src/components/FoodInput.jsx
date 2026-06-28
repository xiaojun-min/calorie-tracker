import { useState, useRef } from "react";

async function resizeThumbnail(dataUrl, maxWidth = 600) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.src = dataUrl;
  });
}

export default function FoodInput({ onAdd, loading }) {
  const [mode, setMode] = useState("text");
  const [description, setDescription] = useState("");
  const [imageBase64, setImageBase64] = useState(null);
  const [imageMimeType, setImageMimeType] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      const [header, b64] = dataUrl.split(",");
      const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
      setImageBase64(b64);
      setImageMimeType(mime);
      const thumb = await resizeThumbnail(dataUrl);
      setImagePreview(thumb);
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(e) {
    e.preventDefault();
    onAdd({ description, imageBase64, imageMimeType, imageThumbnail: imagePreview });
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
                <button
                  type="button"
                  className="remove-photo-btn"
                  onClick={removePhoto}
                >
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
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
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
          {loading ? "⏳ Analyzing..." : "✨ Analyze"}
        </button>
      </form>
    </div>
  );
}
