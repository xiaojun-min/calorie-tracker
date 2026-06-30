import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import FoodInput from "./components/FoodInput";
import FoodCard from "./components/FoodCard";
import Reports from "./components/Reports";
import DailyTotal from "./components/DailyTotal";
import Settings from "./components/Settings";
import WeightTracker from "./components/WeightTracker";
import { analyzeFood } from "./api/claude";
import { calculateCalorieGoal, calculateNutritionGoals } from "./utils/tdee";
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
    const envKey = import.meta.env.ANTHROPIC_API_KEY;
    if (envKey && !localStorage.getItem("anthropic_api_key")) {
      localStorage.setItem("anthropic_api_key", envKey);
    }
  }, []);

  // Persist entries to localStorage whenever they change.
  // Strip imagePreview (large base64) before saving — images are kept in
  // memory for the current session but not persisted, so localStorage
  // doesn't hit the ~5MB quota.
  useEffect(() => {
    try {
      const toStore = entries.map(({ imagePreview: _img, ...rest }) => rest);
      localStorage.setItem("food_entries", JSON.stringify(toStore));
    } catch { /* storage quota exceeded even without images */ }
  }, [entries]);

  // Derive goals from saved profile; refreshes when profile is saved
  const calorieGoal = useMemo(() => {
    try {
      const profile = JSON.parse(localStorage.getItem("user_profile") || "{}");
      return calculateCalorieGoal(profile)?.goal || 0;
    } catch { return 0; }
  }, [profileVersion]);

  const nutritionGoals = useMemo(() => {
    try {
      const profile = JSON.parse(localStorage.getItem("user_profile") || "{}");
      return calculateNutritionGoals(profile);
    } catch { return null; }
  }, [profileVersion]);

  const handleAdd = useCallback(async ({ description, imageBase64, imageMimeType, imageThumbnail, portionText = "", manualNutrition }) => {
    if (manualNutrition) {
      setEntries((prev) => [{
        id: Date.now(),
        date: getToday(),
        time: getTime(),
        name: manualNutrition.name,
        emoji: manualNutrition.emoji || "🍽️",
        calories: Math.round(manualNutrition.calories || 0),
        protein: Math.round(manualNutrition.protein || 0),
        carbs: Math.round(manualNutrition.carbs || 0),
        fat: Math.round(manualNutrition.fat || 0),
        fiber: Math.round(manualNutrition.fiber || 0),
        sugar: Math.round(manualNutrition.sugar || 0),
        sodium: Math.round(manualNutrition.sodium || 0),
        saturated_fat: Math.round(manualNutrition.saturated_fat || 0),
        health_rating: null,
        imagePreview: null,
      }, ...prev]);
      return;
    }
    const apiKey = localStorage.getItem("anthropic_api_key") || import.meta.env.ANTHROPIC_API_KEY || "";
    if (!description?.trim() && !imageBase64) {
      setError("Please describe your food or upload a photo.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await analyzeFood({ description, imageBase64, imageMimeType, apiKey, portionText });
      const newEntry = {
        id: Date.now(),
        date: getToday(),
        time: getTime(),
        name: result.name,
        emoji: result.emoji || "🍽️",
        calories: Math.round(result.calories || 0),
        protein: Math.round(result.protein || 0),
        carbs: Math.round(result.carbs || 0),
        fat: Math.round(result.fat || 0),
        fiber: Math.round(result.fiber || 0),
        sugar: Math.round(result.sugar || 0),
        sodium: Math.round(result.sodium || 0),
        saturated_fat: Math.round(result.saturated_fat || 0),
        health_rating: result.health_rating ?? null,
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

  function handleEdit(id, { date, name, calories, protein, carbs, fat, fiber, sugar, sodium, saturated_fat }) {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        return {
          ...e,
          date: date || e.date,
          name: name || e.name,
          calories: Math.round(calories ?? e.calories),
          protein: Math.round(protein ?? e.protein),
          carbs: Math.round(carbs ?? e.carbs),
          fat: Math.round(fat ?? e.fat),
          fiber: Math.round(fiber ?? e.fiber ?? 0),
          sugar: Math.round(sugar ?? e.sugar ?? 0),
          sodium: Math.round(sodium ?? e.sodium ?? 0),
          saturated_fat: Math.round(saturated_fat ?? e.saturated_fat ?? 0),
        };
      })
    );
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
                  <FoodCard key={entry.id} entry={entry} onDelete={handleDelete} onEdit={handleEdit} />
                ))}
              </div>
              <DailyTotal entries={todayEntries} calorieGoal={calorieGoal} nutritionGoals={nutritionGoals} />
            </>
          )}
        </main>
      )}

      {tab === "reports" && (
        <main className="main-content">
          <Reports entries={entries} onDelete={handleDelete} onEdit={handleEdit} calorieGoal={calorieGoal} nutritionGoals={nutritionGoals} />
        </main>
      )}

      {tab === "weight" && (
        <main className="main-content">
          <WeightTracker />
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
          className={`nav-btn ${tab === "reports" ? "active" : ""}`}
          onClick={() => { setTab("reports"); setError(""); }}
        >
          <span className="nav-icon">📊</span>
          <span className="nav-label">Reports</span>
        </button>
        <button
          className={`nav-btn ${tab === "weight" ? "active" : ""}`}
          onClick={() => { setTab("weight"); setError(""); }}
        >
          <span className="nav-icon">⚖️</span>
          <span className="nav-label">Weight</span>
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
