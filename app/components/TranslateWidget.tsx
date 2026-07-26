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
    <div className="mt-1.5 mb-2">
      <p className="text-base font-medium text-charcoal mb-2">{text}</p>
      
      <div className="flex items-center gap-2">
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          disabled={loading}
          className="!w-auto text-xs !py-1.5 !px-2"
        >
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="kn">Kannada</option>
          <option value="ta">Tamil</option>
          <option value="te">Telugu</option>
        </select>
        <button
          onClick={handleTranslate}
          disabled={loading}
          className="bg-accent/15 text-accent text-xs font-medium px-3 py-1.5 rounded-md hover:bg-accent/25 transition-colors"
        >
          {loading ? "Translating..." : "Translate"}
        </button>
      </div>

      {error && <p className="text-xs text-error mt-1.5">{error}</p>}
      {translated && (
        <p className="text-sm text-primary mt-2 bg-primary/5 rounded-md px-3 py-2 border border-primary/10">
          {translated}
        </p>
      )}
    </div>
  );
}
