import React, { useState } from "react";
import { Check, Copy, User, Sigma as SigmaIcon } from "lucide-react";

// Very small formatter: turns ```code``` fenced blocks into <pre><code>,
// and leaves the rest as plain text with line breaks preserved.
function parseContent(text) {
  const parts = text.split(/```(\w*)\n?/g);
  const blocks = [];
  for (let i = 0; i < parts.length; i++) {
    if (i % 3 === 0) {
      if (parts[i]) blocks.push({ type: "text", value: parts[i] });
    } else if (i % 3 === 2) {
      blocks.push({ type: "code", value: parts[i], lang: parts[i - 1] || "" });
    }
  }
  return blocks;
}

function CodeBlock({ value, lang }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable; silently ignore
    }
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-lang">{lang || "code"}</span>
        <button className="copy-btn" onClick={handleCopy} aria-label="Copy code">
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="code-block">
        <code>{value}</code>
      </pre>
    </div>
  );
}

export default function ChatMessage({ role, content, timestamp }) {
  const isUser = role === "user";
  const blocks = parseContent(content);
  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className={`message-row ${isUser ? "user" : "assistant"}`}>
      <div className="avatar" aria-hidden="true">
        {isUser ? <User size={15} /> : <SigmaIcon size={15} />}
      </div>
      <div className="bubble-col">
        <div className="bubble">
          <span className="sr-only">{isUser ? "You said: " : "AlgoMentor said: "}</span>
          {blocks.map((b, i) =>
            b.type === "code" ? (
              <CodeBlock key={i} value={b.value} lang={b.lang} />
            ) : (
              <p key={i} style={{ whiteSpace: "pre-wrap", margin: "0 0 8px" }}>
                {b.value}
              </p>
            )
          )}
        </div>
        {time && <span className="message-time">{time}</span>}
      </div>
    </div>
  );
}