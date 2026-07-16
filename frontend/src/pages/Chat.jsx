import React, { useEffect, useRef, useState } from "react";
import { Send, Menu, X, AlertTriangle } from "lucide-react";
import Sidebar from "../components/Sidebar.jsx";
import ChatMessage from "../components/ChatMessage.jsx";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const WELCOME = {
  role: "assistant",
  content:
    "Hey! I'm AlgoMentor. Paste a Codeforces problem, ask about an algorithm, or tell me a topic and I'll generate a fresh practice problem. Pick a mode on the left to control how much I reveal.",
  timestamp: Date.now(),
};

export default function Chat() {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("hint");
  const [language, setLanguage] = useState("C++");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Auto-resize the composer textarea as the user types.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const handleClear = () => {
    setMessages([WELCOME]);
    setError(null);
    textareaRef.current?.focus();
  };

  const handleExample = (text) => {
    setInput(text);
    textareaRef.current?.focus();
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMsg = { role: "user", content: trimmed, timestamp: Date.now() };
    const nextMessages = [...messages, userMsg];
    setMessages([...nextMessages, { role: "assistant", content: "", timestamp: Date.now() }]);
    setInput("");
    setIsStreaming(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages
            .filter((m) => m !== WELCOME)
            .map((m) => ({ role: m.role, content: m.content })),
          mode,
          language,
        }),
      });

      if (!response.ok || !response.body) {
        let detail = "";
        try {
          const errJson = await response.json();
          detail = errJson?.error || "";
        } catch {
          // not JSON
        }
        throw new Error(detail || `Server responded with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";
      let streamErrored = false;

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
          let data = {};
          try {
            data = JSON.parse(dataLine.replace("data:", "").trim() || "{}");
          } catch {
            continue;
          }

          if (eventType === "token" && data.text) {
            assistantText += data.text;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: assistantText,
                timestamp: updated[updated.length - 1].timestamp,
              };
              return updated;
            });
          } else if (eventType === "error") {
            streamErrored = true;
            throw new Error(data.error || "Unknown streaming error from the server.");
          }
        }
      }

      if (!streamErrored && !assistantText) {
        throw new Error("The AI returned an empty response. Try again, or check the backend logs.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong talking to the AI. Check the backend logs for details.");
      setMessages((prev) => {
        const updated = [...prev];
        if (updated[updated.length - 1]?.role === "assistant" && updated[updated.length - 1]?.content === "") {
          updated.pop();
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isLastAssistantEmpty =
    isStreaming &&
    messages.length > 0 &&
    messages[messages.length - 1].role === "assistant" &&
    messages[messages.length - 1].content === "";

  return (
    <div className="chat-shell">
      <button
        className="mobile-menu-btn"
        aria-label={sidebarOpen ? "Close settings menu" : "Open settings menu"}
        aria-expanded={sidebarOpen}
        onClick={() => setSidebarOpen((o) => !o)}
      >
        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      <Sidebar
        mode={mode}
        setMode={setMode}
        language={language}
        setLanguage={setLanguage}
        onClear={handleClear}
        onExample={handleExample}
        isOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}

      <main className="chat-panel">
        <header className="chat-header">
          <h2>Chat</h2>
          <span className="chat-header-sub">
            <span className={`mode-pill mode-pill-${mode}`}>{mode}</span>
            <span className="chat-header-lang">{language}</span>
          </span>
        </header>

        <div className="chat-scroll" ref={scrollRef} role="log" aria-live="polite" aria-label="Conversation">
          {messages.map((m, i) => (
            <ChatMessage key={i} role={m.role} content={m.content} timestamp={m.timestamp} />
          ))}
          {isLastAssistantEmpty && (
            <div className="message-row assistant" aria-label="AlgoMentor is typing">
              <div className="avatar" aria-hidden="true">Σ</div>
              <div className="bubble typing-bubble">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}
          {error && (
            <div className="error-banner" role="alert">
              <AlertTriangle size={16} />
              <div>
                <strong>Couldn't reach the AI</strong>
                <p>{error}</p>
              </div>
            </div>
          )}
        </div>

        <div className="composer">
          <label htmlFor="chat-input" className="sr-only">Message AlgoMentor</label>
          <textarea
            id="chat-input"
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about a problem, algorithm, or say "generate a DP problem"...`}
            rows={1}
            aria-label="Type your message"
          />
          <button
            className="send-btn"
            onClick={sendMessage}
            disabled={isStreaming || !input.trim()}
            aria-label={isStreaming ? "Waiting for response" : "Send message"}
          >
            {isStreaming ? (
              <span className="send-spinner" aria-hidden="true" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </main>
    </div>
  );
}