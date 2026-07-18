import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Landing from "./pages/Landing.jsx";
import Chat from "./pages/Chat.jsx";
import Practice from "./pages/Practice.jsx";
import { ChatHistoryProvider } from "./context/ChatHistoryContext.jsx";
import "./App.css";

export default function App() {
  return (
    <div className="app-root">
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/chat"
          element={
            <ChatHistoryProvider>
              <Chat />
            </ChatHistoryProvider>
          }
        />
        <Route path="/practice" element={<Practice />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </div>
  );
}