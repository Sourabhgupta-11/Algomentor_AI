import React, { useEffect, useRef, useState } from "react";
import { Send, Menu, X, AlertTriangle, Square } from "lucide-react";
import ConversationRail from "../components/ConversationRail.jsx";
import SettingsPanel from "../components/SettingsPanel.jsx";
import ChatMessage from "../components/ChatMessage.jsx";
import { useChatHistory } from "../context/ChatHistoryContext.jsx";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export default function Chat() {
  const { activeConversation, updateConversation, clearConversation } = useChatHistory();
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const abortRef = useRef(null);

  const messages = activeConversation?.messages || [];
  const mode = activeConversation?.mode || "hint";
  const language = activeConversation?.language || "C++";
  const convId = activeConversation?.id;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, [convId]);

  const setMode = (m) => updateConversation(convId, { mode: m });
  const setLanguage = (l) => updateConversation(convId, { language: l });

  const handleExample = (text) => {
    setInput(text);
    textareaRef.current?.focus();
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  const runStream = async (historyForRequest) => {
    setIsStreaming(true);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historyForRequest.map((m) => ({ role: m.role, content: m.content })),
          mode,
          language,
        }),
        signal: controller.signal,
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
            updateConversation(convId, (c) => {
              const updated = [...c.messages];
              updated[updated.length - 1] = {
                role: "assistant",
                content: assistantText,
                timestamp: updated[updated.length - 1].timestamp,
              };
              return { messages: updated };
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
      if (err.name === "AbortError") {
        return;
      }
      console.error(err);
      setError(err.message || "Something went wrong talking to the AI. Check the backend logs for details.");
      updateConversation(convId, (c) => {
        const updated = [...c.messages];
        if (updated[updated.length - 1]?.role === "assistant" && updated[updated.length - 1]?.content === "") {
          updated.pop();
        }
        return { messages: updated };
      });
    } finally {
      setIsStreaming(false);
      textareaRef.current?.focus();
    }
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || !convId) return;

    const userMsg = { role: "user", content: trimmed, timestamp: Date.now() };
    const nextMessages = [...messages, userMsg, { role: "assistant", content: "", timestamp: Date.now() }];
    updateConversation(convId, { messages: nextMessages });
    setInput("");

    await runStream([...messages, userMsg]);
  };

  const handleRegenerate = async () => {
    if (isStreaming || messages.length < 2) return;
    const withoutLast = messages.slice(0, -1);
    updateConversation(convId, { messages: [...withoutLast, { role: "assistant", content: "", timestamp: Date.now() }] });
    await runStream(withoutLast);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const lastMsgIsEmptyAssistant =
    messages.length > 0 &&
    messages[messages.length - 1].role === "assistant" &&
    messages[messages.length - 1].content === "";

  return (
    <div className="chat-shell">
      <button
        className="mobile-menu-btn"
        aria-label={sidebarOpen ? "Close conversation history" : "Open conversation history"}
        aria-expanded={sidebarOpen}
        onClick={() => setSidebarOpen((o) => !o)}
      >
        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      <ConversationRail isOpen={sidebarOpen} onCloseMobile={() => setSidebarOpen(false)} />

      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}

      <main className="chat-panel">
        <header className="chat-header">
          <h2 className="chat-header-title">{activeConversation?.title || "Chat"}</h2>
          <div className="chat-header-controls">
            <SettingsPanel mode={mode} setMode={setMode} language={language} setLanguage={setLanguage} onExample={handleExample} />
            <button className="clear-icon-btn" onClick={() => clearConversation(convId)} title="Clear this conversation">
              Clear
            </button>
          </div>
        </header>

        <div className="chat-scroll" ref={scrollRef} role="log" aria-live="polite" aria-label="Conversation">
          {messages.map((m, i) => (
            <ChatMessage
              key={i}
              role={m.role}
              content={m.content}
              timestamp={m.timestamp}
              isLastAssistant={i === messages.length - 1 && m.role === "assistant"}
              isStreaming={isStreaming}
              onRegenerate={handleRegenerate}
            />
          ))}
          {isStreaming && lastMsgIsEmptyAssistant && (
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
          {isStreaming ? (
            <button className="send-btn stop-btn" onClick={stopStreaming} aria-label="Stop generating">
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              className="send-btn"
              onClick={sendMessage}
              disabled={!input.trim()}
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          )}
        </div>
      </main>
    </div>
  );
}