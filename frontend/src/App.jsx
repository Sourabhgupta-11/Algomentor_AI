import React, { useEffect, useRef, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import ChatMessage from "./components/ChatMessage.jsx";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const WELCOME = {
  role: "assistant",
  content:
    "Hey! I'm AlgoMentor. Paste a Codeforces problem, ask about an algorithm, or tell me a topic and I'll generate a fresh practice problem. Pick a mode on the left to control how much I reveal.",
};

export default function App() {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("hint");
  const [language, setLanguage] = useState("C++");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleClear = () => {
    setMessages([WELCOME]);
    setError(null);
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const nextMessages = [...messages, { role: "user", content: trimmed }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setIsStreaming(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.filter((m) => m !== WELCOME),
          mode,
          language,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const chunks = buffer.split("\n\n");
        buffer = chunks.pop();

        for (const chunk of chunks) {
          const lines = chunk.split("\n");
          const eventLine = lines.find((l) => l.startsWith("event:"));
          const dataLine = lines.find((l) => l.startsWith("data:"));
          if (!eventLine || !dataLine) continue;

          const eventType = eventLine.replace("event:", "").trim();
          const data = JSON.parse(dataLine.replace("data:", "").trim() || "{}");

          if (eventType === "token" && data.text) {
            assistantText += data.text;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: assistantText };
              return updated;
            });
          } else if (eventType === "error") {
            throw new Error(data.error || "Streaming error");
          }
        }
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong talking to the AI. Please check the backend and try again.");
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="app-shell">
      <Sidebar mode={mode} setMode={setMode} language={language} setLanguage={setLanguage} onClear={handleClear} />

      <main className="chat-panel">
        <div className="chat-scroll" ref={scrollRef}>
          {messages.map((m, i) => (
            <ChatMessage key={i} role={m.role} content={m.content} />
          ))}
          {error && <div className="error-banner">{error}</div>}
        </div>

        <div className="composer">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about a problem, algorithm, or say "generate a DP problem"...`}
            rows={2}
          />
          <button onClick={sendMessage} disabled={isStreaming || !input.trim()}>
            {isStreaming ? "Thinking…" : "Send"}
          </button>
        </div>
      </main>
    </div>
  );
}
