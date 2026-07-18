import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const ChatHistoryContext = createContext(null);
const STORAGE_KEY = "algomentor-conversations";

function loadConversations() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function makeTitle(text) {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length > 42 ? `${trimmed.slice(0, 42)}…` : trimmed || "New conversation";
}

const WELCOME_MESSAGE = {
  role: "assistant",
  content:
    "Hey! I'm AlgoMentor. Paste a Codeforces problem, ask about an algorithm, or tell me a topic and I'll generate a fresh practice problem. Pick a mode to control how much I reveal.",
  timestamp: Date.now(),
};

function makeConversation() {
  return {
    id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: "New conversation",
    mode: "hint",
    language: "C++",
    messages: [WELCOME_MESSAGE],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function ChatHistoryProvider({ children }) {
  const [conversations, setConversations] = useState(() => {
    const existing = loadConversations();
    return existing.length > 0 ? existing : [makeConversation()];
  });
  const [activeId, setActiveId] = useState(() => {
    const existing = loadConversations();
    return existing.length > 0 ? existing[0].id : null;
  });

  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      setActiveId(conversations[0].id);
    }
  }, [activeId, conversations]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch {
      // storage full or unavailable; fail silently, app still works in-memory
    }
  }, [conversations]);

  const createConversation = useCallback(() => {
    const fresh = makeConversation();
    setConversations((prev) => [fresh, ...prev]);
    setActiveId(fresh.id);
    return fresh.id;
  }, []);

  const deleteConversation = useCallback(
    (id) => {
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (next.length === 0) {
          const fresh = makeConversation();
          setActiveId(fresh.id);
          return [fresh];
        }
        if (id === activeId) {
          setActiveId(next[0].id);
        }
        return next;
      });
    },
    [activeId]
  );

  const updateConversation = useCallback((id, updater) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const patch = typeof updater === "function" ? updater(c) : updater;
        const updated = { ...c, ...patch, updatedAt: Date.now() };
        // Auto-title from the first user message, once available.
        if (updated.title === "New conversation") {
          const firstUserMsg = updated.messages.find((m) => m.role === "user");
          if (firstUserMsg) updated.title = makeTitle(firstUserMsg.content);
        }
        return updated;
      })
    );
  }, []);

  const clearConversation = useCallback((id) => {
    updateConversation(id, { messages: [WELCOME_MESSAGE], title: "New conversation" });
  }, [updateConversation]);

  const activeConversation = conversations.find((c) => c.id === activeId) || conversations[0];

  return (
    <ChatHistoryContext.Provider
      value={{
        conversations,
        activeId: activeConversation?.id,
        activeConversation,
        setActiveId,
        createConversation,
        deleteConversation,
        updateConversation,
        clearConversation,
      }}
    >
      {children}
    </ChatHistoryContext.Provider>
  );
}

export function useChatHistory() {
  const ctx = useContext(ChatHistoryContext);
  if (!ctx) throw new Error("useChatHistory must be used within a ChatHistoryProvider");
  return ctx;
}