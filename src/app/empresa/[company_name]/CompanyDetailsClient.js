"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useTransition,
} from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import companiesService from "../../../services/companiesService";
import jobsService from "../../../services/jobsService";
import contactsService from "../../../services/contactsService";
import CompanyPageSkeleton from "../../../components/company/CompanyPageSkeleton";
import { useStickyFooter } from "../../../components/StickyFooterContext";
import { GeoText } from "../../../components/GeoText";

// ⚡ Lazily load heavier client widgets
const JobsList = dynamic(
  () => import("../../../components/empleos/JobsList"),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-2 md:space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse flex gap-2 items-center p-2 md:p-4 border-[1px] border-[#0001] shadow-lg rounded-lg"
          >
            <div className="min-w-[75px] h-[75px] bg-gray-300 rounded-lg" />
            <div className="flex flex-col gap-2 w-full">
              <div className="h-6 bg-gray-300 rounded w-3/4" />
              <div className="h-4 bg-gray-300 rounded w-1/2" />
              <div className="h-4 bg-gray-300 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    ),
  }
);

const ContactCard = dynamic(
  () => import("../../../components/contactos/ContactCard"),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse flex gap-2 items-center p-2 md:p-4 border-[1px] border-[#0001] shadow-lg rounded-lg">
        <div className="min-w-[75px] h-[75px] bg-gray-300 rounded-lg" />
        <div className="flex flex-col gap-2 w-full">
          <div className="h-6 bg-gray-300 rounded w-3/4" />
          <div className="h-4 bg-gray-300 rounded w-1/2" />
          <div className="h-4 bg-gray-300 rounded w-1/4" />
        </div>
      </div>
    ),
  }
);

const LoadMoreButton = dynamic(
  () => import("../../../components/ui/LoadMoreButton"),
  {
    ssr: false,
  }
);

// 🔹 Helper: absolut Y-position på siden
const getElementPageY = (el) => {
  let y = 0;
  let node = el;

  while (node) {
    y += node.offsetTop || 0;
    node = node.offsetParent;
  }

  return y;
};

// Vælg hvid/sort tekst ud fra baggrundsfarven (luminans)
const getTextColorForBackground = (hexColor) => {
  if (!hexColor) return "#1f2937";
  const c = hexColor.replace("#", "");
  if (c.length !== 6) return "#1f2937";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1f2937" : "#fff";
};

const ExpandableDescription = React.memo(function ExpandableDescription({
  description,
  maxLength = 40,
  onDark = true,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  if (!description) return null;
  const shouldTruncate = description.length > maxLength;
  const displayText =
    shouldTruncate && !isExpanded
      ? description.substring(0, maxLength) + "..."
      : description;

  return (
    <div className="mt-1">
      <p
        className={`text-sm drop-shadow leading-relaxed ${
          onDark ? "text-white/90" : "text-slate-900/90"
        }`}
      >
        {displayText}
        {shouldTruncate && (
          <button
            onClick={() => setIsExpanded((v) => !v)}
            className={`ml-1 underline text-xs font-medium ${
              onDark
                ? "text-white/80 hover:text-white"
                : "text-slate-900/80 hover:text-slate-900"
            }`}
          >
            {isExpanded ? "Ver menos" : "Ver más"}
          </button>
        )}
      </p>
    </div>
  );
});

const CompanyHeroSection = React.memo(function CompanyHeroSection({
  company,
  jobsLength,
  contactsLength,
  locationText,
  actualizado,
}) {
  const base = company.color || "#e7e7e7";
  const heroTextColor = getTextColorForBackground(base);
  const onDark = heroTextColor === "#fff";

  return (
    <header
      className="text-gray-600 mb-4 min-h-32 border-b p-4"
      style={{
        borderBottomColor: base,
        background: `
          linear-gradient(180deg, ${base} 0 20%, transparent 20% 100%),
          radial-gradient(1000px 320px at 90% -80px, rgba(255,255,255,.14), rgba(255,255,255,0) 60%),
          linear-gradient(180deg, ${base} 0 20%, #fff 85%)
        `,
      }}
    >
      <div className="flex gap-4">
        <div
          className="rounded-lg shadow-md border w-20 h-20 flex-shrink-0 flex justify-center items-center"
          style={{
            backgroundColor: base,
            borderColor: heroTextColor,
            boxShadow:
              "0 4px 12px rgba(0,0,0,.12), 0 0 4px rgba(0,0,0,.08)",
          }}
        >
          <img
            src={company.logo_url || "/company-logo.png"}
            alt={`${company.name} logo`}
            className="h-full w-full object-contain rounded-lg"
          />
        </div>

        <div className="flex flex-col w-full gap-1 justify-between relative -top-[0px]">
          <h1
            className={`text-xl font-bold drop-shadow-lg ${
              onDark ? "text-white" : "text-gray-800"
            }`}
          >
            {company.name}
          </h1>
          <ExpandableDescription
            description={company.short_description}
            maxLength={25}
            onDark={onDark}
          />
          <div className="flex items-center gap-1 relative mt-1">
            <svg
              className={`w-4 h-4 ${
                onDark ? "text-white/80" : "text-gray-800/80"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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
            <span
              className={`${
                onDark ? "text-white" : "text-gray-800"
              } text-sm drop-shadow`}
            >
              {locationText}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-1 mt-4 justify-center">
        <div className="flex items-center p-2 md:p-2 rounded-lg bg-white border border-gray-300 w-[6.5rem] md:w-[7.5rem]">
          <div className="flex flex-col text-xs">
            <span>Contactos</span>
            <span className="font-bold">{contactsLength || 0} verificados</span>
          </div>
        </div>
        <div className="flex items-center p-2 md:p-2 rounded-lg bg-white border border-gray-300 w-[6.5rem] md:w-[7.5rem]">
          <div className="flex flex-col text-xs">
            <span>Empleos</span>
            {/* (Bevidst) hårdkodet tekst beholdes */}
            <span className="font-bold">321 activas</span>
          </div>
        </div>
        <div className="flex items-center p-2 md:p-2 rounded-lg bg-white border border-gray-300 w-[6.5rem] md:w-[7.5rem]">
          <div className="flex flex-col text-xs">
            <span>Actualizado</span>
            <span className="font-bold">{actualizado}</span>
          </div>
        </div>
      </div>
    </header>
  );
});

const StickyApplyFooter = React.memo(function StickyApplyFooter({
  onEditScroll,
}) {
  // Stabil i Strict Mode
  const activeCountRef = useRef(Math.floor(Math.random() * 5) + 1);
  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-50 border-t border-gray-200 py-2 px-2 shadow-lg backdrop-blur-lg bg-white/70"
      style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          background:
            "linear-gradient(135deg, var(--brand, #5E3FA6), var(--brand-2, #B276CA) 55%, var(--brand-3, #FF8AD8))",
        }}
      />
      <div className="container max-w-screen-md mx-auto">
        <div className="flex flex-col gap-0">
          <div className="flex justify-center -mb-1 mt-1">
            <div className="inline-flex items-center mb-0 gap-0 bg-green-100 text-green-800 font-semibold text-sm px-3 py-1 rounded-xl shadow-sm">
              <span className="mr-1">🟢 </span>
              <span> {activeCountRef.current} reclutadores activos ahora</span>
            </div>
          </div>
          <button
            onClick={() => onEditScroll("elige-tu-oportunidad")}
            className="mt-3 w-full border border-gray-200 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            style={{
              background:
                "linear-gradient(135deg, var(--brand, #5E3FA6), var(--brand-2, #B276CA) 55%, var(--brand-3, #FF8AD8))",
            }}
          >
            🚀 VER OPORTUNIDADES
          </button>
        </div>
      </div>
    </div>
  );
});

export default function CompanyDetailsClient({ params }) {
  const { company_name } = params;
  const router = useRouter();
  const { setHasStickyFooter, setStickyFooterHeight } = useStickyFooter();
  const [isPending, startTransition] = useTransition();

  // ---------- STATE ----------
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [company, setCompany] = useState(null);
  const companyId = company?.id ?? null;

  const [jobs, setJobs] = useState([]);
  const [jobsPagination, setJobsPagination] = useState({
    page: 1,
    limit: 7,
    total: 0,
    totalPages: 0,
  });
  const [contacts, setContacts] = useState([]);
  const [contactsPagination, setContactsPagination] = useState({
    page: 1,
    limit: 2,
    total: 0,
    totalPages: 0,
  });

  const [loadingJobs, setLoadingJobs] = useState(false);
  const [loadingMoreJobs, setLoadingMoreJobs] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingMoreContacts, setLoadingMoreContacts] = useState(false);

  const [chosenCity, setChosenCity] = useState("");
  const [chosenCountry, setChosenCountry] = useState("");
  const [locationText, setLocationText] = useState("Location unavailable.");
  const [actualizado, setActualizado] = useState("—");

  // AbortControllers
  const jobsAbortRef = useRef(null);
  const contactsAbortRef = useRef(null);

  // Sentinel til lazy-load af kontakter
  const contactsSentinelRef = useRef(null);
  const contactsLoadedOnceRef = useRef(false);

  // Prefetch knapper
  const seeAllJobsBtnRef = useRef(null);
  const moreContactsBtnRef = useRef(null);

  // 🔥 Scroll til sektion med 80px offset
  const onEditScroll = useCallback((id) => {
    if (typeof window === "undefined") return;
    const el = document.getElementById(id);
    if (!el) return;

    const headerOffset = 80;
    const elementY = getElementPageY(el);
    const targetY = elementY - headerOffset;

    window.scrollTo({
      top: targetY < 0 ? 0 : targetY,
      behavior: "smooth",
    });
  }, []);

  // 🔥 GEO-display: Nu med GeoText komponent integration
  const locationDisplay = useMemo(() => {
    const txt = (locationText || "").trim();

    // 1. Tjek for placeholders - Hvis fundet, brug GeoText
    if (txt.includes("[[GEO_LABEL]]") || txt.includes("[[GEO")) {
      // Fallback til city/country hvis middleware ikke er klar, ellers default tekst
      const fallback =
        chosenCity && chosenCountry
          ? `${chosenCity}, ${chosenCountry}`
          : "Ubicación no disponible";

      return <GeoText type="label" fallback={fallback} />;
    }

    const isMissing =
      !txt ||
      txt === "Location unavailable." ||
      txt === "Ubicación no disponible" ||
      txt === "No disponible en tu ubicación";

    if (isMissing) {
      // 2. Hvis vi har data fra jobs-API'et, brug det
      if (chosenCity && chosenCountry) {
        return `${chosenCity}, ${chosenCountry}`;
      }

      // 3. Fallback til GeoText (User Location) hvis intet andet findes
      return <GeoText type="label" fallback="Ubicación no disponible" />;
    }

    // 4. Hvis det er statisk tekst (f.eks. "Madrid, Spain"), vis det bare
    return txt;
  }, [locationText, chosenCity, chosenCountry]);

  // --- DATA LOADERS ---------------------------------------------------------
  const loadCompany = useCallback(async (companyIdentifier) => {
    try {
      setLoading(true);
      setError(null);

      const response = await companiesService.getCompany(companyIdentifier);

      if (response?.success) {
        const data = response.data;
        setCompany(data.company);

        // Gem locationText fra API, selvom det indeholder [[GEO_..]], så vi kan håndtere det i useMemo
        if (typeof data.locationText === "string") {
          setLocationText(data.locationText);
        }

        try {
          sessionStorage.setItem("companyId", String(data.company.id));
        } catch {
          // ignore
        }
        return data;
      }

      setError(
        "Failed to load company: " + (response?.error || "Unknown error")
      );
      return null;
    } catch (err) {
      setError("Failed to load company: " + (err?.message || "Unknown error"));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCompanyJobs = useCallback(
    async (cid, isLoadMore = false) => {
      if (jobsAbortRef.current) jobsAbortRef.current.abort();
      jobsAbortRef.current = new AbortController();
      const signal = jobsAbortRef.current.signal;

      try {
        if (isLoadMore) setLoadingMoreJobs(true);
        else setLoadingJobs(true);
        setError(null);

        const params = {
          page: isLoadMore ? jobsPagination.page : 1,
          limit: jobsPagination.limit,
          company_id: cid,
        };
        const response = await jobsService.getJobs(params, { signal });

        if (response?.success) {
          let newJobs = response.data?.jobs || [];

          // 🔹 Opdater geo-data til fallback
          setChosenCity(response.data?.chosenCity || "");
          setChosenCountry(response.data?.countryName || "");

          // 🔥 FIX: Pre-process job data. Hvis job's location indeholder [[GEO_LABEL]],
          // injicer en `resolved_location` React component med GeoText.
          const processedNewJobs = newJobs.map((job) => {
            const jobLocationText = job.location_text || job.location || "";

            if (
              typeof jobLocationText === "string" &&
              (jobLocationText.includes("[[GEO_LABEL]]") ||
                jobLocationText.includes("[[GEO"))
            ) {
              const fallbackLocation =
                job.city && job.country
                  ? `${job.city}, ${job.country}`
                  : chosenCity && chosenCountry
                  ? `${chosenCity}, ${chosenCountry}`
                  : "Ubicación no disponible";

              return {
                ...job,
                resolved_location: (
                  <GeoText type="label" fallback={fallbackLocation} />
                ),
              };
            }

            return job; // Returnér job uændret hvis ingen placeholder findes
          });
          // END FIX

          if (isLoadMore) setJobs((prev) => [...prev, ...processedNewJobs]);
          else setJobs(processedNewJobs);

          if (response.meta?.pagination) {
            setJobsPagination((prev) => ({
              ...prev,
              total: response.meta.pagination.total || 0,
              totalPages: response.meta.pagination.totalPages || 0,
            }));
          }
        } else {
          setError(
            "Failed to load jobs: " + (response?.error || "Unknown error")
          );
          if (!isLoadMore) setJobs([]);
        }
      } catch (err) {
        if (err?.name !== "AbortError") {
          setError("Failed to load jobs: " + (err?.message || "Unknown error"));
          if (!isLoadMore) setJobs([]);
        }
      } finally {
        if (isLoadMore) setLoadingMoreJobs(false);
        else setLoadingJobs(false);
      }
    },
    [jobsPagination.page, jobsPagination.limit, chosenCity, chosenCountry]
  );

  const loadCompanyContacts = useCallback(
    async (cid, isLoadMore = false) => {
      if (contactsAbortRef.current) contactsAbortRef.current.abort();
      contactsAbortRef.current = new AbortController();
      const signal = contactsAbortRef.current.signal;

      try {
        if (isLoadMore) setLoadingMoreContacts(true);
        else setLoadingContacts(true);
        setError(null);

        const params = {
          page: isLoadMore ? contactsPagination.page : 1,
          limit: contactsPagination.limit,
          company_id: cid,
        };
        const response = await contactsService.getContacts(params, { signal });

        if (response?.success) {
          const newContacts = response.data?.contacts || [];
          if (isLoadMore) setContacts((prev) => [...prev, ...newContacts]);
          else setContacts(newContacts);

          if (response.meta?.pagination) {
            setContactsPagination((prev) => ({
              ...prev,
              total: response.meta.pagination.total || 0,
              totalPages: response.meta.pagination.totalPages || 0,
            }));
          }
        } else {
          setError(
            "Failed to load contacts: " +
              (response?.error || "Unknown error")
          );
          if (!isLoadMore) setContacts([]);
        }
      } catch (err) {
        if (err?.name !== "AbortError") {
          setError(
            "Failed to load contacts: " +
              (err?.message || "Unknown error")
          );
          if (!isLoadMore) setContacts([]);
        }
      } finally {
        if (isLoadMore) setLoadingMoreContacts(false);
        else setLoadingContacts(false);
      }
    },
    [contactsPagination.page, contactsPagination.limit]
  );

  // --- PAGINATION HANDLERS --------------------------------------------------
  const handleLoadMoreJobs = () => {
    if (
      jobsPagination.page < jobsPagination.totalPages &&
      !loadingMoreJobs &&
      companyId
    ) {
      startTransition(() =>
        setJobsPagination((prev) => ({ ...prev, page: prev.page + 1 }))
      );
    }
  };

  const handleLoadMoreContacts = () => {
    if (
      contactsPagination.page < contactsPagination.totalPages &&
      !loadingMoreContacts &&
      companyId
    ) {
      startTransition(() =>
        setContactsPagination((prev) => ({ ...prev, page: prev.page + 1 }))
      );
    }
  };

  // --- EFFECTS --------------------------------------------------------------
  useEffect(() => {
    setHasStickyFooter(true);
    setStickyFooterHeight(70);
    return () => {
      setHasStickyFooter(false);
      setStickyFooterHeight(0);
      if (jobsAbortRef.current) jobsAbortRef.current.abort();
      if (contactsAbortRef.current) contactsAbortRef.current.abort();
    };
  }, [setHasStickyFooter, setStickyFooterHeight]);

  // Meta (beholdt som klient-side ændring)
  useEffect(() => {
    if (!company) return;
    document.title = `${company.name} - Perfil de la empresa | EmpleoSafari`;
    const metaDescription = document.querySelector(
      'meta[name="description"]'
    );
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        `Conoce más sobre ${company.name}. ${
          company.short_description || ""
        } Mira las vacantes disponibles e información de la empresa.`
      );
    }
  }, [company?.name, company?.short_description]);

  // --- Actualizado cache (4h TTL + random minutos) ---
  useEffect(() => {
    if (typeof window === "undefined") return;

    const key = "actualizado_cache";
    const ttl = 4 * 60 * 60 * 1000; // 4 hours
    const now = Date.now();
    let label;

    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const saved = JSON.parse(cached);
        if (now - saved.time < ttl) {
          label = saved.value;
        }
      }
    } catch (err) {
      console.warn("Failed to read actualizado cache:", err);
    }

    if (!label) {
      const rnd = Math.floor(Math.random() * 180) + 1; // 1–180 min
      label = `hace ${rnd} min`;
      try {
        localStorage.setItem(key, JSON.stringify({ time: now, value: label }));
      } catch (err) {
        console.warn("Failed to save actualizado cache:", err);
      }
    }

    setActualizado(label);
  }, []);

  // Initial company load (fast path: try cached id first)
  useEffect(() => {
    const run = async () => {
      let cachedCompanyId = null;
      try {
        cachedCompanyId =
          typeof sessionStorage !== "undefined"
            ? sessionStorage.getItem("companyId")
            : null;
      } catch {
        // ignore
      }
      const companyIdentifier = cachedCompanyId || company_name;
      const loaded = await loadCompany(companyIdentifier);
      if (loaded) {
        setJobsPagination((p) => ({ ...p, page: 1 }));
        setContactsPagination((p) => ({ ...p, page: 1 }));
      }
    };
    run();
  }, [loadCompany, company_name]);

  // Load jobs when companyId available or page changes
  useEffect(() => {
    if (!companyId) return;
    const isLoadMore = jobsPagination.page > 1;
    loadCompanyJobs(companyId, isLoadMore);
  }, [companyId, jobsPagination.page, loadCompanyJobs]);

  // ⚠️ Defer contacts: only fetch when section is near viewport OR on idle
  useEffect(() => {
    if (!companyId || contactsLoadedOnceRef.current) return;

    const fetchContacts = () => {
      if (contactsLoadedOnceRef.current) return;
      contactsLoadedOnceRef.current = true;
      loadCompanyContacts(companyId, false);
    };

    if (typeof window === "undefined") {
      fetchContacts();
      return;
    }

    const idleId =
      "requestIdleCallback" in window
        ? window.requestIdleCallback(() => fetchContacts(), { timeout: 2500 })
        : window.setTimeout(fetchContacts, 1800);

    const sentinel = contactsSentinelRef.current;
    let observer;
    if (sentinel && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              fetchContacts();
              observer.disconnect();
              break;
            }
          }
        },
        { rootMargin: "400px 0px" }
      );
      observer.observe(sentinel);
    }

    return () => {
      if (idleId) {
        if ("cancelIdleCallback" in window) {
          window.cancelIdleCallback(idleId);
        } else {
          window.clearTimeout(idleId);
        }
      }
      if (observer) observer.disconnect();
    };
  }, [companyId, loadCompanyContacts]);

  // React to contacts pagination changes (after initial defer has run)
  useEffect(() => {
    if (!companyId) return;
    if (!contactsLoadedOnceRef.current) return;
    const isLoadMore = contactsPagination.page > 1;
    loadCompanyContacts(companyId, isLoadMore);
  }, [companyId, contactsPagination.page, loadCompanyContacts]);

  // Prefetch ruter når CTA-knapper er tæt på viewport
  useEffect(() => {
    if (!companyId) return;

    const targets = [
      { ref: seeAllJobsBtnRef, path: `/empleos?company_id=${companyId}` },
      { ref: moreContactsBtnRef, path: `/contactos?company_id=${companyId}` },
    ];

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const item = targets.find((t) => t.ref.current === e.target);
            if (item) {
              router.prefetch(item.path);
            }
          }
        });
      },
      { rootMargin: "200px 0px" }
    );

    targets.forEach((t) => {
      if (t.ref.current) obs.observe(t.ref.current);
    });

    return () => obs.disconnect();
  }, [router, companyId]);

  if (loading) {
    return <CompanyPageSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 md:p-4">
        <div className="container max-w-screen-md mx-auto">
          <div className="bg-white shadow-lg p-4 rounded-lg">
            <div className="text-center py-8">
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Empresa no encontrada
              </h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => router.push("/empresas")}
                className="text-blue-500 hover:underline font-medium"
                onMouseEnter={() => router.prefetch("/empresas")}
              >
                ← Volver a empresas
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 md:p-4">
      <div className="container max-w-screen-md mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden p-2 md:p-4">
          {/* Company Hero Section */}
          <CompanyHeroSection
            company={company}
            jobsLength={jobsPagination.total}
            contactsLength={contactsPagination.total}
            locationText={locationDisplay}
            actualizado={actualizado}
          />

          {/* Jobs Section */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-4">
              {/* Anchor (vi bruger JS-offset, så pt/mt = 0) */}
              <div id="elige-tu-oportunidad" className="pt-[0px] -mt-[0px]">
                <h2 className="text-[#222] text-[18px] font-bold">
                  🚀 Elige tu oportunidad
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {jobsPagination.total > 0 && (
                  <button
                    ref={seeAllJobsBtnRef}
                    onClick={() =>
                      router.push(`/empleos?company_id=${companyId}`)
                    }
                    onMouseEnter={() =>
                      router.prefetch(`/empleos?company_id=${companyId}`)
                    }
                    className="text-xs text-blue-500 hover:text-blue-600 underline font-medium"
                  >
                    Ver todos
                  </button>
                )}
              </div>
            </div>

            {loadingJobs ? (
              <div className="space-y-2 md:space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse flex gap-2 items-center p-2 md:p-4 border-[1px] border-[#0001] shadow-lg rounded-lg"
                  >
                    <div className="min-w-[75px] h-[75px] bg-gray-300 rounded-lg" />
                    <div className="flex flex-col gap-2 w-full">
                      <div className="h-6 bg-gray-300 rounded w-3/4" />
                      <div className="h-4 bg-gray-300 rounded w-1/2" />
                      <div className="h-4 bg-gray-300 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : jobs.length > 0 ? (
              <>
                <JobsList
                  jobs={jobs}
                  loadingMore={loadingMoreJobs || isPending}
                  // location={locationDisplay} // Den er fjernet, da den kun var for virksomhedens primære placering. JobsList skal selv håndtere job-lokationer.
                  clickable={true}
                />
                <LoadMoreButton
                  onLoadMore={handleLoadMoreJobs}
                  hasMore={jobsPagination.page < jobsPagination.totalPages}
                  isLoading={loadingMoreJobs || isPending}
                />
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No hay oportunidades por ahora.</p>
                <p className="text-sm text-gray-500 mt-2">
                  ¡Vuelve pronto para nuevas oportunidades!
                </p>
              </div>
            )}
          </div>

          {/* Contacts Section (deferred) */}
          <div className="mb-2" ref={contactsSentinelRef}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-[#222] text-[18px] font-bold">
                🔒 {contactsPagination.total} contactos verificados
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-gray-700 font-medium" />
              </div>
            </div>

            {loadingContacts ? (
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse flex gap-2 items-center p-2 md:p-4 border-[1px] border-[#0001] shadow-lg rounded-lg"
                  >
                    <div className="min-w-[75px] h-[75px] bg-gray-300 rounded-lg" />
                    <div className="flex flex-col gap-2 w-full">
                      <div className="h-6 bg-gray-300 rounded w-3/4" />
                      <div className="h-4 bg-gray-300 rounded w-1/2" />
                      <div className="h-4 bg-gray-300 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : contacts.length > 0 ? (
              <>
                <ContactCard contact={contacts[0]} />
                {contacts.length > 1 && (
                  <div className="flex justify-center mt-4">
                    <button
                      ref={moreContactsBtnRef}
                      onClick={() =>
                        router.push(`/contactos?company_id=${companyId}`)
                      }
                      onMouseEnter={() =>
                        router.prefetch(`/contactos?company_id=${companyId}`)
                      }
                      className="bg-[#f0f0f0] text-sm text-black px-4 py-2 rounded-md border-none transition-all duration-200 cursor-pointer hover:bg-[#e0e0e0]"
                    >
                      Mostrar más contactos
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">
                  No hay contactos disponibles en esta empresa en este momento.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  ¡Vuelve pronto para nuevos contactos!
                </p>
              </div>
            )}
          </div>

          {/* Description Section */}
          <div className="p-0 mb-2">
            <h2 className="text-[#222] text-[18px] font-bold mb-4 mt-3">
              🏢 Descripción de la empresa
            </h2>
            <div
              className="mt-1 border-l-[3px] pl-3 mr-2"
              style={{ borderLeftColor: company.color || "#e7e7e7" }}
            >
              {company.short_description && (
                <p className="text-base text-gray-600 font-bold">
                  {company.short_description}
                </p>
              )}
              <div className="mt-2 text-sm text-gray-600 space-y-2">
                {(company.full_description || "")
                  .split("\n")
                  .filter((line) => line.trim())
                  .map((paragraph, index) => (
                    <p key={index} className="leading-relaxed">
                      {paragraph.trim()}
                    </p>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <StickyApplyFooter onEditScroll={onEditScroll} />
    </div>
  );
}
