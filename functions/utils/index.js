// /functions/utils/index.js
import {
  COUNTRY_LABELS,
  MAJOR_CITY_BY_COUNTRY,
  COMPANY_COUNTRIES,
} from "./const.js";

// ——— helpers ———
const normalize = (s = "") =>
  s
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export function getCountryLabel(code) {
  const up = (code || "").toUpperCase();
  return COUNTRY_LABELS[up] || up || "";
}

// Accepter både ISO2 ("MX"/"CO") og labels ("México"/"Colombia")
export function getCountryCode(countryParam) {
  if (!countryParam) return undefined;
  const raw = String(countryParam).trim();
  const maybeCode = raw.toUpperCase();

  // Direkte ISO2?
  if (/^[A-Z]{2}$/.test(maybeCode) && COUNTRY_LABELS[maybeCode]) {
    return maybeCode;
  }
  // Ellers label (accent-insensitivt)
  const n = normalize(raw);
  for (const [code, label] of Object.entries(COUNTRY_LABELS)) {
    if (normalize(label) === n) return code;
  }
  return undefined;
}

/**
 * Prioritet (ingen host/path hints overhovedet):
 * 1) ?country (ISO2 eller label)
 * 2) Geo (hvis cf.country ∈ COMPANY_COUNTRIES)
 * 3) Fallback = MX  (så DK-brugere ser México / Ciudad de México)
 */
export function getLocationDetails(request) {
  const url = new URL(request.url);

  const { cf } = request;
  const geoCountry = (cf?.country || "").toUpperCase();
  const geoCity = cf?.city || "";

  const paramCode = url.searchParams.has("country")
    ? getCountryCode(url.searchParams.get("country"))
    : undefined;

  // Vælg landekode (ingen hostHint!)
  const countryCode =
    paramCode ||
    (COMPANY_COUNTRIES.includes(geoCountry) ? geoCountry : "MX");

  const countryName = getCountryLabel(countryCode);

  // Vælg by:
  // - ved ?country: brug major city for landet
  // - ved geo: brug cf.city hvis muligt, ellers major city
  // - ved fallback: major city for MX
  let chosenCity = "";
  if (paramCode) {
    chosenCity = MAJOR_CITY_BY_COUNTRY[countryCode] || "";
  } else if (COMPANY_COUNTRIES.includes(geoCountry)) {
    chosenCity = geoCity || MAJOR_CITY_BY_COUNTRY[countryCode] || "";
  } else {
    chosenCity = MAJOR_CITY_BY_COUNTRY[countryCode] || "Ciudad de México";
  }

  const locationText = `${chosenCity || ""}${chosenCity ? ", " : ""}${countryName}`;

  // Brug disse til [[GEO_LABEL]] / [[GEO_COUNTRY]]
  return { chosenCity, countryName, countryCode, locationText };
}

// ——— genskabt named export (brugt andre steder) ———
export function getInitials(name) {
  if (!name) return "??";
  return String(name)
    .trim()
    .split(/\s+/)
    .map((w) => (w[0] ? w[0].toUpperCase() : ""))
    .join("")
    .slice(0, 2) || "??";
}
