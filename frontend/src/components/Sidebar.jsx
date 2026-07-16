import React from "react";
import { Link } from "react-router-dom";
import {
  Lightbulb,
  BookOpen,
  Puzzle,
  Dice5,
  Trash2,
  ArrowLeft,
  Sigma,
} from "lucide-react";

const MODES = [
  { id: "hint", label: "Hint", desc: "Nudge me, no spoilers", icon: Lightbulb },
  { id: "explain", label: "Explain", desc: "Teach me the concept", icon: BookOpen },
  { id: "solution", label: "Full Solution", desc: "Approach + code", icon: Puzzle },
  { id: "generate", label: "New Problem", desc: "Generate practice", icon: Dice5 },
];

const LANGUAGES = ["C++", "Python", "Java", "JavaScript"];

const EXAMPLE_PROMPTS = {
  hint: "I'm stuck on a two-pointer problem involving subarray sums. Where should I start?",
  explain: "Can you explain how segment trees work with an example?",
  solution: "Walk me through solving 'maximum subarray sum with at most k negatives'.",
  generate: "Generate a Div. 2 B-level problem about graphs.",
};

export default function Sidebar({ mode, setMode, language, setLanguage, onClear, onExample, isOpen, onCloseMobile }) {
  return (
    <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`} aria-label="Chat settings">
      <div className="sidebar-top">
        <Link to="/" className="brand" onClick={onCloseMobile}>
          <span className="brand-mark" aria-hidden="true">
            <Sigma size={18} strokeWidth={2.5} />
          </span>
          <div>
            <h1>AlgoMentor AI</h1>
            <p>Your competitive programming coach</p>
          </div>
        </Link>
        <Link to="/" className="back-link" onClick={onCloseMobile}>
          <ArrowLeft size={13} />
          <span>Home</span>
        </Link>
      </div>

      <section aria-labelledby="mode-heading">
        <h2 id="mode-heading">Mode</h2>
        <div className="mode-list" role="radiogroup" aria-labelledby="mode-heading">
          {MODES.map((m) => (
            <button
              key={m.id}
              role="radio"
              aria-checked={mode === m.id}
              className={`mode-btn ${mode === m.id ? "active" : ""}`}
              onClick={() => {
                setMode(m.id);
                onCloseMobile?.();
              }}
            >
              <span className="mode-icon" aria-hidden="true">
                <m.icon size={16} />
              </span>
              <span className="mode-text">
                <span className="mode-label">{m.label}</span>
                <span className="mode-desc">{m.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="lang-heading">
        <h2 id="lang-heading">Language</h2>
        <label htmlFor="lang-select" className="sr-only">Preferred code language</label>
        <select id="lang-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </section>

      <section aria-labelledby="example-heading">
        <h2 id="example-heading">Try an example</h2>
        <button
          className="example-chip"
          onClick={() => {
            onExample?.(EXAMPLE_PROMPTS[mode]);
            onCloseMobile?.();
          }}
        >
          "{EXAMPLE_PROMPTS[mode]}"
        </button>
      </section>

      <button className="clear-btn" onClick={onClear}>
        <Trash2 size={14} />
        <span>Clear conversation</span>
      </button>

      <footer className="sidebar-footer">
        Built with Vibe Coding · React + Express + Gemini
      </footer>
    </aside>
  );
}