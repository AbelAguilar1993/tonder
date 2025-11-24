// src/app/empresa/[company_name]/ContactsTotalBadge.client.jsx
"use client";

export default function ContactsTotalBadge({ companyId, initial = 0 }) {
  // no fetching, just render the server-provided total
  return <span className="font-bold">{initial} verificados</span>;
}
