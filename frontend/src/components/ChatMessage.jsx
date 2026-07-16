import React from "react";

// Very small formatter: turns ```code``` fenced blocks into <pre><code>,
// and leaves the rest as plain text with line breaks preserved.
function renderContent(text) {
  const parts = text.split(/```(\w*)\n?/g);
  // parts alternates: [plainText, lang, code, plainText, lang, code, ...]
  const nodes = [];
  for (let i = 0; i < parts.length; i++) {
    if (i % 3 === 0) {
      if (parts[i]) {
        nodes.push(
          <p key={`t-${i}`} style={{ whiteSpace: "pre-wrap", margin: "0 0 8px" }}>
            {parts[i]}
          </p>
        );
      }
    } else if (i % 3 === 2) {
      nodes.push(
        <pre key={`c-${i}`} className="code-block">
          <code>{parts[i]}</code>
        </pre>
      );
    }
  }
  return nodes;
}

export default function ChatMessage({ role, content }) {
  const isUser = role === "user";
  return (
    <div className={`message-row ${isUser ? "user" : "assistant"}`}>
      <div className="avatar">{isUser ? "🧑‍💻" : "Σ"}</div>
      <div className="bubble">{renderContent(content)}</div>
    </div>
  );
}
