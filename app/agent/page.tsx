"use client";

import React, { useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function AgentChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<{sender: string, text: string}[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user) {
    return (
      <div style={{ padding: "2rem" }}>
        <h2>Access Denied</h2>
        <p>Please log in to chat with the agent.</p>
        <Link href="/">Back to Home</Link>
      </div>
    );
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { sender: "You", text: userMessage }]);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const data = await apiFetch("/api/agent/chat", {
        method: "POST",
        body: JSON.stringify({ message: userMessage })
      });
      setMessages(prev => [...prev, { sender: "Agent", text: data.reply }]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Sahayak AI Agent</h2>
      <Link href="/">Back to Home</Link>
      <hr />
      
      <div style={{ height: "400px", overflowY: "scroll", border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}>
        {messages.length === 0 && <p>Start a conversation with the AI agent!</p>}
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: "1rem" }}>
            <strong>{m.sender}:</strong>
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{m.text}</p>
          </div>
        ))}
        {loading && <p><em>Agent is typing...</em></p>}
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <form onSubmit={handleSend} style={{ display: "flex", gap: "0.5rem" }}>
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          style={{ flex: 1 }} 
          placeholder="Ask a question..." 
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>Send</button>
      </form>
    </div>
  );
}
