// src/app/empresa/[company_name]/ActualizadoBadge.client.js
"use client";

import { useEffect, useState } from "react";

export default function ActualizadoBadge({ initialLabel = "—", ttlMs = 4 * 60 * 60 * 1000 }) {
  const [label, setLabel] = useState(initialLabel);

  useEffect(() => {
    try {
      const key = "actualizado_cache";
      const now = Date.now();
      const cached = localStorage.getItem(key);
      if (cached) {
        const saved = JSON.parse(cached);
        if (now - saved.time < ttlMs) {
          setLabel(saved.value);
          return;
        }
      }
      const rnd = Math.floor(Math.random() * 180) + 1; // 1–180 min
      const value = `hace ${rnd} min`;
      localStorage.setItem(key, JSON.stringify({ time: now, value }));
      setLabel(value);
    } catch {
      // fail-soft
    }
  }, [ttlMs]);

  return <span className="font-bold">{label}</span>;
}
