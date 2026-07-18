import React from "react";

/**
 * Lightweight markdown-ish renderer — no external dependency.
 * Supports: fenced code blocks, headers (#, ##, ###), bold (**text**),
 * italic (*text*), inline code (`code`), unordered lists (- item),
 * and paragraphs. Enough for AI chat responses without pulling in a
 * full markdown library.
 */

function renderInline(text, keyPrefix) {
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = text.split(pattern);

  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (!part) return null;
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={key} className="inline-code">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

export function renderMarkdownBlock(text, blockKey) {
  const lines = text.split("\n");
  const elements = [];
  let listBuffer = [];

  const flushList = (idx) => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={`${blockKey}-ul-${idx}`} className="md-list">
          {listBuffer.map((item, i) => (
            <li key={`${blockKey}-li-${idx}-${i}`}>{renderInline(item, `${blockKey}-li-${idx}-${i}`)}</li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (/^-\s+/.test(trimmed)) {
      listBuffer.push(trimmed.replace(/^-\s+/, ""));
      return;
    }
    flushList(idx);

    if (/^###\s+/.test(trimmed)) {
      elements.push(<h4 key={`${blockKey}-h-${idx}`} className="md-h3">{renderInline(trimmed.replace(/^###\s+/, ""), `${blockKey}-h-${idx}`)}</h4>);
      return;
    }
    if (/^##\s+/.test(trimmed)) {
      elements.push(<h3 key={`${blockKey}-h-${idx}`} className="md-h2">{renderInline(trimmed.replace(/^##\s+/, ""), `${blockKey}-h-${idx}`)}</h3>);
      return;
    }
    if (/^#\s+/.test(trimmed)) {
      elements.push(<h2 key={`${blockKey}-h-${idx}`} className="md-h1">{renderInline(trimmed.replace(/^#\s+/, ""), `${blockKey}-h-${idx}`)}</h2>);
      return;
    }
    if (trimmed === "") {
      return;
    }
    elements.push(
      <p key={`${blockKey}-p-${idx}`} className="md-p">
        {renderInline(line, `${blockKey}-p-${idx}`)}
      </p>
    );
  });

  flushList(lines.length);
  return elements;
}