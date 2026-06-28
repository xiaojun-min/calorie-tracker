import { useState, useCallback } from "react";
import FoodInput from "./components/FoodInput";
import FoodCard from "./components/FoodCard";
import DailyTotal from "./components/DailyTotal";
import Settings from "./components/Settings";
import { translations } from "./i18n";
import { analyzeFood } from "./api/claude";
import "./App.css";

function getTime() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function App() {
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "en");
  const [tab, setTab] = useState("home");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const t = translations[lang];

  function handleLangChange(l) {
    setLang(l);
    localStorage.setItem("lang", l);
  }

  const handleAdd = useCallback(
    async ({ description, imageBase64, imageMimeType }) => {
      const apiKey = localStorage.getItem("anthropic_api_key") || "";
      if (!apiKey) {
        setError(t.errorNoKey);
        setTab("settings");
        return;
      }
      if (!description?.trim() && !imageBase64) {
        setError(t.errorNoInput);
        return;
      }
      setError("");
      setLoading(true);
      try {
        const result = await analyzeFood({ description, imageBase64, imageMimeType, apiKey });
        const imagePreview = imageBase64
          ? `data:${imageMimeType || "image/jpeg"};base64,${imageBase64}`
          : null;
        const newEntry = {
          id: Date.now(),
          name: result.name,
          emoji: result.emoji || "🍽️",
          calories: Math.round(result.calories || 0),
          protein: Math.round(result.protein || 0),
          carbs: Math.round(result.carbs || 0),
          fat: Math.round(result.fat || 0),
          time: getTime(),
          imagePreview,
        };
        setEntries((prev) => [newEntry, ...prev]);
      } catch (err) {
        setError(err.message || t.errorAnalysis);
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  function handleDelete(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">{t.appTitle}</h1>
      </header>

      {tab === "home" && (
        <main className="main-content">
          <FoodInput onAdd={handleAdd} t={t} loading={loading} />

          {error && (
            <div className="error-banner">
              ⚠️ {error}
            </div>
          )}

          {entries.length === 0 ? (
            <div className="empty-state">
              <span className="empty-emoji">🥗</span>
              <p>{t.noEntries}</p>
            </div>
          ) : (
            <>
              <div className="entries-list">
                {entries.map((entry) => (
                  <FoodCard
                    key={entry.id}
                    entry={entry}
                    onDelete={handleDelete}
                    t={t}
                  />
                ))}
              </div>
              <DailyTotal entries={entries} t={t} />
            </>
          )}
        </main>
      )}

      {tab === "settings" && (
        <main className="main-content">
          <Settings t={t} lang={lang} setLang={handleLangChange} />
        </main>
      )}

      <nav className="bottom-nav">
        <button
          className={`nav-btn ${tab === "home" ? "active" : ""}`}
          onClick={() => { setTab("home"); setError(""); }}
        >
          <span className="nav-icon">🍽️</span>
          <span className="nav-label">{t.home}</span>
        </button>
        <button
          className={`nav-btn ${tab === "settings" ? "active" : ""}`}
          onClick={() => { setTab("settings"); setError(""); }}
        >
          <span className="nav-icon">⚙️</span>
          <span className="nav-label">{t.settings}</span>
        </button>
      </nav>
    </div>
  );
}
