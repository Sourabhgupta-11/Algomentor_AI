import React, { useEffect, useState } from "react";
import { Dice5, Copy, Check, RefreshCw, AlertTriangle, Tag } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const FALLBACK_TOPICS = [
  { id: "arrays", label: "Arrays & Strings" },
  { id: "dp", label: "Dynamic Programming" },
  { id: "graphs", label: "Graphs (BFS/DFS)" },
  { id: "greedy", label: "Greedy" },
];
const FALLBACK_DIFFICULTIES = ["Div. 2 A", "Div. 2 B", "Div. 2 C", "Div. 2 D"];

export default function Practice() {
  const [topics, setTopics] = useState(FALLBACK_TOPICS);
  const [difficulties, setDifficulties] = useState(FALLBACK_DIFFICULTIES);
  const [topic, setTopic] = useState(FALLBACK_TOPICS[0].id);
  const [difficulty, setDifficulty] = useState(FALLBACK_DIFFICULTIES[1]);
  const [language, setLanguage] = useState("C++");
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/topics`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.topics) && data.topics.length) {
          setTopics(data.topics);
          setTopic(data.topics[0].id);
        }
        if (Array.isArray(data.difficulties) && data.difficulties.length) {
          setDifficulties(data.difficulties);
          setDifficulty(data.difficulties[1] || data.difficulties[0]);
        }
      })
      .catch(() => {
        // Non-fatal: fall back to the static defaults already in state.
      });
  }, []);

  const generateProblem = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/problems/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, difficulty, language }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Server responded with status ${res.status}`);
      }
      setProblem(data.problem);
    } catch (err) {
      console.error(err);
      setError(err.message || "Couldn't generate a problem. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!problem) return;
    const text = `${problem.title} (${problem.difficulty})\n\n${problem.statement}\n\nConstraints:\n${problem.constraints}\n\nSample Input:\n${problem.sampleInput}\n\nSample Output:\n${problem.sampleOutput}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  };

  return (
    <div className="practice-page">
      <div className="practice-header">
        <h1>Practice Problem Generator</h1>
        <p>Pick a topic and difficulty, and get a fresh, original problem to solve — no editorial attached.</p>
      </div>

      <div className="practice-controls">
        <div className="practice-field">
          <label htmlFor="topic-select">Topic</label>
          <select id="topic-select" value={topic} onChange={(e) => setTopic(e.target.value)}>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="practice-field">
          <label htmlFor="difficulty-select">Difficulty</label>
          <select id="difficulty-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            {difficulties.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="practice-field">
          <label htmlFor="language-select">Hint language</label>
          <select id="language-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
            {["C++", "Python", "Java", "JavaScript"].map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        <button className="btn-primary practice-generate-btn" onClick={generateProblem} disabled={loading}>
          {loading ? <RefreshCw size={16} className="spin-icon" /> : <Dice5 size={16} />}
          <span>{loading ? "Generating…" : problem ? "New problem" : "Generate problem"}</span>
        </button>
      </div>

      {error && (
        <div className="error-banner practice-error" role="alert">
          <AlertTriangle size={16} />
          <div>
            <strong>Couldn't generate a problem</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {!problem && !loading && !error && (
        <div className="practice-empty">
          <Dice5 size={32} />
          <p>Pick your settings above and generate your first problem.</p>
        </div>
      )}

      {problem && (
        <div className="problem-card">
          <div className="problem-card-header">
            <div>
              <h2>{problem.title}</h2>
              <div className="problem-tags">
                <span className="difficulty-badge">{problem.difficulty}</span>
                {(problem.tags || []).map((t) => (
                  <span key={t} className="topic-tag">
                    <Tag size={11} />
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <button className="copy-btn problem-copy-btn" onClick={handleCopy}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>

          <div className="problem-section">
            <h3>Statement</h3>
            <p className="problem-statement">{problem.statement}</p>
          </div>

          <div className="problem-section">
            <h3>Constraints</h3>
            <pre className="problem-pre">{problem.constraints}</pre>
          </div>

          <div className="problem-io-grid">
            <div className="problem-section">
              <h3>Sample Input</h3>
              <pre className="problem-pre">{problem.sampleInput}</pre>
            </div>
            <div className="problem-section">
              <h3>Sample Output</h3>
              <pre className="problem-pre">{problem.sampleOutput}</pre>
            </div>
          </div>

          {problem.hint && (
            <details className="problem-hint">
              <summary>Show a hint</summary>
              <p>{problem.hint}</p>
            </details>
          )}
        </div>
      )}
    </div>
  );
}