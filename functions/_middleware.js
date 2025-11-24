// functions/_middleware.js
// Ultimate Edition v2: Cloudflare Geo-middleware
// Fixer client-side navigation ved at injicere window.__GEO__ på alle sider.

// --------------------------- KONFIGURATION ---------------------------

const COUNTRY_LABELS = {
  MX: "México", CO: "Colombia", PE: "Perú", AR: "Argentina", CL: "Chile",
  BR: "Brasil", EC: "Ecuador", DO: "República Dominicana", VE: "Venezuela",
  GT: "Guatemala", HN: "Honduras", SV: "El Salvador", PY: "Paraguay",
  UY: "Uruguay", BO: "Bolivia", CR: "Costa Rica", PA: "Panamá",
  NI: "Nicaragua", CU: "Cuba", DK: "Denmark",
};

const LATAM_COUNTRIES = new Set([
  "MX","CO","PE","AR","CL","BR","EC","DO","VE",
  "GT","HN","SV","PY","UY","BO","CR","PA","NI","CU"
]);

// Dictionary til hurtig opslag af specielle bynavne (O(1) lookup)
const CITY_MAPPINGS = {
  MX: {
    "mexico city": { name: "Ciudad de México", slug: "ciudad-de-mexico" },
    "cdmx": { name: "Ciudad de México", slug: "ciudad-de-mexico" },
    "df": { name: "Ciudad de México", slug: "ciudad-de-mexico" },
    "mexico d.f": { name: "Ciudad de México", slug: "ciudad-de-mexico" },
    "ciudad de mexico": { name: "Ciudad de México", slug: "ciudad-de-mexico" },
    "santiago de queretaro": { name: "Santiago de Querétaro", slug: "santiago-de-queretaro" },
    "queretaro": { name: "Santiago de Querétaro", slug: "santiago-de-queretaro" },
    "leon": { name: "León", slug: "leon" },
    "monterrey": { name: "Monterrey", slug: "monterrey" },
    "guadalajara": { name: "Guadalajara", slug: "guadalajara" },
  },
  CO: {
    "bogota": { name: "Bogotá", slug: "bogota" },
    "medellin": { name: "Medellín", slug: "medellin" },
    "cali": { name: "Cali", slug: "cali" },
  }
};

const STATIC_EXTENSIONS = new Set([
  "js", "css", "png", "jpg", "jpeg", "webp", "svg", "ico",
  "map", "woff", "woff2", "ttf", "eot", "otf", "json", "txt", "xml"
]);

const STOPWORDS = new Set(["de", "del", "la", "las", "los", "y", "e", "da", "do", "das", "dos"]);

// --------------------------- MAIN HANDLER ---------------------------

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // 1. Exit for statiske filer (Optimering)
  const lastDotIndex = url.pathname.lastIndexOf('.');
  if (lastDotIndex !== -1) {
    const ext = url.pathname.substring(lastDotIndex + 1).toLowerCase();
    if (STATIC_EXTENSIONS.has(ext)) {
      return next();
    }
  }

  const isFrontPage = url.pathname === "/" || url.pathname === "/index.html";

  // 2. Beregn Geo-data
  const geo = getGeoFromRequest(request, url);
  const { country, cityName, citySlug, label } = geo;

  // 3. Hent contactsCount (kun forside, ellers 0 for at spare ressourcer)
  let contactsCount = 0;
  if (isFrontPage) {
    contactsCount = await fetchContactsCountSafe(url, { country, cityName });
  }

  const replacements = {
    label,
    country,
    cityName,
    citySlug,
    contactsCount: String(contactsCount)
  };

  // 4. Hent origin response
  let res;
  try {
    res = await next();
  } catch (e) {
    return new Response("Internal Error", { status: 500 });
  }

  const contentType = (res.headers.get("Content-Type") || "").toLowerCase();
  const isHtml = contentType.includes("text/html");
  const isJson = contentType.includes("application/json");

  // Opsæt headers
  const newHeaders = new Headers(res.headers);
  newHeaders.set("x-geo-city", cityName || "");
  newHeaders.set("x-geo-country", country);
  newHeaders.set("Vary", "Accept-Encoding");
  newHeaders.delete("Content-Length");

  if (isFrontPage) {
    newHeaders.set("Cache-Control", "private, no-store");
  }

  // --------------------------- CASE A: JSON API ---------------------------
  if (isJson) {
    try {
      const originalText = await res.text();
      return new Response(applyReplacements(originalText, replacements), {
        status: res.status,
        headers: newHeaders
      });
    } catch {
      return new Response(res.body, { status: res.status, headers: newHeaders });
    }
  }

  // --------------------------- CASE B: HTML (Streaming) ---------------------------
  if (isHtml) {
    const rewriter = new HTMLRewriter();

    // 1. Meta Tags (Opdater eller indsæt hvis de mangler)
    rewriter.on('meta[name="x-geo-country"]', { element(e) { e.setAttribute("content", country); } });
    rewriter.on('meta[name="x-geo-city"]', { element(e) { e.setAttribute("content", cityName || ""); } });

    // 2. GLOBAL INJEKTION: Dette sikrer at React kan finde data ved navigation
    // Vi indsætter scriptet i <head> på ALLE HTML sider, ikke kun forsiden.
    rewriter.on("head", {
      element(e) {
        e.append(`<script id="__geo_bootstrap">window.__GEO__=${JSON.stringify({country,city:cityName||"",citySlug:citySlug||"",label,contactsCount})}</script>`, { html: true });
      }
    });

    // 3. Server-side replace af attributter (Hurtigt første load)
    const attrsToCheck = ['content', 'title', 'placeholder', 'aria-label', 'alt', 'href'];
    // Byg selector én gang
    const attrSelector = attrsToCheck.map(attr => `[${attr}*="[["]`).join(',');

    rewriter.on(attrSelector, {
      element(e) {
        for (const attr of attrsToCheck) {
          if (e.hasAttribute(attr)) {
            const val = e.getAttribute(attr);
            if (val.includes('[[')) {
              e.setAttribute(attr, applyReplacements(val, replacements));
            }
          }
        }
      }
    });

    // 4. Server-side replace af tekst (Streaming Text Replacement)
    rewriter.on("*", {
      text(textChunk) {
        const text = textChunk.text;
        if (text.indexOf('[[') !== -1) {
          const newText = applyReplacements(text, replacements);
          if (text !== newText) {
            textChunk.replace(newText, { html: true });
          }
        }
      }
    });

    // 5. Ekstra Data-attributter (Kun nødvendigt på forsiden for CSS hooks)
    if (isFrontPage) {
      rewriter.on("html", {
        element(e) {
          e.setAttribute("data-geo-country", country);
          e.setAttribute("data-geo-city", cityName || "");
          e.setAttribute("data-geo-city-slug", citySlug || "");
        }
      });
      rewriter.on("body", {
        element(e) {
          e.setAttribute("data-geo-label", label);
          e.setAttribute("data-contacts-count", String(contactsCount));
        }
      });
    }

    return rewriter.transform(
      new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: newHeaders
      })
    );
  }

  // Default passthrough
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: newHeaders
  });
}

// --------------------------- HELPERS ---------------------------

function applyReplacements(str, map) {
  if (!str) return "";
  return str
    .replaceAll('[[GEO_LABEL]]', map.label)
    .replaceAll('[[GEO_COUNTRY]]', map.country)
    .replaceAll('[[GEO_CITY]]', map.cityName || "")
    .replaceAll('[[GEO_CITY_SLUG]]', map.citySlug || "")
    .replaceAll('[[CONTACTS_COUNT]]', map.contactsCount);
}

function getGeoFromRequest(request, url) {
  const cf = request.cf || {};
  let country = (cf.country || "CO").toUpperCase();
  let rawCity = (cf.city || "").trim();

  // Test override: ?geo=MX:leon
  const override = url.searchParams.get("geo");
  if (override) {
    const parts = override.split(":");
    if (parts[0]) country = parts[0].toUpperCase();
    if (parts[1]) rawCity = parts[1].replace(/-/g, " ");
  }

  const { cityName, citySlug } = normalizeCityName(rawCity, country);
  const label = cityName ? `${cityName}, ${COUNTRY_LABELS[country] || country}` : "Ubicación no disponible";

  return { country, cityName, citySlug, label };
}

// Henter contactsCount med timeout protection (800ms)
async function fetchContactsCountSafe(url, { country, cityName }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 800);

  try {
    const apiUrl = new URL("/api/contacts/count-by-city", url.origin);
    const resp = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "x-geo-country": country,
        "x-geo-city": cityName || "",
        "x-mw-internal": "1",
      },
      cf: { cacheTtl: 60, cacheEverything: true },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!resp.ok) return 0;
    const json = await resp.json();
    return Number(json?.data?.contactsCount ?? 0);
  } catch (err) {
    return 0; // Fejl eller timeout -> vis 0
  }
}

// --------------------------- CITY LOGIC ---------------------------

function normalizeCityName(rawCity, country) {
  const cleanRaw = (rawCity || "").toLowerCase().trim();
  const upperCountry = (country || "").toUpperCase();

  // 1. Dictionary Lookup
  if (CITY_MAPPINGS[upperCountry] && CITY_MAPPINGS[upperCountry][cleanRaw]) {
    return {
      cityName: CITY_MAPPINGS[upperCountry][cleanRaw].name,
      citySlug: CITY_MAPPINGS[upperCountry][cleanRaw].slug
    };
  }

  // 2. Fallback for MX special cases
  if (upperCountry === "MX") {
    if (cleanRaw.includes("mexico city") || cleanRaw.includes("cdmx")) {
      return { cityName: "Ciudad de México", citySlug: "ciudad-de-mexico" };
    }
  }

  // 3. Generic logic
  let cityName;
  if (LATAM_COUNTRIES.has(upperCountry)) {
    cityName = formatLatAmCityName(cleanRaw);
  } else {
    cityName = cleanRaw ? cleanRaw.charAt(0).toUpperCase() + cleanRaw.slice(1) : "";
  }

  const citySlug = (cityName || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return { cityName: cityName || "", citySlug };
}

function formatLatAmCityName(cityStr) {
  if (!cityStr) return "";
  return cityStr.split(/\s+/)
    .map((w, i) => (i === 0 || !STOPWORDS.has(w))
      ? w.charAt(0).toUpperCase() + w.slice(1)
      : w
    )
    .join(" ");
}
