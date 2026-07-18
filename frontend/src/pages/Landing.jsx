import React from "react";
import { Link } from "react-router-dom";
import {
  Lightbulb,
  BookOpen,
  Puzzle,
  Dice5,
  Zap,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: Lightbulb,
    title: "Hint Mode",
    desc: "Get nudged toward the right idea without spoiling the problem.",
  },
  {
    icon: BookOpen,
    title: "Explain Mode",
    desc: "Understand the algorithm or data structure behind a pattern.",
  },
  {
    icon: Puzzle,
    title: "Full Solutions",
    desc: "Clean, complexity-annotated walkthroughs once you're ready.",
  },
  {
    icon: Dice5,
    title: "Practice Generator",
    desc: "Fresh Codeforces-style problems on any topic, on demand.",
    link: "/practice",
  },
];

const STEPS = [
  { n: "01", title: "Paste a problem or ask a question", desc: "Drop in a Codeforces link's statement, or just ask about a topic like segment trees." },
  { n: "02", title: "Pick your mode & language", desc: "Hint, Explain, Full Solution, or Generate — in C++, Python, Java, or JS." },
  { n: "03", title: "Learn as it streams", desc: "Responses render live, so you can follow the reasoning as it forms." },
];

export default function Landing() {
  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-badge">
          <Sparkles size={14} />
          <span>Built for Codeforces & interview prep</span>
        </div>
        <h1 className="hero-title">
          Practice smarter with an
          <span className="hero-title-accent"> AI mentor</span> that never spoils the answer
        </h1>
        <p className="hero-subtitle">
          AlgoMentor gives you graduated help — hints, explanations, full walkthroughs, or brand
          new practice problems — so you build real intuition instead of copy-pasting editorials.
        </p>
        <div className="hero-actions">
          <Link to="/chat" className="btn-primary">
            Start practicing <ArrowRight size={16} />
          </Link>
          <a href="#how-it-works" className="btn-secondary">
            See how it works
          </a>
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <strong>4</strong>
            <span>mentoring modes</span>
          </div>
          <div className="hero-stat">
            <strong>4</strong>
            <span>languages supported</span>
          </div>
          <div className="hero-stat">
            <strong>0ms</strong>
            <span>wait — streamed live</span>
          </div>
        </div>
      </section>

<section className="features">
        <h2 className="section-title">Four ways to get unstuck</h2>
        <div className="feature-grid">
          {FEATURES.map((f) =>
            f.link ? (
              <Link to={f.link} className="feature-card feature-card-link" key={f.title}>
                <div className="feature-icon">
                  <f.icon size={20} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </Link>
            ) : (
              <div className="feature-card" key={f.title}>
                <div className="feature-icon">
                  <f.icon size={20} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            )
          )}
        </div>
      </section>

      <section className="how-it-works" id="how-it-works">
        <h2 className="section-title">How it works</h2>
        <div className="steps">
          {STEPS.map((s) => (
            <div className="step" key={s.n}>
              <span className="step-number">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="trust-strip">
        <div className="trust-item">
          <Zap size={16} />
          <span>Real-time streaming responses</span>
        </div>
        <div className="trust-item">
          <ShieldCheck size={16} />
          <span>API keys stay server-side, always</span>
        </div>
      </section>

      <section className="final-cta">
        <h2>Ready to level up your practice?</h2>
        <Link to="/chat" className="btn-primary">
          Open AlgoMentor <ArrowRight size={16} />
        </Link>
      </section>

      <footer className="landing-footer">
        Built with Vibe Coding · React + Express + Gemini
      </footer>
    </div>
  );
}