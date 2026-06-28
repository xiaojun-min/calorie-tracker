import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import FoodInput from "./components/FoodInput";
import FoodCard from "./components/FoodCard";
import FoodHistory from "./components/FoodHistory";
import DailyTotal from "./components/DailyTotal";
import Settings from "./components/Settings";
import { analyzeFood } from "./api/claude";
import { calculateCalorieGoal } from "./utils/tdee";
import "./App.css";

function getToday() {
  return new Date().toLocaleDateString("en-CA");
}

function getTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function serializeArg(arg) {
  if (typeof arg === "string") return arg;
  if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
  try { return JSON.stringify(arg); }
  catch { return String(arg); }
}

export default function App() {
  const [tab, setTab] = useState("home");
  const [entries, setEntries] = useState(() => {
    try { return JSON.parse(localStorage.getItem("food_entries") || "[]"); }
    catch { return []; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState([]);
  const [profileVersion, setProfileVersion] = useState(0);
  const origConsole = useRef({});

  // Intercept console.log / console.error to capture messages on-screen
  useEffect(() => {
    const origLog = console.log.bind(console);
    const origError = console.error.bind(console);
    origConsole.current = { log: origLog, error: origError };

    const capture = (level) => (...args) => {
      origConsole.current[level](...args);
      const msg = args.map(serializeArg).join(" ");
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setLogs((prev) => [...prev, { level, msg, time }]);
    };

    console.log = capture("log");
    console.error = capture("error");

    return () => {
      console.log = origLog;
      console.error = origError;
    };
  }, []);

  // Auto-populate API key from env var on first run
  useEffect(() => {
    const envKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (envKey && !localStorage.getItem("anthropic_api_key")) {
      localStorage.setItem("anthropic_api_key", envKey);
    }
  }, []);

  // Persist entries to localStorage whenever they change
  useEffect(() => {
    try { localStorage.setItem("food_entries", JSON.stringify(entries)); }
    catch { /* storage quota exceeded */ }
  }, [entries]);

  // Derive calorie goal from saved profile; refreshes when profile is saved
  const calorieGoal = useMemo(() => {
    try {
      const profile = JSON.parse(localStorage.getItem("user_profile") || "{}");
      return calculateCalorieGoal(profile)?.goal || 0;
    } catch { return 0; }
  }, [profileVersion]);

  const handleAdd = useCallback(async ({ description, imageBase64, imageMimeType, imageThumbnail, portion = 1, mealLabel = "Snack" }) => {
    const apiKey = localStorage.getItem("anthropic_api_key") || "";
    if (!description?.trim() && !imageBase64) {
      setError("Please describe your food or upload a photo.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await analyzeFood({ description, imageBase64, imageMimeType, apiKey });
      const scale = (v) => Math.round((v || 0) * portion);
      const newEntry = {
        id: Date.now(),
        date: getToday(),
        time: getTime(),
        mealLabel,
        name: result.name,
        emoji: result.emoji || "🍽️",
        calories: scale(result.calories),
        protein: scale(result.protein),
        carbs: scale(result.carbs),
        fat: scale(result.fat),
        fiber: scale(result.fiber),
        sugar: scale(result.sugar),
        sodium: scale(result.sodium),
        saturated_fat: scale(result.saturated_fat),
        imagePreview: imageThumbnail || null,
      };
      setEntries((prev) => [newEntry, ...prev]);
    } catch (err) {
      console.error("[App] analyzeFood error:", err);
      setError(err.message || "Could not analyze food. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  function handleDelete(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  const todayEntries = entries.filter((e) => e.date === getToday());

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">🍽️ What I Ate Today</h1>
      </header>

      {tab === "home" && (
        <main className="main-content">
          <FoodInput onAdd={handleAdd} loading={loading} />

          {error && <div className="error-banner">⚠️ {error}</div>}

          {todayEntries.length === 0 ? (
            <div className="empty-state">
              <span className="empty-emoji">🥗</span>
              <p>No entries today. Add your first meal!</p>
            </div>
          ) : (
            <>
              <div className="entries-list">
                {todayEntries.map((entry) => (
                  <FoodCard key={entry.id} entry={entry} onDelete={handleDelete} />
                ))}
              </div>
              <DailyTotal entries={todayEntries} calorieGoal={calorieGoal} />
            </>
          )}
        </main>
      )}

      {tab === "history" && (
        <main className="main-content">
          <FoodHistory entries={entries} onDelete={handleDelete} />
        </main>
      )}

      {tab === "settings" && (
        <main className="main-content">
          <Settings onProfileSaved={() => setProfileVersion((v) => v + 1)} />
          <div className="debug-panel">
            <div className="debug-header">
              <span className="debug-title">🪲 Debug Log</span>
              <button className="debug-clear-btn" onClick={() => setLogs([])}>Clear</button>
            </div>
            {logs.length === 0 ? (
              <p className="debug-empty">No logs yet. Try uploading a photo.</p>
            ) : (
              <div className="debug-log-list">
                {logs.map((entry, i) => (
                  <div key={i} className={`debug-log-entry ${entry.level}`}>
                    <span className="debug-time">{entry.time}</span>
                    <span className="debug-msg">{entry.msg}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      )}

      <nav className="bottom-nav">
        <button
          className={`nav-btn ${tab === "home" ? "active" : ""}`}
          onClick={() => { setTab("home"); setError(""); }}
        >
          <span className="nav-icon">🍽️</span>
          <span className="nav-label">Today</span>
        </button>
        <button
          className={`nav-btn ${tab === "history" ? "active" : ""}`}
          onClick={() => { setTab("history"); setError(""); }}
        >
          <span className="nav-icon">📅</span>
          <span className="nav-label">History</span>
        </button>
        <button
          className={`nav-btn ${tab === "settings" ? "active" : ""}`}
          onClick={() => { setTab("settings"); setError(""); }}
        >
          <span className="nav-icon">⚙️</span>
          <span className="nav-label">Settings</span>
        </button>
      </nav>
    </div>
  );
}
