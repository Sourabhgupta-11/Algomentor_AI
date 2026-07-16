import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Sigma, Sun, Moon, MessageSquareCode } from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const isChat = location.pathname.startsWith("/chat");

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="navbar-mark" aria-hidden="true">
          <Sigma size={18} strokeWidth={2.5} />
        </span>
        <span className="navbar-title">AlgoMentor AI</span>
      </Link>

      <div className="navbar-actions">
        {!isChat && (
          <Link to="/chat" className="navbar-cta">
            <MessageSquareCode size={16} />
            <span>Open Chat</span>
          </Link>
        )}
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </nav>
  );
}