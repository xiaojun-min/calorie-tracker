import { useState, useRef } from "react";
import { calculateCalorieGoal } from "../utils/tdee";

const DATA_KEYS = ["food_entries", "weight_entries", "weight_unit", "user_profile", "food_library"];

function exportData() {
  const snapshot = {};
  DATA_KEYS.forEach((k) => {
    const v = localStorage.getItem(k);
    if (v != null) snapshot[k] = v;
  });
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `calorie-log-backup-${new Date().toLocaleDateString("en-CA")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Settings({ onProfileSaved }) {
  const [key, setKey] = useState(() => localStorage.getItem("anthropic_api_key") || "");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const importRef = useRef(null);

  function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        let count = 0;
        DATA_KEYS.forEach((k) => {
          if (data[k] != null) { localStorage.setItem(k, data[k]); count++; }
        });
        setImportStatus(`✅ Imported ${count} data ${count === 1 ? "item" : "items"}. Reload the app to see your data.`);
        onProfileSaved?.();
      } catch {
        setImportStatus("❌ Could not read that file. Make sure it's a backup exported from this app.");
      }
      if (importRef.current) importRef.current.value = "";
    };
    reader.readAsText(file);
  }

  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user_profile") || "{}"); }
    catch { return {}; }
  });
  const [profileSaved, setProfileSaved] = useState(false);

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

  function set(field, value) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  function saveProfile() {
    try {
      localStorage.setItem("user_profile", JSON.stringify(profile));
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
      onProfileSaved?.();
    } catch {
      // storage unavailable
    }
  }

  const goalResult = calculateCalorieGoal(profile);

  return (
    <div className="settings-page">
      <h2 className="settings-title">⚙️ Settings</h2>

      {/* API Key */}
      <div className="settings-section">
        <label className="settings-label">Anthropic API Key</label>
        <p className="settings-desc">
          Optional — leave blank if <code>ANTHROPIC_API_KEY</code> is set in your Vercel environment variables.
        </p>
        <input
          className="api-key-input"
          type="password"
          placeholder="sk-ant-..."
          value={key}
          onChange={(e) => { setKey(e.target.value); setSaved(false); setSaveError(""); }}
          autoComplete="new-password"
          spellCheck={false}
        />
        <button className="save-key-btn" onClick={saveKey} disabled={!key.trim()}>
          {saved ? "✅ Key saved!" : "💾 Save Key"}
        </button>
        {saveError && <p className="settings-error">{saveError}</p>}
        <p className="settings-hint">🔗 Get your key at console.anthropic.com</p>
      </div>

      {/* Profile & Calorie Goal */}
      <div className="settings-section">
        <label className="settings-label">Profile &amp; Calorie Goal</label>
        <p className="settings-desc">Fill in your details to get a personalized daily calorie target.</p>

        <div className="profile-row">
          <div className="profile-field">
            <span className="profile-field-label">Age</span>
            <input
              className="profile-input"
              type="number"
              placeholder="e.g. 28"
              min="10" max="100"
              value={profile.age || ""}
              onChange={(e) => set("age", e.target.value)}
            />
          </div>
          <div className="profile-field">
            <span className="profile-field-label">Weight (kg)</span>
            <input
              className="profile-input"
              type="number"
              placeholder="e.g. 65"
              min="20" max="300"
              value={profile.weightKg || ""}
              onChange={(e) => set("weightKg", e.target.value)}
            />
          </div>
        </div>

        <div className="profile-row">
          <div className="profile-field">
            <span className="profile-field-label">Height (cm)</span>
            <input
              className="profile-input"
              type="number"
              placeholder="e.g. 165"
              min="100" max="250"
              value={profile.heightCm || ""}
              onChange={(e) => set("heightCm", e.target.value)}
            />
          </div>
          <div className="profile-field">
            <span className="profile-field-label">Gender</span>
            <div className="gender-btns">
              <button
                type="button"
                className={`gender-btn ${profile.gender === "male" ? "active" : ""}`}
                onClick={() => set("gender", "male")}
              >Male</button>
              <button
                type="button"
                className={`gender-btn ${profile.gender === "female" ? "active" : ""}`}
                onClick={() => set("gender", "female")}
              >Female</button>
            </div>
          </div>
        </div>

        <div className="profile-field">
          <span className="profile-field-label">Activity Level</span>
          <select
            className="profile-select"
            value={profile.activityLevel || ""}
            onChange={(e) => set("activityLevel", e.target.value)}
          >
            <option value="">Select…</option>
            <option value="sedentary">Sedentary (desk job, little exercise)</option>
            <option value="light">Lightly active (1–3 days/week)</option>
            <option value="moderate">Moderately active (3–5 days/week)</option>
            <option value="active">Very active (6–7 days/week)</option>
          </select>
        </div>

        <div className="profile-field">
          <span className="profile-field-label">Weekly Weight Loss Goal</span>
          <select
            className="profile-select"
            value={profile.weeklyLossGoal ?? ""}
            onChange={(e) => set("weeklyLossGoal", e.target.value)}
          >
            <option value="">Select…</option>
            <option value="0">Maintain weight</option>
            <option value="0.25">Lose 0.25 kg/week (mild)</option>
            <option value="0.5">Lose 0.5 kg/week (moderate)</option>
            <option value="0.75">Lose 0.75 kg/week (aggressive)</option>
            <option value="1">Lose 1 kg/week (maximum)</option>
          </select>
        </div>

        {goalResult && (
          <div className="goal-result">
            <p className="goal-result-label">Daily calorie target</p>
            <p className="goal-number">
              {goalResult.goal} <span className="goal-number-unit">kcal</span>
            </p>
            <p className="goal-result-sub">
              BMR {goalResult.bmr} · TDEE {goalResult.tdee}
            </p>
          </div>
        )}

        <button className="save-key-btn" onClick={saveProfile}>
          {profileSaved ? "✅ Profile saved!" : "💾 Save Profile"}
        </button>
      </div>

      {/* Export / Import */}
      <div className="settings-section">
        <label className="settings-label">Backup &amp; Restore</label>
        <p className="settings-desc">
          Export saves all your food entries, weight log, and profile to a file.
          Import it on any device or browser to restore your data.
        </p>
        <div className="backup-row">
          <button className="backup-btn export" onClick={exportData}>
            ⬇️ Export backup
          </button>
          <button className="backup-btn import" onClick={() => importRef.current?.click()}>
            ⬆️ Import backup
          </button>
          <input ref={importRef} type="file" accept=".json,application/json" onChange={handleImport} style={{ display: "none" }} />
        </div>
        {importStatus && <p className="import-status">{importStatus}</p>}
      </div>
    </div>
  );
}
