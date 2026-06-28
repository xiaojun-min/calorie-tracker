import { useState, useRef } from "react";

async function toJpegThumbnail(dataUrl, maxWidth = 1024) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("Image failed to load"));
    img.onload = () => {
      try {
        const ratio = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas unavailable");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      } catch (err) {
        reject(err);
      }
    };
    img.src = dataUrl;
  });
}

export default function FoodInput({ onAdd, loading }) {
  const [mode, setMode] = useState("text");
  const [description, setDescription] = useState("");
  const [imageData, setImageData] = useState(null); // { base64, preview }
  const [imgError, setImgError] = useState("");
  const fileRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgError("");
    const reader = new FileReader();
    reader.onerror = () => setImgError("Could not read file.");
    reader.onload = async (ev) => {
      try {
        // Convert to JPEG via canvas — handles HEIC, HEIF, large images, etc.
        const jpeg = await toJpegThumbnail(ev.target.result);
        const b64 = jpeg.split(",")[1];
        setImageData({ base64: b64, preview: jpeg });
      } catch {
        setImgError("Could not process image. Try a different photo.");
      }
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(e) {
    e.preventDefault();
    onAdd({
      description,
      imageBase64: imageData?.base64 || null,
      imageMimeType: imageData ? "image/jpeg" : null,
      imageThumbnail: imageData?.preview || null,
    });
    setDescription("");
    setImageData(null);
    setImgError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function removePhoto() {
    setImageData(null);
    setImgError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  const canSubmit = mode === "text" ? description.trim() : imageData;

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
            {imageData ? (
              <div className="photo-preview-wrapper">
                <img
                  src={imageData.preview}
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
            {imgError && <p className="img-error">{imgError}</p>}
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
