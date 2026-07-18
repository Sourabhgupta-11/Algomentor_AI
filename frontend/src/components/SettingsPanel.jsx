import React, { useEffect, useRef, useState } from "react";
import { Lightbulb, BookOpen, Puzzle, Dice5, ChevronDown, Sparkles } from "lucide-react";

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

export default function SettingsPanel({ mode, setMode, language, setLanguage, onExample }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const activeMode = MODES.find((m) => m.id === mode) || MODES[0];

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="settings-panel" ref={panelRef}>
      <button className="settings-trigger" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <activeMode.icon size={15} />
        <span>{activeMode.label}</span>
        <span className="settings-trigger-lang">{language}</span>
        <ChevronDown size={14} className={`chevron ${open ? "chevron-up" : ""}`} />
      </button>

      {open && (
        <div className="settings-dropdown">
          <div className="settings-section">
            <h3>Mode</h3>
            <div className="settings-mode-grid">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  className={`settings-mode-btn ${mode === m.id ? "active" : ""}`}
                  onClick={() => setMode(m.id)}
                >
                  <m.icon size={16} />
                  <span className="settings-mode-label">{m.label}</span>
                  <span className="settings-mode-desc">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="settings-section">
            <h3>Language</h3>
            <div className="settings-lang-row">
              {LANGUAGES.map((l) => (
                <button
                  key={l}
                  className={`lang-chip ${language === l ? "active" : ""}`}
                  onClick={() => setLanguage(l)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <button
            className="settings-example-btn"
            onClick={() => {
              onExample?.(EXAMPLE_PROMPTS[mode]);
              setOpen(false);
            }}
          >
            <Sparkles size={13} />
            <span>Try an example prompt</span>
          </button>
        </div>
      )}
    </div>
  );
}