// src/components/empleos/JobCard.js
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { GeoText } from "../GeoText";

/* ---------- Location formatting helpers (ES) ---------- */

const SMALL_WORDS_ES = new Set(["de", "del", "la", "las", "los", "y", "en", "el"]);
const WORD_FIX = {
  mexico: "México",
  bogota: "Bogotá",
  medellin: "Medellín",
  monteria: "Montería",
  leon: "León",
  merida: "Mérida",
  queretaro: "Querétaro",
};
const PHRASE_FIX = {
  "ciudad de mexico": "Ciudad de México",
  "santiago de queretaro": "Santiago de Querétaro",
  "heroica puebla de zaragoza": "Heroica Puebla de Zaragoza",
};

// Landenavne (uden accenter -> med accenter)
const COUNTRY_LABEL = {
  mexico: "México",
  peru: "Perú",
  espana: "España",
  chile: "Chile",
  colombia: "Colombia",
  "republica dominicana": "República Dominicana",
  panama: "Panamá",
  estados: "Estados Unidos", // fallback hvis kun første ord skulle slippe igennem
  "estados unidos": "Estados Unidos",
  "united states": "Estados Unidos",
};

const strip = (s = "") =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function titleCaseEs(raw = "") {
  if (!raw) return "";
  const base = String(raw).replace(/[-_]+/g, " ").trim().toLowerCase();
  const key = strip(base);
  if (PHRASE_FIX[key]) return PHRASE_FIX[key];
  const words = base.split(/\s+/).map((w, i) => {
    if (i > 0 && SMALL_WORDS_ES.has(w)) return w;
    const t = w.charAt(0).toUpperCase() + w.slice(1);
    return WORD_FIX[strip(t)] || t;
  });
  return words.join(" ");
}

function prettyCountry(raw = "") {
  const k = strip(raw);
  return COUNTRY_LABEL[k] || COUNTRY_LABEL[k.trim()] || titleCaseEs(raw);
}

function formatLocation(loc) {
  if (!loc) return "—";
  // Forventede former: "Bogotá, Colombia" eller "Ciudad de Mexico, Mexico" etc.
  const parts = String(loc).split(",").map((p) => p.trim());
  if (parts.length === 1) {
    // Kun by eller kun land
    const maybeCity = titleCaseEs(parts[0]);
    // hvis det ligner et landenavn, fix det:
    const fixedCountry = prettyCountry(parts[0]);
    // heuristik: hvis fixedCountry != titleCase(maybeCity) og matcher et kendt land -> brug landet
    if (strip(fixedCountry) !== strip(maybeCity) && COUNTRY_LABEL[strip(parts[0])]) {
      return fixedCountry;
    }
    return maybeCity;
  }
  const city = titleCaseEs(parts[0]);
  const country = prettyCountry(parts[1]);
  return `${city}, ${country}`;
}

/**
 * GEO-aware renderer:
 * - Hvis location er [[GEO_LABEL]] → brug GeoText (læser brugerens geoData)
 * - Ellers: brug eksisterende formatLocation-heuristik + fallback fra job.city/job.country
 */
function renderLocationNode(job, overrideLocation) {
  const raw = (overrideLocation || "").trim();
  const hasPlaceholder =
    typeof raw === "string" &&
    (raw.includes("[[GEO_LABEL]]") || raw.includes("[[GEO_"));

  // Byg fallback fra job-data hvis vi har noget
  const jobCityCountryRaw =
    job?.city && job?.country ? `${job.city}, ${job.country}` : "";

  const jobCityCountryPretty = jobCityCountryRaw
    ? formatLocation(jobCityCountryRaw)
    : "Ubicación no disponible";

  // 1) Hvis vi har [[GEO_LABEL]] fra serveren → lad GeoText lave magien
  if (hasPlaceholder) {
    return (
      <GeoText
        type="label"
        fallback={jobCityCountryPretty}
      />
    );
  }

  // 2) Hvis vi har en almindelig location-string → formatér den
  if (raw) {
    return formatLocation(raw);
  }

  // 3) Ellers: brug job.city/job.country som fallback
  if (jobCityCountryRaw) {
    return jobCityCountryPretty;
  }

  // 4) Sidste fallback
  return "—";
}

/* --------------------- Component ---------------------- */

const JobCard = ({ job, location, clickable = false }) => {
  const router = useRouter();

  const company = job?.company || {};
  const bg = company.color || "#e7e7e7";
  const logo = company.logo_url || "/company-logo.png";
  const companyName = company.name || "";

  const locNode = renderLocationNode(job, location);

  return (
    <div
      className={`flex gap-2 items-center p-2 border-1 border-[#0001] shadow-lg rounded-lg ${
        clickable
          ? "cursor-pointer hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          : ""
      }`}
      onClick={() => clickable && router.push(`/empleos/${job.id}`)}
    >
      <div
        className="bg-white rounded-lg shadow-md border-1 border-[#e7e7e7] shadow-[0_8px_24px_rgba(0,0,0,.06)]"
        style={{ backgroundColor: bg }}
      >
        <img
          src={logo}
          alt="Company logo"
          className="h-20 w-20 min-w-20 min-h-20 object-contain rounded-lg"
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="flex flex-col justify-between gap-2 w-full">
        <div>
          <Link
            href={`/empleos/${job.id}`}
            className="text-gray-800 text-xl font-semibold hover:underline"
          >
            {job.title}
          </Link>
        </div>

        <div className="text-xs text-gray-600">{companyName}</div>

        <div className="flex items-center gap-1 mb-2 text-xs text-gray-600">
          <svg
            className="w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span>{locNode}</span>
        </div>
      </div>

      {clickable && (
        <div aria-hidden="true">
          <svg
            className="w-6 h-6 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default JobCard;
