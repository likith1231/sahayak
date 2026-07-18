"use client";

import React, { useState } from "react";
import { apiFetch } from "../lib/api";

export default function TranslateWidget({ text }: { text: string }) {
  const [lang, setLang] = useState("hi");
  const [translated, setTranslated] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTranslate = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/api/translate", {
        method: "POST",
        body: JSON.stringify({ text, targetLang: lang })
      });
      if (data.translatedText) {
        setTranslated(data.translatedText);
      } else {
        throw new Error("Translation failed");
      }
    } catch (err: any) {
      if (err.message && (err.message.includes("503") || err.message.toLowerCase().includes("unavailable"))) {
        setError("Translation temporarily unavailable, please try again");
      } else {
        setError("Translation temporarily unavailable, please try again");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ margin: "0.5rem 0", padding: "0.5rem", border: "1px dashed #ccc", display: "inline-block" }}>
      <p style={{ margin: "0 0 0.5rem 0" }}>{text}</p>
      
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <select value={lang} onChange={(e) => setLang(e.target.value)} disabled={loading}>
          <option value="hi">Hindi</option>
          <option value="kn">Kannada</option>
          <option value="ta">Tamil</option>
          <option value="te">Telugu</option>
        </select>
        <button onClick={handleTranslate} disabled={loading}>
          {loading ? "Translating..." : "Translate"}
        </button>
      </div>

      {error && <p style={{ color: "red", margin: "0.5rem 0 0 0", fontSize: "0.9em" }}>{error}</p>}
      {translated && <p style={{ color: "green", margin: "0.5rem 0 0 0" }}>{translated}</p>}
    </div>
  );
}
