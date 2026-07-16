import React from "react";

const MODES = [
  { id: "hint", label: "💡 Hint", desc: "Nudge me, no spoilers" },
  { id: "explain", label: "📘 Explain", desc: "Teach me the concept" },
  { id: "solution", label: "🧩 Full Solution", desc: "Approach + code" },
  { id: "generate", label: "🎲 New Problem", desc: "Generate practice" },
];

const LANGUAGES = ["C++", "Python", "Java", "JavaScript"];

export default function Sidebar({ mode, setMode, language, setLanguage, onClear }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">Σ</span>
        <div>
          <h1>AlgoMentor AI</h1>
          <p>Your competitive programming coach</p>
        </div>
      </div>

      <section>
        <h2>Mode</h2>
        <div className="mode-list">
          {MODES.map((m) => (
            <button
              key={m.id}
              className={`mode-btn ${mode === m.id ? "active" : ""}`}
              onClick={() => setMode(m.id)}
            >
              <span className="mode-label">{m.label}</span>
              <span className="mode-desc">{m.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>Language</h2>
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </section>

      <button className="clear-btn" onClick={onClear}>Clear conversation</button>

      <footer className="sidebar-footer">
        Built with Vibe Coding · React + Express + Claude
      </footer>
    </aside>
  );
}
