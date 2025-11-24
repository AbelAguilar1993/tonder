"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import ApplyNowModal from "../../../components/ApplyNowModal";
import { useStickyFooter } from "../../../components/StickyFooterContext";
import { getInitials } from "../../../utils";
import { trackGoal } from "../../../utils/clicky";
// 👇 VIGTIGT: Importer GeoText komponenten
import { GeoText } from "../../../components/GeoText";

const { createElement: h } = React;

/* =====================================================================
   HOISTEDE HELPERS (må bruges overalt uden ReferenceError ved build)
   ===================================================================== */

// Luminans → tekstfarve
function getTextColorForBackground(hexColor) {
  if (!hexColor) return "#1f2937";
  const c = hexColor.replace("#", "");
  if (c.length !== 6) return "#1f2937";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1f2937" : "#fff";
}

// Badge-styles for friskhed (bruges i LiveListingsSection)
function getFreshnessClass(hours = 0) {
  if (hours <= 1) {
    return "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm";
  } else if (hours <= 6) {
    return "bg-green-50 border-green-200 text-green-700";
  } else if (hours <= 24) {
    return "bg-blue-50 border-blue-200 text-blue-700";
  } else if (hours <= 48) {
    return "bg-yellow-50 border-yellow-200 text-yellow-700";
  }
  return "bg-gray-50 border-gray-200 text-gray-600";
}

/* =====================================================================
   GEO + NORMALISERING (MX + clusters)
   ===================================================================== */

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

const strip = (s = "") =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

function titleCaseEs(raw = "") {
  if (!raw) return "";
  const base = String(raw).replace(/[-_]+/g, " ").trim().toLowerCase();
  const key = strip(base);
  if (PHRASE_FIX[key]) return PHRASE_FIX[key];

  const words = base.split(/\s+/).map((w, i) => {
    if (i > 0 && SMALL_WORDS_ES.has(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  });

  return words
    .map((w) => WORD_FIX[strip(w)] || w)
    .join(" ");
}

const readCookie = (name) => {
  try {
    if (typeof document === "undefined") return "";
    const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : "";
  } catch {
    return "";
  }
};

// 🔑 Skal matche GeoText's localStorage key
const LOCAL_GEO_STORAGE_KEY = "geoData";

/**
 * ✅ GEO-boot: city normaliseres altid til kun byen (før komma)
 * Nu læser vi OGSÅ fra localStorage("geoData") som GeoText skriver til.
 * Det betyder, at vi stadig har by + land, selv efter GeoText har slettet window.__GEO__.
 */
const getBootGeo = () => {
  if (typeof window === "undefined") return { label: "", cc: "", city: "" };

  let label = "";
  let cc = "";
  let city = "";

  // 0) PRIMÆR KILDE: localStorage("geoData") – delt med GeoText
  try {
    const stored = window.localStorage?.getItem(LOCAL_GEO_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.label) {
        label = String(parsed.label).trim();
      }
      if (parsed?.iso) {
        cc = String(parsed.iso).trim();
      }
    }
  } catch {
    // ignore
  }

  // 1) window.__GEO__ (fra middleware) – bruger den som “fresh override” hvis den findes
  if (window.__GEO__) {
    const g = window.__GEO__;
    if (g.label && !label) label = String(g.label).trim();
    if (g.country && !cc) cc = String(g.country).trim();
    if (g.city) city = String(g.city).trim();
  }

  // 2) Fald tilbage til globale vars / cookies for felter, der stadig er tomme
  if (!label) {
    label =
      (window.__GEO_LABEL__ ||
        readCookie("__geo_label") ||
        "").trim();
  }

  if (!cc) {
    cc =
      (window.__GEO_COUNTRY_CODE__ ||
        readCookie("__geo_cc") ||
        "").trim();
  }

  if (!city) {
    city =
      (window.__GEO_CITY__ ||
        readCookie("__geo_city") ||
        "").trim();
  }

  // Hvis city er "Copenhagen,Denmark" eller "Santiago de Querétaro,México" → behold kun by-delen
  if (city && city.includes(",")) {
    city = city.split(",")[0].trim();
  }

  // Fallback: hvis ingen city, men label findes → brug første del af label
  if (!city && label) {
    city = label.split(",")[0].trim();
  }

  // Ekstra fallback via meta-tags
  if (typeof document !== "undefined") {
    try {
      if (!label) {
        const metaLabel = document.querySelector('meta[name="x-geo-label"]');
        if (metaLabel?.content) {
          label = metaLabel.content.trim();
        }
      }
      if (!city) {
        const metaCity = document.querySelector('meta[name="x-geo-city"]');
        if (metaCity?.content) {
          const raw = metaCity.content.trim();
          city = raw.includes(",") ? raw.split(",")[0].trim() : raw;
        }
      }
      if (!cc) {
        const metaCc = document.querySelector('meta[name="x-geo-cc"]');
        if (metaCc?.content) {
          cc = metaCc.content.trim();
        }
      }
    } catch {
      // ignore
    }
  }

  return { label, cc, city };
};

// ✅ Label til UI: vis kun by (ikke land)
const prettyLabel = (s = "") => {
  if (!s) return s;
  const [cityPartRaw] = s.split(",");
  const cityPart = cityPartRaw ? cityPartRaw.trim() : s.trim();
  return titleCaseEs(cityPart);
};

/* ✅ Hook til geo-label:
   - Starter med server/edge-label (initialLocationText)
   - Forsøger derefter at bruge window.__GEO__/localStorage/cookies/meta
   - Falder tilbage til initialLocationText hvis bootGeo er tom
*/
function useGeoLabel(initialLocationText = "") {
  // Første render bruger en “pæn” label (kun by)
  const [label, setLabel] = useState(() => prettyLabel(initialLocationText));

  useEffect(() => {
    try {
      const { label: bootLabel } = getBootGeo();
      const raw = bootLabel || initialLocationText;
      const pretty = prettyLabel(raw);
      if (!pretty) return;

      setLabel((current) => (current === pretty ? current : pretty));
    } catch {
      // Ignorér fejl – så bliver eksisterende label stående
    }
  }, [initialLocationText]);

  return label;
}

/* =====================================================================
   STRING-REPAIR + BY-NORMALISERING (cacher)
   ===================================================================== */

const mojibakeCache = new Map();
const normalizeCityCache = new Map();
const CACHE_LIMIT = 200;

function limitCacheSize(cache) {
  if (cache.size > CACHE_LIMIT) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}

const looksMojibake = (s = "") => /Ã.|Â.|â€|â€"|â€™|â€œ|â€�/.test(s);

const repairMojibake = (s = "") => {
  if (!s || typeof s !== "string") return s;
  if (mojibakeCache.has(s)) return mojibakeCache.get(s);

  let result = s;
  try {
    if (!looksMojibake(s)) {
      result = s;
    } else if (typeof TextDecoder !== "undefined") {
      const bytes = Uint8Array.from(
        s.split("").map((ch) => ch.charCodeAt(0) & 0xff)
      );
      result = new TextDecoder("utf-8").decode(bytes);
    } else {
      // legacy fallback
      // eslint-disable-next-line no-undef
      result = decodeURIComponent(escape(s));
    }
  } catch {
    result = s;
  }

  mojibakeCache.set(s, result);
  limitCacheSize(mojibakeCache);
  return result;
};

const normalizeCityLoose = (s = "") => {
  if (!s || typeof s !== "string") return "";
  if (normalizeCityCache.has(s)) return normalizeCityCache.get(s);

  const fixed = repairMojibake(String(s));
  const result = fixed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[,.;]/g, " ")
    .replace(/\b(d\.?c\.?)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .toLowerCase();

  normalizeCityCache.set(s, result);
  limitCacheSize(normalizeCityCache);
  return result;
};

/**
 * Canonical city keys + alias’er
 * - CO er der stadig til senere
 * - fokus nu = MX med brede clusters (80–90 % af by-befolkning)
 */
const CITY_ALIASES = {
  // ===== CO =====
  bogota: [
    "Bogotá",
    "Bogota",
    "Bogotá D.C.",
    "Bogota D.C.",
    "Bogota DC",
    "Bogotá DC",
    "Santa Fe de Bogotá",
    "Santafé de Bogotá",
    "Bogota, D.C.",
  ],
  medellin: ["Medellín", "Medellin"],
  cali: ["Cali", "Santiago de Cali"],

  // ===== MX – CDMX + EDOMEX corona =====
  ciudad_de_mexico: [
    "Ciudad de México",
    "Ciudad de Mexico",
    "CDMX",
    "Mexico City",
    "México DF",
    "Mexico DF",
    "D.F.",
    "DF",
    "Benito Juarez, Ciudad de Mexico",
    "Iztapalapa, Ciudad de Mexico",
    "Tlalpan, Ciudad de Mexico",
  ],
  ecatepec: ["Ecatepec", "Ecatepec de Morelos"],
  nezahualcoyotl: [
    "Ciudad Nezahualcóyotl",
    "Ciudad Nezahualcoyotl",
    "Nezahualcóyotl",
    "Nezahualcoyotl",
    "Neza",
  ],
  naucalpan: ["Naucalpan", "Naucalpan de Juárez", "Naucalpan de Juarez"],
  tlalnepantla: ["Tlalnepantla", "Tlalnepantla de Baz"],
  coacalco: ["Coacalco", "Coacalco de Berriozábal", "Coacalco de Berriozabal"],
  cuautitlan_izcalli: ["Cuautitlán Izcalli", "Cuautitlan Izcalli"],
  tultitlan: ["Tultitlán", "Tultitlan"],
  chimalhuacan: ["Chimalhuacán", "Chimalhuacan"],
  tecamac: ["Tecámac", "Tecamac"],

  // CDMX – ekstra alcaldías
  benito_juarez_cdmx: [
    "Benito Juarez",
    "Benito Juárez",
    "Benito Juarez, Mexico",
    "Benito Juarez, Ciudad de Mexico",
  ],
  gustavo_madero: [
    "Gustavo A. Madero",
    "Gustavo Adolfo Madero",
    "Gustavo A Madero",
    "Gustavo A. Madero, Mexico",
    "Gustavo Adolfo Madero, Mexico",
  ],
  azcapotzalco: [
    "Azcapotzalco",
    "Azcapotzalco, Mexico",
    "Azcapotzalco, Ciudad de Mexico",
  ],
  iztapalapa: [
    "Iztapalapa",
    "Iztapalapa, Mexico",
    "Iztapalapa, Ciudad de Mexico",
  ],

  // Acapulco – canonical = "acapulco"
  acapulco: [
    "Acapulco",
    "Acapulco de Juárez",
    "Acapulco de Juarez",
    "Acapulco de Juárez, Mexico",
    "Acapulco de Juarez, Mexico",
  ],

  // ===== MX – Guadalajara metro =====
  guadalajara: ["Guadalajara", "GDL"],
  zapopan: ["Zapopan"],
  tlaquepaque: ["Tlaquepaque", "San Pedro Tlaquepaque"],
  tonala: ["Tonalá", "Tonala"],
  tlajomulco: [
    "Tlajomulco",
    "Tlajomulco de Zúñiga",
    "Tlajomulco de Zuñiga",
  ],
  el_salto: ["El Salto"],

  // ===== MX – Monterrey metro =====
  monterrey: ["Monterrey", "MTY"],
  guadalupe_nl: [
    "Guadalupe, Nuevo León",
    "Guadalupe, Nuevo Leon",
    "Guadalupe N.L.",
    "Guadalupe NL",
  ],
  san_nicolas: [
    "San Nicolás de los Garza",
    "San Nicolas de los Garza",
    "San Nicolás",
    "San Nicolas",
  ],
  apodaca: ["Apodaca"],
  san_pedro: [
    "San Pedro Garza García",
    "San Pedro Garza Garcia",
    "San Pedro",
  ],
  santa_catarina: ["Santa Catarina"],
  escobedo_nl: ["General Escobedo", "Escobedo"],
  garcia_nl: ["García, Nuevo León", "Garcia, Nuevo Leon"],

  // ===== MX – Puebla + Cholula =====
  puebla: ["Puebla", "Heroica Puebla de Zaragoza"],
  san_andres_cholula: ["San Andrés Cholula", "San Andres Cholula"],
  san_pedro_cholula: ["San Pedro Cholula"],

  // ===== MX – Querétaro =====
  queretaro: [
    "Querétaro",
    "Queretaro",
    "Santiago de Querétaro",
    "Santiago de Queretaro",
  ],
  corregidora: ["Corregidora"],
  el_marques: ["El Marqués", "El Marques"],

  // ===== MX – León + Silao =====
  leon: ["León", "Leon"],
  silao: ["Silao"],

  // ===== MX – Tijuana + Rosarito =====
  tijuana: ["Tijuana"],
  rosarito: ["Playas de Rosarito", "Rosarito"],

  // ===== MX – Toluca metro =====
  toluca: [
    "Toluca",
    "Toluca de Lerdo",
    "Toluca, Estado de México",
    "Toluca, Edo. Mex.",
    "Toluca, Méx.",
  ],
  metepec: [
    "Metepec",
    "Metepec, Estado de México",
    "Metepec, Edo. Mex.",
  ],
  zinacantepec: ["Zinacantepec"],
  lerma: ["Lerma", "Lerma de Villada", "Lerma, Estado de México"],
  san_mateo_atenco: ["San Mateo Atenco"],

  // ===== MX – Mérida metro =====
  merida: ["Mérida", "Merida", "Mérida, Yucatán", "Merida, Yucatan"],
  kanasin: ["Kanasín", "Kanasin"],
  uman: ["Umán", "Uman"],

  // ===== MX – Cancún / Riviera =====
  cancun: [
    "Cancún",
    "Cancun",
    "Cancún, Q. Roo",
    "Cancún, Quintana Roo",
    "Cancun, Quintana Roo",
  ],
  playa_del_carmen: [
    "Playa del Carmen",
    "Playa Del Carmen",
    "Playa del Carmen, Q. Roo",
    "Playa del Carmen, Quintana Roo",
  ],
  puerto_morelos: ["Puerto Morelos"],

  // ===== MX – Veracruz metro =====
  veracruz: ["Veracruz", "Heroica Veracruz", "Veracruz, Veracruz"],
  boca_del_rio: ["Boca del Río", "Boca del Rio"],

  // ===== MX – Ciudad Juárez & Chihuahua =====
  ciudad_juarez: [
    "Ciudad Juárez",
    "Ciudad Juarez",
    "Cd. Juárez",
    "Cd Juárez",
    "Cd. Juarez",
    "Cd Juarez",
  ],
  chihuahua: ["Chihuahua", "Chihuahua, Chih.", "Chihuahua, Chihuahua"],

  // ===== MX – Mexicali =====
  mexicali: ["Mexicali"],

  // ===== MX – Aguascalientes metro =====
  aguascalientes: ["Aguascalientes", "Aguascalientes, Ags."],
  jesus_maria_ags: [
    "Jesús María, Aguascalientes",
    "Jesus Maria, Aguascalientes",
    "Jesús María",
    "Jesus Maria",
  ],

  // ===== MX – San Luis Potosí metro =====
  san_luis_potosi: [
    "San Luis Potosí",
    "San Luis Potosi",
    "San Luis Potosí, SLP",
    "San Luis Potosi, SLP",
  ],
  soledad_de_graciano_sanchez: [
    "Soledad de Graciano Sánchez",
    "Soledad de Graciano Sanchez",
    "Soledad, SLP",
  ],

  // ===== MX – La Laguna =====
  torreon: ["Torreón", "Torreon"],
  gomez_palacio: ["Gómez Palacio", "Gomez Palacio"],
  lerdo_dgo: ["Lerdo", "Ciudad Lerdo"],

  // ===== MX – Morelia =====
  morelia: ["Morelia"],

  // ===== MX – Saltillo =====
  saltillo: ["Saltillo"],

  // ===== MX – Hermosillo =====
  hermosillo: ["Hermosillo"],

  // ===== MX – Culiacán =====
  culiacan: ["Culiacán", "Culiacan"],

  // ===== MX – Villahermosa =====
  villahermosa: ["Villahermosa"],

  // ===== MX – Reynosa =====
  reynosa: ["Reynosa"],

  // ===== MX – Tampico / Madero / Altamira =====
  tampico: ["Tampico"],
  ciudad_madero: ["Ciudad Madero", "Cd. Madero", "Cd Madero"],
  altamira_tamps: ["Altamira, Tamaulipas", "Altamira Tamps", "Altamira"],

  // ===== MX – Xalapa =====
  xalapa: ["Xalapa", "Jalapa"],

  // ===== MX – Cuernavaca metro =====
  cuernavaca: ["Cuernavaca"],
  jiutepec: ["Jiutepec"],
  temixco: ["Temixco"],

  // ===== MX – Tuxtla Gutiérrez =====
  tuxtla_gutierrez: ["Tuxtla Gutiérrez", "Tuxtla Gutierrez"],

  // ===== MX – Durango =====
  durango: ["Durango", "Victoria de Durango", "Durango, Dgo."],
};

/**
 * Clusters: grupper af byer vi behandler som “samme område”
 * – direkte match vinder ALTID (Zapopan/Tlalnepantla-reglen)
 */
const CITY_CLUSTER_GROUPS = [
  // CDMX + corona
  [
    "ciudad_de_mexico",
    "ecatepec",
    "nezahualcoyotl",
    "naucalpan",
    "tlalnepantla",
    "coacalco",
    "cuautitlan_izcalli",
    "tultitlan",
    "chimalhuacan",
    "tecamac",
    "benito_juarez_cdmx",
    "gustavo_madero",
    "azcapotzalco",
    "iztapalapa",
  ],
  // Guadalajara-metro
  ["guadalajara", "zapopan", "tlaquepaque", "tonala", "tlajomulco", "el_salto"],
  // Monterrey-metro
  [
    "monterrey",
    "guadalupe_nl",
    "san_nicolas",
    "apodaca",
    "san_pedro",
    "santa_catarina",
    "escobedo_nl",
    "garcia_nl",
  ],
  // Puebla + Cholula
  ["puebla", "san_andres_cholula", "san_pedro_cholula"],
  // Querétaro + omkring
  ["queretaro", "corregidora", "el_marques"],
  // León + Silao
  ["leon", "silao"],
  // Tijuana + Rosarito
  ["tijuana", "rosarito"],

  // Toluca-metro
  ["toluca", "metepec", "zinacantepec", "lerma", "san_mateo_atenco"],

  // Mérida-metro
  ["merida", "kanasin", "uman"],

  // Cancún / Riviera
  ["cancun", "playa_del_carmen", "puerto_morelos"],

  // Veracruz-metro
  ["veracruz", "boca_del_rio"],

  // Ciudad Juárez
  ["ciudad_juarez"],

  // Chihuahua
  ["chihuahua"],

  // Mexicali
  ["mexicali"],

  // Aguascalientes-metro
  ["aguascalientes", "jesus_maria_ags"],

  // San Luis Potosí-metro
  ["san_luis_potosi", "soledad_de_graciano_sanchez"],

  // La Laguna
  ["torreon", "gomez_palacio", "lerdo_dgo"],

  // Morelia
  ["morelia"],

  // Saltillo
  ["saltillo"],

  // Hermosillo
  ["hermosillo"],

  // Culiacán
  ["culiacan"],

  // Villahermosa
  ["villahermosa"],

  // Reynosa
  ["reynosa"],

  // Tampico-metro
  ["tampico", "ciudad_madero", "altamira_tamps"],

  // Xalapa
  ["xalapa"],

  // Cuernavaca-metro
  ["cuernavaca", "jiutepec", "temixco"],

  // Tuxtla Gutiérrez
  ["tuxtla_gutierrez"],

  // Durango
  ["durango"],
];

// National MX-fallback når vi slet ikke kender byen
const MX_NATIONAL_FALLBACK = [
  "ciudad_de_mexico",
  "guadalajara",
  "monterrey",
  "puebla",
  "queretaro",
  "tijuana",
  "leon",
  "merida",
  "toluca",
  "cancun",
  "veracruz",
  "ciudad_juarez",
  "chihuahua",
  "aguascalientes",
  "san_luis_potosi",
  "torreon",
  "morelia",
  "saltillo",
  "hermosillo",
  "culiacan",
  "villahermosa",
  "reynosa",
  "tampico",
  "xalapa",
  "cuernavaca",
  "tuxtla_gutierrez",
  "durango",
];

function findClusterForCanon(canon) {
  if (!canon) return null;
  for (const group of CITY_CLUSTER_GROUPS) {
    if (group.includes(canon)) return group;
  }
  return null;
}

// Canonical city-key til resten af systemet
const canonicalCity = (s = "") => {
  const n = normalizeCityLoose(s);
  if (!n) return "";

  // 1) Slå op i alias-tabel
  for (const [canon, list] of Object.entries(CITY_ALIASES)) {
    for (const item of list) {
      const m = normalizeCityLoose(item);
      if (n === m || n.includes(m) || m.includes(n)) {
        return canon;
      }
    }
  }

  // 2) Generiske heuristikker (MX)
  if (n.includes("queretaro")) return "queretaro";
  if (
    n.includes("ciudad de mexico") ||
    n.includes("mexico city") ||
    n.includes("cdmx") ||
    (n.includes("d f") && n.includes("mexico"))
  ) {
    return "ciudad_de_mexico";
  }

  return n;
};

/**
 * Direkte by-match (accent-fri, tolerant includes)
 */
function findDirectCityMatches(contacts = [], normCandidate = "") {
  if (!normCandidate) return [];
  return contacts.filter((c) => {
    const normC = normalizeCityLoose(c.city || "");
    if (!normC) return false;
    return (
      normC === normCandidate ||
      normC.includes(normCandidate) ||
      normCandidate.includes(normC)
    );
  });
}

/**
 * Cluster-match for MX:
 * - hvis vi ikke har direkte match, men canonical by ligger i en cluster,
 *   vælger vi kontakter i samme cluster (storby-område).
 */
function findClusterMatchesForMX(contacts = [], candidateCanon = "") {
  if (!candidateCanon) return [];
  const group = findClusterForCanon(candidateCanon);
  if (!group || !group.length) return [];

  const inCluster = [];
  for (const c of contacts) {
    const cCanon = canonicalCity(c.city || "");
    if (!cCanon) continue;
    if (group.includes(cCanon)) inCluster.push(c);
  }

  return inCluster;
}

const randInt = (max) => {
  if (!max || max <= 0) return 0;
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % max;
  }
  return Math.floor(Math.random() * max);
};

const pickRandomFrom = (arr = []) =>
  arr.length ? arr[randInt(arr.length)] : undefined;

const shuffle = (arr = []) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/* =====================================================================
   STORAGE CACHE (sessionStorage + memory)
   ===================================================================== */

const storageCache = new Map();
const readFromStorage = (key, defaultValue = []) => {
  if (storageCache.has(key)) return storageCache.get(key);
  try {
    const raw = sessionStorage.getItem(key);
    const value = raw ? JSON.parse(raw) : defaultValue;
    storageCache.set(key, value);
    return value;
  } catch {
    return defaultValue;
  }
};
const writeToStorage = (key, value) => {
  storageCache.set(key, value);
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

/* =====================================================================
   UI-KOMPONENTER
   ===================================================================== */

function JobHeroSection({
  job,
  company,
  contactsLength,
  childJobsLength,
  locationText, // Vi bruger denne som fallback
  actualizado,
}) {
  const base = company.color || "#e7e7e7";
  const heroText = getTextColorForBackground(base);
  const onDark = heroText === "#fff";

  useEffect(() => {
    if (typeof window === "undefined" || !job?.id) return;
    try {
      window.fbq?.("track", "ViewContent", {
        content_name: "Acceso al reclutador",
        content_category: "Checkout",
      });
    } catch {}
  }, [job?.id]);

  useEffect(() => {
    try {
      trackGoal(794);
    } catch {}
  }, []);

  return h(
    "header",
    {
      className: "mb-4 min-h-32 border-b p-4",
      style: {
        borderBottomColor: base,
        background: `
          linear-gradient(180deg, ${base} 0 20%, transparent 20% 100%),
          radial-gradient(1000px 320px at 90% -80px, rgba(255,255,255,.14), rgba(255,255,255,0) 60%),
          linear-gradient(180deg, ${base} 0 20%, #fff 85%)
        `,
      },
    },
    h(
      "div",
      { className: "flex gap-4" },
      h(
        "div",
        {
          className:
            "rounded-lg shadow-md border w-20 h-20 flex-shrink-0 flex justify-center items-center",
          style: {
            backgroundColor: base,
            borderColor: heroText,
            boxShadow: "0 4px 12px rgba(0,0,0,.12), 0 0 4px rgba(0,0,0,.08)",
          },
        },
        h("img", {
          src: company.logo_url || "/company-logo.png",
          alt: `${company.name} logo`,
          className: "h-full w-full object-contain rounded-lg",
          loading: "lazy",
          decoding: "async",
        })
      ),
      h(
        "div",
        { className: "flex flex-col w-full gap-2 justify-between relative -top-[3px]" },
        h(
          "h1",
          {
            className: `text-xl font-bold drop-shadow-lg ${
              onDark ? "text-white" : "text-gray-800"
            }`,
          },
          job.title
        ),
        h(
          "div",
          {
            className: `${
              onDark ? "text-white" : "text-gray-800"
            } text-sm font-semibold drop-shadow relative`,
          },
          company.name
        ),
        h(
          "div",
          { className: "flex items-center gap-1 relative" },
          h(
            "svg",
            {
              className: `w-4 h-4 ${onDark ? "text-white/80" : "text-gray-800/80"}`,
              fill: "none",
              stroke: "currentColor",
              viewBox: "0 0 24 24",
              "aria-hidden": "true",
            },
            h("path", {
              strokeLinecap: "round",
              strokeLinejoin: "round",
              strokeWidth: 2,
              d: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z",
            }),
            h("path", {
              strokeLinecap: "round",
              strokeLinejoin: "round",
              strokeWidth: 2,
              d: "M15 11a3 3 0 11-6 0 3 3 0 016 0z",
            })
          ),
          // 👇 Brug GeoText til visning. fallback er “locationText” (pæn label fra useGeoLabel)
          h(GeoText, {
            type: "label",
            fallback:
              locationText && !String(locationText).includes("[[")
                ? String(locationText)
                : "Ubicación no disponible",
            className: `${onDark ? "text-white" : "text-gray-800"} text-sm drop-shadow`,
          })
        )
      )
    ),
    h(
      "div",
      { className: "flex gap-1 mt-4 justify-center" },
      h(
        "div",
        {
          className:
            "flex items-center p-2 rounded-lg bg-white border border-gray-300 w-[6.5rem] md:w-[7.5rem]",
        },
        h(
          "div",
          { className: "flex flex-col text-xs" },
          h("span", null, "Reclutadores"),
          h("span", { className: "font-bold" }, `${contactsLength || 0} verificados`)
        )
      ),
      h(
        "div",
        {
          className:
            "flex items-center p-2 rounded-lg bg-white border border-gray-300 w-[6.5rem] md:w-[7.5rem]",
        },
        h(
          "div",
          { className: "flex flex-col text-xs" },
          h("span", null, "Empleos"),
          h("span", { className: "font-bold" }, `${childJobsLength || 34} activas`)
        )
      ),
      h(
        "div",
        {
          className:
            "flex items-center p-2 rounded-lg bg-white border border-gray-300 w-[6.5rem] md:w-[7.5rem]",
        },
        h(
          "div",
          { className: "flex flex-col text-xs" },
          h("span", null, "Actualizado"),
          h("span", { className: "font-bold" }, actualizado)
        )
      )
    )
  );
}

function FeaturesAssistSection({
  company,
  stats = { delivered: true, read: true, replied: false },
}) {
  return h(
    "section",
    { className: "mb-4 mt-4" },
    h(
      "div",
      {
        className: "rounded-2xl border overflow-hidden",
        style: {
          borderColor: "rgba(94,63,166,0.22)",
          background: `
            linear-gradient(180deg,
              rgba(94,63,166,0.16) 0%,
              rgba(127,84,180,0.14) 35%,
              rgba(178,118,202,0.12) 55%,
              rgba(255,255,255,0.92) 85%,
              rgba(255,255,255,1) 100%
            )
          `,
        },
      },
      h(
        "div",
        { className: "p-3" },
        h(
          "div",
          { className: "flex items-start gap-2" },
          h("div", { className: "text-xl leading-none", "aria-hidden": "true" }, "✍️"),
          h(
            "div",
            { className: "flex-1" },
            h(
              "h2",
              { className: "text-base font-extrabold text-gray-900 leading-snug" },
              "Te ayudamos a escribir tu mensaje ",
              h("span", { className: "opacity-80", "aria-hidden": "true" }, "✨")
            ),
            h(
              "p",
              { className: "text-[13px] text-gray-700 mt-1" },
              "Elige tono, añade detalles con toques og envía directo al reclutador real."
            )
          )
        )
      ),
      h(
        "div",
        { className: "px-3 pb-3 grid grid-cols-1 gap-2" },
        h(
          "div",
          { className: "rounded-xl bg-white border border-gray-200 p-3 shadow-sm" },
          h(
            "div",
            { className: "flex items-center gap-2 mb-1" },
            h("span", { className: "text-lg", "aria-hidden": "true" }, "🧩"),
            h("h3", { className: "text-[15px] font-bold text-gray-900" }, "Elige tu estilo")
          ),
          h(
            "p",
            { className: "text-[13px] text-gray-700" },
            "Cambia entre ",
            h("strong", null, "cercano"),
            ", ",
            h("strong", null, "formal"),
            " o ",
            h("strong", null, "directo"),
            '. Añade chips como "Vivo cerca" o "Disponibilidad inmediata".'
          ),
          h(
            "div",
            { className: "mt-2 flex flex-wrap gap-1.5" },
            h(
              "span",
              {
                className:
                  "px-2 py-1 rounded-full bg-purple-50/90 text-purple-700 border border-purple-200 text-[11px]",
              },
              "🧑‍💼 Tono formal"
            ),
            h(
              "span",
              {
                className:
                  "px-2 py-1 rounded-full bg-purple-50/90 text-purple-700 border border-purple-200 text-[11px]",
              },
              "⚡ Disponibilidad inmediata"
            ),
            h(
              "span",
              {
                className:
                  "px-2 py-1 rounded-full bg-purple-50/90 text-purple-700 border border-purple-200 text-[11px]",
              },
              "📍 Vivo cerca"
            )
          )
        ),
        h(
          "div",
          { className: "rounded-xl bg-white border border-gray-200 p-3 shadow-sm" },
          h(
            "div",
            { className: "flex items-center gap-2 mb-1" },
            h("span", { className: "text-lg", "aria-hidden": "true" }, "🛠️"),
            h("h3", { className: "text-[15px] font-bold text-gray-900" }, "Personaliza en segundos")
          ),
          h(
            "p",
            { className: "text-[13px] text-gray-700" },
            "Completa ciudad, turnos y experiencia. Nosotros sugerimos, tú editas lo justo."
          ),
          h(
            "div",
            { className: "mt-2 grid grid-cols-3 gap-1.5 text-[12px]" },
            h(
              "div",
              {
                className:
                  "rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-gray-700",
              },
              "📍 Ciudad"
            ),
            h(
              "div",
              {
                className:
                  "rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-gray-700",
              },
              "⏱️ Turnos"
            ),
            h(
              "div",
              {
                className:
                  "rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-gray-700",
              },
              "🧰 Experiencia"
            )
          )
        ),
        h(
          "div",
          { className: "rounded-xl bg-white border border-gray-200 p-3 shadow-sm" },
          h(
            "div",
            { className: "flex items-center gap-2 mb-1" },
            h("span", { className: "text-lg", "aria-hidden": "true" }, "📈"),
            h("h3", { className: "text-[15px] font-bold text-gray-900" }, "Seguimiento del mensaje")
          ),
          h(
            "p",
            { className: "text-[13px] text-gray-700" },
            "Vemos si RR.HH. ",
            h("strong", null, "recibió"),
            ", ",
            h("strong", null, "leyó"),
            " y ",
            h("strong", null, "respondió"),
            ". Lo sigues en tiempo real."
          ),
          h(
            "div",
            { className: "mt-2 rounded-xl p-2 border border-gray-200 bg-gray-50" },
            h(
              "div",
              {
                className:
                  "grid grid-cols-3 text-[11px] text-gray-600 text-center",
              },
              h("span", null, "📬 Entregado"),
              h("span", null, "👀 Leído"),
              h("span", null, "💬 Respondido")
            ),
            h(
              "div",
              { className: "relative mt-2" },
              h("div", {
                className:
                  "absolute left-[8%] right-[8%] top-1/2 -translate-y-1/2 h-[2px] bg-gradient-to-r from-purple-300 to-purple-400 opacity-70",
              }),
              h(
                "div",
                {
                  className:
                    "grid grid-cols-3 items-center text-center relative z-10",
                },
                h(
                  "div",
                  { className: "flex justify-center" },
                  h("div", {
                    className: `w-3 h-3 rounded-full transition-all duration-300 ${
                      stats?.delivered
                        ? "bg-purple-600 shadow-[0_0_6px_rgba(147,51,234,0.6)]"
                        : "bg-gray-300 opacity-70"
                    }`,
                  })
                ),
                h(
                  "div",
                  { className: "flex justify-center" },
                  h("div", {
                    className: `w-3 h-3 rounded-full transition-all duration-300 ${
                      stats?.read
                        ? "bg-purple-600 shadow-[0_0_6px_rgba(147,51,234,0.6)]"
                        : "bg-gray-300 opacity-70"
                    }`,
                  })
                ),
                h(
                  "div",
                  { className: "flex justify-center" },
                  h("div", {
                    className: `w-3 h-3 rounded-full transition-all duration-300 ${
                      stats?.replied
                        ? "bg-purple-600 shadow-[0_0_6px_rgba(147,51,234,0.6)]"
                        : "bg-gray-300 opacity-70"
                    }`,
                  })
                )
              )
            ),
            h(
              "div",
              { className: "mt-2 text-[11px] text-gray-600 text-center" },
              stats?.replied
                ? "✅ RR.HH. respondió — te avisamos al instante"
                : stats?.read
                ? "⌛ Esperando respuesta — ya fue leído"
                : stats?.delivered
                ? "📬 Entregado a la bandeja de RR.HH."
                : "⏳ Preparando envío…"
            )
          )
        )
      )
    ),
    h(
      "div",
      { className: "grid grid-cols-1 gap-2 mt-3" },
      h(
        "div",
          {
          className:
            "rounded-2xl p-3 shadow-lg ring-1 ring-inset ring-lime-400/30 bg-gradient-to-br from-lime-100 via-lime-200 to-emerald-100 border border-lime-300/80",
        },
        h(
          "div",
          { className: "text-[15px] text-emerald-900 text-center" },
          h("span", { className: "font-semibold text-emerald-950" }, "✅ Claro y seguro:"),
          " plantillas listas, edición rápida y confirmaciones en cada paso."
        )
      )
    )
  );
}

function LiveListingsSection({ company, childJobs, extJob, onReferenceSelect }) {
  const [showMoreLive, setShowMoreLive] = useState(false);

  const JobCard = useCallback(
    ({ liveJob }) => {
      const isSelected = extJob?.id === liveJob.id;
      const ageHours = liveJob.ageHours || 0;

      return h(
        "div",
        {
          className: `border border-gray-200 rounded-xl bg-white p-2 md:p-4 shadow-lg cursor-pointer ${
            isSelected ? "ring-2 shadow-xl" : ""
          }`,
          style: isSelected
            ? {
                "--tw-ring-color": company.color || "#e7e7e7",
                "--tw-ring-opacity": "1",
              }
            : undefined,
          onClick: () => onReferenceSelect("live", liveJob),
        },
        h(
          "div",
          { className: "grid grid-cols-[56px_1fr_auto] gap-3 items-center" },
          h(
            "div",
            {
              className:
                "w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center font-black text-gray-700",
            },
            liveJob.source?.[0] || "J"
          ),
          h(
            "div",
            { className: "flex flex-col space-y-1" },
            h("h3", { className: "font-bold text-gray-800 mb-1" }, liveJob.title),
            h(
              "div",
              { className: "flex flex-wrap items-center gap-2 text-xs" },
              h(
                "div",
                {
                  className:
                    "flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded-full text-gray-600 hover:bg-gray-100 transition-colors",
                },
                h("span", null, liveJob.source)
              ),
              h(
                "div",
                {
                  className:
                    "flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded-full text-gray-600 hover:bg-gray-100 transition-colors",
                },
                h(
                  "svg",
                  {
                    className: "w-3 h-3 text-gray-500",
                    fill: "none",
                    stroke: "currentColor",
                    viewBox: "0 0 24 24",
                    "aria-hidden": "true",
                  },
                  h("path", {
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    strokeWidth: 2,
                    d: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z",
                  }),
                  h("path", {
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    strokeWidth: 2,
                    d: "M15 11a3 3 0 11-6 0 3 3 0 016 0z",
                  })
                ),
                h(
                  "span",
                  { className: "font-medium" },
                  repairMojibake(liveJob.city)
                )
              ),
              h(
                "div",
                {
                  className: `flex items-center gap-1.5 px-2 py-1 bg-gray-50 border rounded-full font-medium transition-all ${getFreshnessClass(
                    ageHours
                  )}`,
                },
                ageHours <= 1 &&
                  h("div", {
                    className:
                      "w-2 h-2 bg-emerald-500 rounded-full animate-pulse",
                  }),
                h(
                  "svg",
                  {
                    className: "w-3 h-3",
                    fill: "none",
                    stroke: "currentColor",
                    viewBox: "0 0 24 24",
                    "aria-hidden": "true",
                  },
                  h("path", {
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    strokeWidth: 2,
                    d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
                  })
                ),
                h(
                  "span",
                  null,
                  (ageHours <= 1 && "Justo ahora") ||
                    (ageHours <= 6 && "Nuevo") ||
                    (ageHours <= 24 && "Hoy") ||
                    (ageHours <= 48 && "Ayer") ||
                    `Hace ${Math.ceil(ageHours / 24)}d`
                )
              )
            )
          ),
          h(
            "div",
            { className: "space-y-2" },
            h(
              "a",
              {
                href: liveJob.link,
                target: "_blank",
                rel: "noopener noreferrer",
                className:
                  "border border-gray-200 bg-gray-50 px-2 md:px-4 py-1 rounded-xl text-xs hover:bg-gray-100 transition-colors inline-block",
                onClick: (e) => e.stopPropagation(),
              },
              "Abrir ↗"
            ),
            h(
              "button",
              {
                className:
                  "border border-gray-200 bg-gray-50 px-2 md:px-4 py-1 rounded-xl text-xs w-full hover:bg-gray-100 transition-colors",
                onClick: (e) => {
                  e.stopPropagation();
                  onReferenceSelect("live", liveJob);
                },
              },
              "Usar referencia"
            )
          )
        )
      );
    },
    [company.color, extJob?.id, onReferenceSelect]
  );

  const displayedJobs = showMoreLive ? childJobs : childJobs.slice(0, 2);

  return h(
    "section",
    { className: "mb-4" },
    h(
      "div",
      { className: "flex justify-between items-center mb-2" },
      h(
        "div",
        { className: "flex items-center gap-2" },
        h("h2", { className: "text-lg font-bold text-gray-800" }, "💼 Ofertas activas"),
        h(
          "span",
          {
            className:
              "border border-gray-300 bg-gray-50 px-2 md:px-4 py-0.5 rounded-full text-xs",
          },
          childJobs.length
        )
      )
    ),
    h(
      "div",
      { className: "space-y-2" },
      ...displayedJobs.map((liveJob) => h(JobCard, { key: liveJob.id, liveJob })),
      childJobs.length > 2 &&
        h(
          "button",
          {
            onClick: () => setShowMoreLive(!showMoreLive),
            className:
              "border border-gray-200 bg-gray-50 px-2 md:px-4 py-2 rounded-xl w-full hover:bg-gray-100 transition-colors",
          },
          showMoreLive ? "Ocultar empleos activos" : "Mostrar más empleos activos"
        )
    )
  );
}

function StickyApplyFooter({ company, selectedContact, onApplyClick, onEditScroll }) {
  const abbreviateName = useCallback((name = "") => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts[0]) return "";
    const first = parts[0].toLowerCase();
    return first.charAt(0).toUpperCase() + first.slice(1);
  }, []);

  const handleOpenApplyNow = useCallback(
    (e) => {
      try {
        e?.preventDefault?.();
        e?.stopPropagation?.();
      } catch {}
      let opened = false;
      try {
        if (typeof onApplyClick === "function") {
          onApplyClick();
          opened = true;
        }
      } catch {}
      if (!opened) {
        try {
          if (typeof window !== "undefined" && typeof window.fbq === "function") {
            window.fbq("track", "AddToCart", {
              content_name: "Acceso al reclutador",
              content_category: "Checkout",
            });
          }
        } catch {}
        try {
          trackGoal(749);
        } catch {}
      }
    },
    [onApplyClick]
  );

  const handleEditClick = useCallback(
    (e) => {
      try {
        e.stopPropagation();
      } catch {}
      onEditScroll?.();
      try {
        trackGoal(765);
      } catch {}
    },
    [onEditScroll]
  );

  const brandColor = company?.color || "#5E3FA6";
  const textOnBrand = getTextColorForBackground(brandColor);
  const hasContact = !!(selectedContact && selectedContact.name);
  const displayName = hasContact ? abbreviateName(selectedContact.name) : "";
  const initials = hasContact ? getInitials(selectedContact.name) : "??";
  const city = selectedContact?.city
    ? `\u00A0· 📍 ${repairMojibake(selectedContact.city)}`
    : "";
  const contactLine = hasContact
    ? `👤 ${displayName} ${city}`
    : "Elige tu contacto local en la empresa";

  return h(
    "div",
    {
      className:
        "fixed left-0 right-0 bottom-0 z-50 border-t border-gray-200 py-2 px-2 shadow-lg backdrop-blur-lg bg-white/70",
      style: { paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" },
    },
    h("div", {
      style: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "3px",
        background:
          "linear-gradient(135deg, var(--brand, #5E3FA6), var(--brand-2, #B276CA) 55%, var(--brand-3, #FF8AD8))",
      },
    }),
    h(
      "div",
      { className: "container max-w-screen-md mx-auto" },
      h(
        "div",
        { className: "flex flex-col mb-0 mt-2" },
        h(
          "div",
          {
            role: "button",
            tabIndex: 0,
            onClick: handleOpenApplyNow,
            onKeyDown: (e) => {
              if (e.key === "Enter" || e.key === " ") handleOpenApplyNow(e);
            },
            className:
              "flex items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400/60",
            style: { borderColor: brandColor },
            "aria-label": "Abrir envío directo al reclutador real",
          },
          h(
            "div",
            {
              className:
                "w-9 h-9 rounded-full flex items-center justify-center font-bold uppercase select-none shrink-0",
              style: { backgroundColor: brandColor, color: textOnBrand },
              "aria-hidden": "true",
            },
            initials
          ),
          h(
            "div",
            { className: "flex-1 min-w-0 leading-tight" },
            h(
              "div",
              {
                className: "text-xs uppercase tracking-wide text-gray-500 mb-1",
              },
              h(
                "span",
                { className: "inline max-[392px]:hidden" },
                "🔒 Contacto de Selección"
              ),
              h(
                "span",
                { className: "hidden max-[392px]:inline" },
                "🔒 Contacto de RR.HH."
              )
            ),
            h(
              "div",
              {
                className:
                  "text-sm font-medium text-gray-800 truncate",
                "aria-live": "polite",
              },
              contactLine
            )
          ),
          h(
            "button",
            {
              type: "button",
              onClick: handleEditClick,
              className:
                "rounded-full border font-semibold border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition shrink-0 whitespace-nowrap",
              "aria-label": "Cambiar contacto seleccionado",
            },
            "🔄 Cambiar"
          )
        ),
        h(
          "button",
          {
            onClick: () => {
              try {
                window.fbq?.("track", "AddToCart", {
                  content_name: "Acceso al reclutador",
                  content_category: "Checkout",
                });
              } catch {}
              try {
                trackGoal(749);
              } catch {}
              onApplyClick?.();
            },
            className:
              "mt-2 w-full border border-gray-200 text-white font-bold py-2.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg",
            style: {
              background: `
                linear-gradient(0deg, rgba(94,63,166,.20), rgba(94,63,166,.20)),
                linear-gradient(135deg,
                  var(--brand, #5E3FA6) 0%,
                  var(--brand-2, #744FBF) 55%,
                  var(--brand-3, #A978D8) 100%
                )
              `,
            },
            disabled: !hasContact,
          },
          h("span", null, "👉 Paso 2 de 2: Envía tu mensaje directo"),
          h(
            "p",
            { className: "mt-1 mb-1 font-normal text-xs" },
            `📬 Tu mensaje llega directo al correo de ${displayName} (${
              company?.name || ""
            })`
          )
        )
      )
    )
  );
}

/* =====================================================================
   INLINE CONVERSATION (CHAT-ANIMATION)
   ===================================================================== */

   function InlineConversation({
     recruiterFirstName,
     jobTitle,
     companyName,
     replyCity = "",
     onOpenApply,
   }) {
     const boxRef = useRef(null);
     const cardRef = useRef(null);
     const shownOnce = useRef(new Set());
     const timersRef = useRef([]);
     const sequenceStartedRef = useRef(false);
     const [started, setStarted] = useState(false);
     const [messages, setMessages] = useState([]);
     const [isNarrow, setIsNarrow] = useState(false);

     useEffect(() => {
       const update = () => {
         try {
           setIsNarrow(window.innerWidth <= 420);
         } catch {}
       };
       update();
       window.addEventListener("resize", update);
       return () => window.removeEventListener("resize", update);
     }, []);

     const handleOpenApplyNow = useCallback(
       (e) => {
         try {
           e?.preventDefault?.();
           e?.stopPropagation?.();
         } catch {}

         let opened = false;
         try {
           if (typeof onOpenApply === "function") {
             onOpenApply();
             opened = true;
           }
         } catch {}

         if (!opened) {
           try {
             window.openApplyNowModal?.();
             opened = true;
           } catch {}
         }

         if (!opened) {
           try {
             document.dispatchEvent(new CustomEvent("open-apply-modal"));
           } catch {}
         }

         try {
           window.fbq?.("track", "AddToCart", {
             content_name: "Acceso al reclutador",
             content_category: "Checkout",
           });
         } catch {}

         try {
           trackGoal(749);
         } catch {}
       },
       [onOpenApply]
     );

     const TYPE_MS = isNarrow ? 20 : 23;
     const HOLD_AFTER_USER = isNarrow ? 300 : 400;
     const HOLD_AFTER_HR1 = 300;
     const HOLD_AFTER_USER2 = isNarrow ? 300 : 400;

     const USER_MSG = useMemo(() => {
       const tt = jobTitle?.trim();
       const cc = companyName?.trim();
       const who = "Hola, ";
       const role = tt ? `me postulo a ${tt}` : "me postulo a la vacante";
       const comp = cc ? ` en ${cc}` : "";
       return isNarrow
         ? `${who}${role}${comp}. Vivo cerca y disponible.`
         : `${who}${role}${comp}. Vivo cerca y tengo disponibilidad inmediata.`;
     }, [jobTitle, companyName, isNarrow]);

     const USER2_MSG = useMemo(() => {
       const city = (replyCity || "").trim();
       if (isNarrow) {
         return city
           ? `Claro: ${city}. Disponibilidad inmediata.`
           : "Claro: disponibilidad inmediata.";
       }
       return city
         ? `Claro, estoy en ${city} y tengo disponibilidad inmediata.`
         : "Claro, tengo disponibilidad inmediata.";
     }, [replyCity, isNarrow]);

     const HR1_TEXT =
       "Hola, gracias por tu interés. ¿Puedes confirmar ciudad y disponibilidad?";
     const HR2_TEXT = "Perfecto. Te escribiré hoy con los pasos a seguir.";

     const cleanupAll = useCallback(() => {
       timersRef.current.forEach((entry) => {
         if (entry == null) return;

         if (typeof entry === "object" && typeof entry.cancel === "function") {
           try {
             entry.cancel();
           } catch {}
           return;
         }

         try {
           clearTimeout(entry);
         } catch {}
         try {
           cancelAnimationFrame(entry);
         } catch {}
       });
       timersRef.current = [];
     }, []);

     useEffect(() => {
       cleanupAll();
       sequenceStartedRef.current = false;
       setStarted(false);
       setMessages([]);
       shownOnce.current.clear();

       const t = setTimeout(() => setStarted(true), 160);
       timersRef.current.push(t);

       return cleanupAll;
     }, [USER_MSG, USER2_MSG, recruiterFirstName, cleanupAll]);

     useEffect(() => {
       if (!boxRef.current || started) return;
       let fail = setTimeout(() => setStarted(true), 500);

       if (typeof window !== "undefined" && "IntersectionObserver" in window) {
         const io = new IntersectionObserver(
           (ents) => ents.forEach((e) => e.isIntersecting && setStarted(true)),
           { threshold: 0.18, rootMargin: "120px 0px 120px 0px" }
         );
         io.observe(boxRef.current);

         return () => {
           io.disconnect();
           clearTimeout(fail);
         };
       }

       return () => clearTimeout(fail);
     }, [started]);

     const after = (ms, fn) => {
       const t = setTimeout(fn, ms);
       timersRef.current.push(t);
     };

     const pushAndType = useCallback(
       (msg, onDone) => {
         if (shownOnce.current.has(msg.id)) return;

         setMessages((prev) => [...prev, { ...msg, textShown: "" }]);

         let charIndex = 0;
         let lastUpdate = performance.now();
         let cancelled = false;

         const animate = (currentTime) => {
           if (cancelled) return;

           if (currentTime - lastUpdate >= TYPE_MS) {
             charIndex++;
             setMessages((prev) => {
               const lastIdx = prev.length - 1;
               if (prev[lastIdx]?.id !== msg.id) return prev;
               return [
                 ...prev.slice(0, lastIdx),
                 {
                   ...prev[lastIdx],
                   textShown: msg.textFull.slice(0, charIndex),
                 },
               ];
             });
             lastUpdate = currentTime;

             if (charIndex >= msg.textFull.length) {
               shownOnce.current.add(msg.id);
               onDone?.();
               return;
             }
           }

           const rafId = requestAnimationFrame(animate);
           timersRef.current.push(rafId);
         };

         timersRef.current.push({
           type: "cancel-typing",
           cancel: () => {
             cancelled = true;
           },
         });

         requestAnimationFrame(animate);
       },
       [TYPE_MS]
     );

     useEffect(() => {
       if (!started) return;
       if (sequenceStartedRef.current) return;
       sequenceStartedRef.current = true;

       const u1 = { id: "u1", role: "user", time: "09:14", textFull: USER_MSG };
       const hr1 = { id: "hr1", role: "hr", time: "09:15", textFull: HR1_TEXT };
       const u2 = { id: "u2", role: "user", time: "09:16", textFull: USER2_MSG };
       const hr2 = { id: "hr2", role: "hr", time: "09:18", textFull: HR2_TEXT };

       pushAndType(u1, () => {
         after(HOLD_AFTER_USER, () => {
           pushAndType(hr1, () => {
             after(HOLD_AFTER_HR1, () => {
               pushAndType(u2, () => {
                 after(HOLD_AFTER_USER2, () => {
                   pushAndType(hr2, () => {
                     // når hr2 er færdig, sætter vi bare state → hr2Done bliver true
                   });
                 });
               });
             });
           });
         });
       });

       return cleanupAll;
     }, [started, USER_MSG, USER2_MSG, pushAndType, cleanupAll]);

     const animateClass = (id) =>
       shownOnce.current.has(id) ? "" : " animate-[popIn_.24s_ease-out]";

     const hr2Done = messages.some(
       (m) => m.id === "hr2" && m.textShown.length >= m.textFull.length
     );
     const showFollow = messages.some((m) => m.role === "hr");

     return h(
       "div",
       { ref: boxRef, className: "relative" },
       h(
         "style",
         null,
         `
         @keyframes popIn {
           0% { opacity: 0; transform: translateY(6px) scale(.98); }
           100% { opacity: 1; transform: translateY(0) scale(1); }
         }

         @media (prefers-reduced-motion: reduce) {
           * {
             animation-duration: .001ms !important;
             animation-iteration-count: 1 !important;
             transition-duration: 0.01ms !important;
           }
         }
       `
       ),
       h(
         "div",
         {
           ref: cardRef,
           role: "button",
           tabIndex: 0,
           onClick: handleOpenApplyNow,
           onKeyDown: (e) => {
             if (e.key === "Enter" || e.key === " ") handleOpenApplyNow(e);
           },
           className:
             "rounded-2xl border border-gray-200 bg-white p-3 shadow-lg overflow-hidden relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400/60",
         },
         h(
           "div",
           { className: "flex items-center gap-2 mb-2" },
           h("span", { className: "text-lg" }, "💬"),
           h(
             "h4",
             {
               className:
                 "text-base max-[393px]:text-[15px] font-extrabold text-gray-900",
             },
             "Ejemplo de mensajes al reclutador"
           )
         ),
         h(
           "div",
           { className: "space-y-2 min-h-[170px] max-[393px]:min-h-[150px]" },
           ...messages
             .filter((m) => m.textShown && m.textShown.length > 0)
             .map((m) => {
               const isUser = m.role === "user";
               return h(
                 "div",
                 {
                   key: m.id,
                   className:
                     (isUser
                       ? "ml-auto bg-emerald-50 border-emerald-200 text-emerald-900"
                       : "bg-gray-100 border-gray-200 text-gray-800") +
                     " max-w-[86%] rounded-2xl border p-2 text-[13px] max-[393px]:text-[12px] shadow-sm" +
                     animateClass(m.id),
                 },
                 h(
                   "div",
                   {
                     className:
                       "text-[11px] mb-0.5 " +
                       (isUser ? "text-emerald-700/90" : "text-gray-700"),
                   },
                   isUser ? "Tú" : `${recruiterFirstName || "Reclutador"} (Reclutador)`,
                   " • ",
                   m.time
                 ),
                 h("span", null, m.textShown)
               );
             })
         ),
         showFollow &&
           h(
             "div",
             { className: "text-[11px] text-gray-600 text-center mt-2" },
             "Seguimiento: ",
             h("span", { className: "font-medium" }, "entregado"),
             " • ",
             h("span", { className: "font-medium" }, "leído"),
             " • ",
             h(
               "span",
               {
                 className:
                   "font-medium " +
                   (hr2Done ? "text-emerald-700" : "text-gray-600"),
               },
               "respondido"
             )
           ),
         hr2Done &&
           h(
             "div",
             { className: "mt-3" },
             h(
               "button",
               {
                 type: "button",
                 onClick: handleOpenApplyNow,
                 className:
                   "w-full border border-gray-200 text-white font-semibold py-2.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all text-sm",
                 style: {
                   background: `
                     linear-gradient(0deg, rgba(94,63,166,.20), rgba(94,63,166,.20)),
                     linear-gradient(135deg,
                       var(--brand, #5E3FA6) 0%,
                       var(--brand-2, #744FBF) 55%,
                       var(--brand-3, #A978D8) 100%
                     )
                   `,
                 },
               },
               h("span", null, "💎 Enviar tu mensaje directo"),
               h(
                 "p",
                 { className: "mt-0.5 text-[11px] font-normal text-white/90" },
                 "Tu mensaje llega directo al correo de RR.HH."
               )
             )
           )
       )
     );
   }


/* =====================================================================
   RECRUITER-BLOK
   ===================================================================== */

function UnifiedRecruiterBlockPreviewFirst({
  company = { name: "Empresa", color: "#5E3FA6", logo_url: "" },
  job = { title: "" },
  contacts = [],
  selectedContactId,
  onContactSelect,
  onOpenApply,
  maxInitial = 2,
}) {
  const BRAND = company?.color || "#5E3FA6";
  const brandText = getTextColorForBackground(BRAND);

  const [detectedCity, setDetectedCity] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [showAll, setShowAll] = useState(false);

  // Detektér by fra geoData + cookies/boot og auto-filtrér hvis vi har match
  useEffect(() => {
    const { city: bootCity, label } = getBootGeo();

    // Brug city først; hvis tom, fald tilbage til første del af label
    const rawCity =
      (bootCity && bootCity.trim()) ||
      (label && label.split(",")[0].trim()) ||
      "";

    const hdr = repairMojibake(rawCity);
    setDetectedCity(hdr || "");

    if (!contacts?.length || !hdr) return;

    const normBoot = normalizeCityLoose(hdr);

    const hasMatch = contacts.some((c) => {
      const normC = normalizeCityLoose(c.city || "");
      if (!normC) return false;
      return (
        normC === normBoot ||
        normC.includes(normBoot) ||
        normBoot.includes(normC)
      );
    });

    if (hasMatch) setCityFilter(hdr);
  }, [contacts]);

  const filtered = useMemo(() => {
    const q = normalizeCityLoose(cityFilter);
    if (!q) return [...contacts];
    return contacts.filter((c) =>
      normalizeCityLoose(c.city || "").includes(q)
    );
  }, [contacts, cityFilter]);

  const selectedContactGlobal = useMemo(
    () => contacts.find((c) => c.id === selectedContactId) || null,
    [contacts, selectedContactId]
  );

  const cityChips = useMemo(() => {
    const m = new Map();
    contacts.forEach((c) => {
      const raw = (c.city || "").trim();
      if (!raw) return;
      const key = canonicalCity(raw);
      const display = repairMojibake(raw);
      if (!m.has(key)) m.set(key, display);
    });
    return Array.from(m.values()).slice(0, 10);
  }, [contacts]);

  const RecruiterCard = useCallback(
    ({ c }) => {
      const isSel = c.id === selectedContactId;
      return h(
        "button",
        {
          type: "button",
          onClick: () => {
            onContactSelect?.(c.id);
            try {
              trackGoal(765);
            } catch {}
          },
          className:
            "group text-left rounded-2xl border p-3 bg-white shadow-sm hover:shadow-md active:scale-[.995] transition " +
            (isSel ? "ring-2 ring-offset-0" : ""),
          style: { borderColor: "#e5e7eb", "--tw-ring-color": BRAND },
        },
        h(
          "div",
          { className: "grid grid-cols-[52px_1fr_auto] gap-2 items-center" },
          h(
            "div",
            {
              className:
                "w-12 h-12 rounded-full flex items-center justify-center font-black uppercase border shrink-0",
              style: {
                backgroundColor: BRAND,
                color: brandText,
                borderColor: "rgba(0,0,0,.06)",
              },
            },
            getInitials(c.name)
          ),
          h(
            "div",
            { className: "min-w-0" },
            h(
              "div",
              {
                className:
                  "text-[13px] font-bold text-gray-900 mb-0.5 truncate",
              },
              "👤 Reclutador: ",
              getInitials(c.name),
              " ",
              h("span", { className: "text-xs" }, "🔒")
            ),
            h(
              "div",
              { className: "mt-0.5 text-[11px] text-gray-600 truncate" },
              h("span", { className: "mr-1" }, "📧 Email 🔒"),
              " · ",
              h("span", { className: "ml-1" }, "📞 Télefono 🔒")
            ),
            h(
              "div",
              {
                className:
                  "text-[11px] text-gray-600 font-semibold truncate",
              },
              c.city
                ? `📍 ${repairMojibake(c.city)}`
                : h(
                    "span",
                    { className: "opacity-70" },
                    "Ciudad no indicada"
                  )
            )
          ),
          h(
            "span",
            {
              className:
                `px-2 py-0.5 rounded-full text-[11px] border ` +
                (isSel
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-gray-50 text-gray-700 border-gray-200"),
            },
            isSel ? "Elegido" : "Elegir"
          )
        )
      );
    },
    [selectedContactId, BRAND, brandText, onContactSelect]
  );

  return h(
    "section",
    {
      className: "rounded-2xl border shadow-md overflow-hidden",
      style: {
        borderColor: "rgba(94,63,166,0.20)",
        background:
          "linear-gradient(180deg, rgba(94,63,166,0.06), rgba(178,118,202,0.05) 35%, rgba(255,255,255,0) 95%)",
      },
    },
    h(
      "div",
      { className: "p-3 border-b border-gray-200 bg-white" },
      h(
        "div",
        { className: "flex items-center gap-2" },
        h(
          "h2",
          {
            className:
              "text-lg max-[393px]:text-[16px] font-extrabold leading-snug text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand,#5E3FA6)] via-[var(--brand-2,#B276CA)] to-[var(--brand-3,#5E3FA6)]",
          },
          "🚀 Aplica directo al persona de selección"
        )
      )
    ),
    h(
      "div",
      { className: "p-3 grid grid-cols-1 gap-3" },
      h(InlineConversation, {
        recruiterFirstName: selectedContactGlobal
          ? (selectedContactGlobal.name || "").split(/\s+/)[0]
          : "Reclutador",
        jobTitle: job?.title || "",
        companyName: company?.name || "",
        // 🔥 Brug ALTID brugerens by først; hvis ukendt, falder vi tilbage til kontaktens
        replyCity: repairMojibake(detectedCity || selectedContactGlobal?.city || ""),
        onOpenApply: onOpenApply,
      }),
      h(
        "div",
        { className: "rounded-2xl border border-gray-200 bg-white p-2" },
        h(
          "label",
          {
            className: "block text-sm font-semibold text-gray-700 mb-1",
            id: "hr-selector",
          },
          "👉 Selecciona tu reclutador por ciudad"
        ),
        h(
          "div",
          { className: "flex items-stretch gap-2" },
          h(
            "div",
            { className: "relative flex-1" },
            h(
              "span",
              {
                className:
                  "absolute left-2 top-1/2 -translate-y-1/2 text-gray-400",
              },
              "🔎"
            ),
            h("input", {
              inputMode: "search",
              autoComplete: "off",
              value: cityFilter,
              onChange: (e) => setCityFilter(repairMojibake(e.target.value)),
              placeholder: "Ej. Ciudad de México, Querétaro…",
              className:
                "w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-700 focus:border-gray-700",
            })
          ),
          h(
            "button",
            {
              type: "button",
              onClick: () => {
                setCityFilter("");
                try {
                  trackGoal(763);
                } catch {}
              },
              className:
                "px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm hover:bg-gray-100 transition",
            },
            "Borrar"
          )
        ),
        cityChips.length > 0 &&
          h(
            "div",
            {
              className:
                "mt-2 flex gap-1.5 overflow-x-auto snap-x snap-mandatory [-webkit-overflow-scrolling:touch] no-scrollbar",
            },
            ...cityChips.map((name) =>
              h(
                "button",
                {
                  key: name,
                  type: "button",
                  onClick: () => setCityFilter(name),
                  className:
                    `px-2 py-1 rounded-full text-[12px] border snap-start shrink-0 ` +
                    (normalizeCityLoose(cityFilter) === normalizeCityLoose(name)
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"),
                },
                name
              )
            )
          )
      ),
      h(
        "div",
        { className: "grid grid-cols-1 sm:grid-cols-2 gap-2" },
        ...(showAll ? filtered : filtered.slice(0, maxInitial)).map((c) =>
          h(RecruiterCard, { key: c.id, c })
        )
      ),
      filtered.length > maxInitial &&
        h(
          "button",
          {
            type: "button",
            onClick: () => setShowAll((v) => !v),
            className:
              "border border-gray-200 bg-gray-50 px-3 py-2 rounded-2xl w-full hover:bg-gray-100 transition-colors text-sm",
          },
          showAll ? "Ver menos" : "Ver más contactos RR.HH."
        )
    )
  );
}

/* =====================================================================
   HOVEDKOMPONENT
   ===================================================================== */

const JobDetailsClient = function JobDetailsClient({
  job,
  company,
  childJobs,
  aiSnapshot, // (ikke brugt her)
  contacts,
  chips, // (ikke brugt her)
  locationText,
}) {
  // 👇 Fiks [[GEO_LABEL]]-flash: brug hook, der læser final label fra geoData/__GEO__/cookies/meta
  const geoLabel = useGeoLabel(locationText);

  const jobId = job?.id || job?.slug || "";
  const companyId = company?.id || company?.slug || company?.name || "";
  const RECENT_SIZE = 3;
  const recentKey = `recent_contact_ids:${companyId || "na"}:${jobId || "na"}`;

  const [selectedContactId, setSelectedContactId] = useState(null);
  const [extJob, setExtJob] = useState(null);

  // extras → objekt med pæn by (til ApplyNowModal), baseret på getBootGeo()
  const [extras, setExtras] = useState(() => {
    if (typeof window !== "undefined") {
      const { city, cc } = getBootGeo();
      const cleanCity = titleCaseEs(repairMojibake(city || ""));
      return {
        userCity: cleanCity,
        countryCode: (cc || "").toLowerCase() || "mx",
      };
    }
    return { userCity: "", countryCode: "mx" };
  });

  useEffect(() => {
    const { city, cc } = getBootGeo();
    const cleanCity = titleCaseEs(repairMojibake(city || ""));
    const next = {
      userCity: cleanCity,
      countryCode: (cc || "").toLowerCase() || "mx",
    };
    setExtras((prev) =>
      prev.userCity === next.userCity && prev.countryCode === next.countryCode
        ? prev
        : next
    );
  }, []);

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [actualizado, setActualizado] = useState("");

  const { setHasStickyFooter, setStickyFooterHeight } = useStickyFooter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = "actualizado_cache";
    const ttl = 4 * 60 * 60 * 1000;
    const now = Date.now();
    let label;
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const saved = JSON.parse(cached);
        if (now - saved.time < ttl) label = saved.value;
      }
    } catch {}
    if (!label) {
      const rnd = Math.floor(Math.random() * 180) + 1;
      label = `hace ${rnd} min`;
      try {
        localStorage.setItem(key, JSON.stringify({ time: now, value: label }));
      } catch {}
    }
    setActualizado(label);
  }, []);

  const selectedContact = useMemo(
    () => contacts.find((c) => c.id === selectedContactId) || contacts[0],
    [contacts, selectedContactId]
  );

  const hasSelectedContact = useMemo(
    () => !!(selectedContactId && selectedContact),
    [selectedContactId, selectedContact]
  );

  useEffect(() => {
    setHasStickyFooter(hasSelectedContact);
    setStickyFooterHeight(hasSelectedContact ? 120 : 0);
    return () => {
      setHasStickyFooter(false);
      setStickyFooterHeight(0);
    };
  }, [hasSelectedContact, setHasStickyFooter, setStickyFooterHeight]);

  // Vælg default kontakt: By (direct) → Cluster (storby) → Land → Fallback
  const chooseContact = useCallback(async () => {
    const recent = readFromStorage(recentKey, []);
    const { city: rawCity, cc, label } = getBootGeo();

    const candidateCity =
      (rawCity && rawCity.trim()) ||
      (label && label.split(",")[0].trim()) ||
      "";

    const normCandidate = normalizeCityLoose(candidateCity);
    const candidateCanon = canonicalCity(candidateCity);
    const upperCC = (cc || "").toUpperCase();

    let pool = [];

    // 1) DIREKTE BY-MATCH (accent-fri, tolerant)
    if (normCandidate) {
      pool = findDirectCityMatches(contacts, normCandidate);
    }

    // 2) MX: CLUSTER-MATCH (storby-område) hvis ingen direkte match
    if (!pool.length && upperCC === "MX" && candidateCanon) {
      pool = findClusterMatchesForMX(contacts, candidateCanon);
    }

    // 3) LAND-MATCH (fall back på country)
    if (!pool.length && upperCC) {
      pool = contacts.filter(
        (c) => (c.country || "").toUpperCase() === upperCC
      );
    }

    // 4) Sidste fallback: alle kontakter
    const poolForPick = pool.length ? pool : contacts;
    const shuffled = shuffle(poolForPick);
    const pickedId =
      pickRandomFrom(shuffled)?.id ?? contacts[0]?.id ?? null;

    setSelectedContactId(pickedId);

    if (pickedId) {
      writeToStorage(
        recentKey,
        [pickedId, ...recent.filter((x) => x !== pickedId)].slice(
          0,
          RECENT_SIZE
        )
      );
    }
  }, [contacts, recentKey]);

  useEffect(() => {
    (async () => {
      if (contacts?.length) await chooseContact();
    })();
  }, [contacts, chooseContact]);

  useEffect(() => {
    (async () => {
      if (!contacts?.length) return;
      if (
        selectedContactId &&
        contacts.some((c) => c.id === selectedContactId)
      )
        return;
      await chooseContact();
    })();
  }, [contacts, selectedContactId, chooseContact]);

  const handleContactSelect = useCallback(
    (contactId) => {
      setSelectedContactId(contactId);
      const recent = readFromStorage(recentKey, []);
      writeToStorage(
        recentKey,
        [contactId, ...recent.filter((x) => x !== contactId)].slice(
          0,
          RECENT_SIZE
        )
      );
    },
    [recentKey]
  );

  const handleReferenceSelect = useCallback(
    (type, jobData = null) => {
      if (type === "live") {
        setExtJob(jobData);
      } else if (type === "user") {
        setExtJob({
          id: "own_" + Date.now(),
          title: "Referenced posting",
          source: jobData?.host,
          link: jobData?.url,
          city: job?.location?.[0] || "Bogotá",
        });
      } else {
        setExtJob(null);
      }
    },
    [job]
  );

  const onEditScroll = useCallback(() => {
    const el = document.getElementById("hr-selector");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleApplyClick = useCallback(() => {
    setIsApplyModalOpen(true);
    try {
      trackGoal(749);
    } catch {}
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsApplyModalOpen(false);
  }, []);

  return h(
    "div",
    {
      className:
        "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-2 md:px-4 py-2 text-gray-600 text-sm pb-8",
    },
    h(
      "div",
      { className: "container max-w-screen-md mx-auto mb-4 md:mt-2" },
      h(
        "div",
        { className: "bg-white shadow-lg overflow-hidden p-2 md:p-4" },
        // Hero med geoLabel
        h(JobHeroSection, {
          job,
          company,
          contactsLength: contacts?.length,
          childJobsLength: childJobs?.length,
          locationText: geoLabel,
          actualizado,
        }),

        // Rekrutter-blok
        h(UnifiedRecruiterBlockPreviewFirst, {
          company: {
            name: company.name,
            color: company.color,
            logo_url: company.logo_url,
          },
          job: { title: job.title },
          contacts,
          selectedContactId,
          onContactSelect: handleContactSelect,
          onOpenApply: () => setIsApplyModalOpen(true),
        }),

        // Assist-sektion
        h(FeaturesAssistSection, {
          company,
          stats: { delivered: true, read: true, replied: false },
        }),

        // Live listings (hvis nogen)
        childJobs?.length > 0 &&
          h(LiveListingsSection, {
            company,
            childJobs,
            extJob,
            onReferenceSelect: handleReferenceSelect,
          })
      )
    ),

    // Sticky footer når kontakt valgt
    selectedContactId &&
      h(StickyApplyFooter, {
        company,
        selectedContact:
          contacts.find((c) => c.id === selectedContactId) ||
          contacts[0],
        onApplyClick: handleApplyClick,
        onEditScroll,
      }),

    // Apply modal
    h(ApplyNowModal, {
      isOpen: isApplyModalOpen,
      onClose: handleCloseModal,
      job,
      company,
      selectedContact:
        contacts.find((c) => c.id === selectedContactId) || contacts[0],
      // extras → bruges kun inde i ApplyNowModal (Step 1–2)
      extras,
    })
  );
};

export default JobDetailsClient;
