import { useState } from "react";

export default function Settings({ t, lang, setLang }) {
  const [key, setKey] = useState(() => localStorage.getItem("anthropic_api_key") || "");
  const [saved, setSaved] = useState(false);

  function saveKey() {
    localStorage.setItem("anthropic_api_key", key.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="settings-page">
      <h2 className="settings-title">⚙️ {t.settingsTitle}</h2>

      <div className="settings-section">
        <label className="settings-label">{t.language}</label>
        <div className="lang-toggle">
          <button
            className={`lang-btn ${lang === "en" ? "active" : ""}`}
            onClick={() => setLang("en")}
          >
            🇺🇸 English
          </button>
          <button
            className={`lang-btn ${lang === "zh" ? "active" : ""}`}
            onClick={() => setLang("zh")}
          >
            🇹🇼 繁體中文
          </button>
        </div>
      </div>

      <div className="settings-section">
        <p className="settings-desc">{t.settingsDesc}</p>
        <label className="settings-label">{t.apiKeyLabel}</label>
        <input
          className="api-key-input"
          type="password"
          placeholder={t.apiKeyPlaceholder}
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            setSaved(false);
          }}
          autoComplete="off"
          spellCheck={false}
        />
        <button className="save-key-btn" onClick={saveKey} disabled={!key.trim()}>
          {saved ? `✅ ${t.keySaved}` : `💾 ${t.saveKey}`}
        </button>
        <p className="settings-hint">🔗 {t.getKeyLink}</p>
      </div>
    </div>
  );
}
