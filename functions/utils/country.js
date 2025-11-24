export const COUNTRY_LABELS = {
  AR: "Argentina",
  CL: "Chile",
  CO: "Colombia",
  EC: "Ecuador",
  MX: "México",
  PE: "Peru",
  UY: "Uruguay",
};

export function normalizeCountryInput(raw) {
  // Accept ISO-2, country name (any case), or arrays.
  if (!raw) return "";
  if (Array.isArray(raw)) raw = raw[0] || "";
  if (typeof raw !== "string") raw = String(raw);
  const val = raw.trim();
  if (!val) return "";

  const iso = val.toUpperCase();
  if (COUNTRY_LABELS[iso]) return COUNTRY_LABELS[iso];

  const lower = val.toLowerCase();
  for (const name of Object.values(COUNTRY_LABELS)) {
    if (name.toLowerCase() === lower) return name;
  }
  return val;
}

/**
 * Extract a canonical country from URL.
 * @returns { country: string, source: "query" | "filters.country" | "filters.city" | "none" }
 */
export function extractCountryFromUrl(url) {
  const sp = url.searchParams;

  // 1) ?country=...
  const qp = sp.get("country");
  if (qp && qp.trim()) {
    return { country: normalizeCountryInput(qp), source: "query" };
  }

  // 2) ?filters=... (accept both filters.country and legacy filters.city)
  const filters = sp.get("filters");
  if (filters) {
    try {
      const obj = JSON.parse(filters);
      let v = obj?.country ?? obj?.city;
      if (Array.isArray(v)) v = v[0];
      if (typeof v === "string" && v.trim()) {
        return {
          country: normalizeCountryInput(v),
          source: obj?.country ? "filters.country" : "filters.city",
        };
      }
    } catch {
      /* ignore bad JSON */
    }
  }

  return { country: "", source: "none" };
}
