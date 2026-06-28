import { useState } from "react";

const ENV_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";

export default function Settings() {
  const [key, setKey] = useState(() => localStorage.getItem("anthropic_api_key") || "");
  const [saved, setSaved] = useState(false);

  function saveKey() {
    localStorage.setItem("anthropic_api_key", key.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="settings-page">
      <h2 className="settings-title">⚙️ Settings</h2>

      <div className="settings-section">
        <label className="settings-label">Anthropic API Key</label>
        {ENV_KEY ? (
          <p className="settings-configured">✅ API key configured — you&apos;re all set!</p>
        ) : (
          <>
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
              }}
              autoComplete="off"
              spellCheck={false}
            />
            <button className="save-key-btn" onClick={saveKey} disabled={!key.trim()}>
              {saved ? "✅ Key saved!" : "💾 Save Key"}
            </button>
            <p className="settings-hint">🔗 Get your key at console.anthropic.com</p>
          </>
        )}
      </div>
    </div>
  );
}
