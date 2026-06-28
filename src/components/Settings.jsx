import { useState } from "react";

export default function Settings() {
  const [key, setKey] = useState(() => localStorage.getItem("anthropic_api_key") || "");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  function saveKey() {
    try {
      localStorage.setItem("anthropic_api_key", key.trim());
      setSaved(true);
      setSaveError("");
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError("Could not save. Check that storage is enabled in your browser.");
    }
  }

  return (
    <div className="settings-page">
      <h2 className="settings-title">⚙️ Settings</h2>

      <div className="settings-section">
        <label className="settings-label">Anthropic API Key</label>
        <p className="settings-desc">
          Enter your Anthropic API key to enable food analysis. It&apos;s saved only to this browser.
        </p>
        <input
          className="api-key-input"
          type="password"
          placeholder="sk-ant-..."
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            setSaved(false);
            setSaveError("");
          }}
          autoComplete="new-password"
          spellCheck={false}
        />
        <button className="save-key-btn" onClick={saveKey} disabled={!key.trim()}>
          {saved ? "✅ Key saved!" : "💾 Save Key"}
        </button>
        {saveError && <p className="settings-error">{saveError}</p>}
        <p className="settings-hint">🔗 Get your key at console.anthropic.com</p>
      </div>
    </div>
  );
}
