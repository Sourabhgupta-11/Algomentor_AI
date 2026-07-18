import React from "react";
import { Link } from "react-router-dom";
import { Plus, MessageSquare, Trash2, ArrowLeft, Sigma } from "lucide-react";
import { useChatHistory } from "../context/ChatHistoryContext.jsx";

export default function ConversationRail({ isOpen, onCloseMobile }) {
  const { conversations, activeId, setActiveId, createConversation, deleteConversation } = useChatHistory();

  const handleSelect = (id) => {
    setActiveId(id);
    onCloseMobile?.();
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    deleteConversation(id);
  };

  return (
    <aside className={`conv-rail ${isOpen ? "conv-rail-open" : ""}`} aria-label="Conversation history">
      <div className="conv-rail-top">
        <Link to="/" className="brand" onClick={onCloseMobile}>
          <span className="brand-mark" aria-hidden="true">
            <Sigma size={16} strokeWidth={2.5} />
          </span>
          <span className="brand-name">AlgoMentor</span>
        </Link>
      </div>

      <button className="new-chat-btn" onClick={() => { createConversation(); onCloseMobile?.(); }}>
        <Plus size={15} />
        <span>New chat</span>
      </button>

      <div className="conv-list">
        {conversations.map((c) => (
          <button
            key={c.id}
            className={`conv-item ${c.id === activeId ? "active" : ""}`}
            onClick={() => handleSelect(c.id)}
          >
            <MessageSquare size={14} className="conv-item-icon" />
            <span className="conv-item-title">{c.title}</span>
            <span
              className="conv-item-delete"
              role="button"
              tabIndex={0}
              aria-label="Delete conversation"
              onClick={(e) => handleDelete(e, c.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleDelete(e, c.id);
              }}
            >
              <Trash2 size={13} />
            </span>
          </button>
        ))}
      </div>

      <Link to="/" className="conv-rail-back" onClick={onCloseMobile}>
        <ArrowLeft size={13} />
        <span>Back to home</span>
      </Link>
    </aside>
  );
}