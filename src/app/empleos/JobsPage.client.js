"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import jobService from "../../services/jobsService";
import PageSkeleton from "../../components/empleos/PageSkeleton";
import SearchSection from "../../components/search/SearchSection";
import JobsList from "../../components/empleos/JobsList";
import LoadMoreButton from "../../components/ui/LoadMoreButton";
import { saveItem } from "../../utils/localStorage";

/* ---------- Cookie helper (til geo-override fra worker) ---------- */
function readCookie(name) {
  try {
    const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : "";
  } catch {
    return "";
  }
}

function ShimmerOverlay({ show }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-md transition-opacity duration-150"
      style={{
        opacity: show ? 1 : 0,
        background:
          "linear-gradient(90deg, rgba(245,245,246,0) 0%, rgba(245,245,246,.9) 50%, rgba(245,245,246,0) 100%)",
        backgroundSize: "200% 100%",
        animation: show ? "esShimmer 1.25s linear infinite" : "none",
      }}
    />
  );
}

// Read URL params without useSearchParams (no Suspense requirement)
function readURLParams() {
  try {
    const usp = new URLSearchParams(window.location.search);
    return {
      q: usp.get("q") || "",
      country: usp.get("country") || "",
      companyId: usp.get("company_id") || "",
    };
  } catch {
    return { q: "", country: "", companyId: "" };
  }
}

export default function JobsPageClient({
  initialJobs,
  initialPagination,
  initialSearchKey = "",
  initialCountry = "",
  initialChosenCity = "",
  initialChosenCountry = "",
  initialLocationText = "",
  reserveHeightPx = 0,
}) {
  const router = useRouter();

  // SSR -> client state
  const [jobs, setJobs] = useState(initialJobs);
  const [pagination, setPagination] = useState(initialPagination);
  const [searchKey, setSearchKey] = useState(initialSearchKey);
  const [country, setCountry] = useState(initialCountry);
  const [chosenCity, setChosenCity] = useState(initialChosenCity);
  const [chosenCountry, setChosenCountry] = useState(initialChosenCountry);
  const [locationText, setLocationText] = useState(initialLocationText);
  const [error, setError] = useState(null);

  const [loadingFirstQuery, setLoadingFirstQuery] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Track current URL state locally
  const urlStateRef = useRef({ q: "", country: "", companyId: "" });

  /* ---------- Klient-override af lokation fra worker-cookies ---------- */
  useEffect(() => {
    const label = readCookie("__geo_label"); // fx "León, México"
    const city = readCookie("__geo_city");   // fx "León"
    const cc = readCookie("__geo_cc");       // fx "MX"

    if (label) {
      if (label !== locationText) setLocationText(label);
      const parts = label.split(",").map((s) => s.trim());
      if (parts[0]) setChosenCity(parts[0]);
      if (parts[1]) setChosenCountry(parts[1]);
      return;
    }

    if (city || cc) {
      const fallback = [city, cc].filter(Boolean).join(", ");
      if (fallback && fallback !== locationText) {
        setLocationText(fallback);
        if (city) setChosenCity(city);
        if (cc) setChosenCountry(cc);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // kun på client mount

  /* ---------- VIGTIGT: Refetch jobs på mount, hvis geo-cookie findes og URL IKKE har country ---------- */
  const didGeoRefetch = useRef(false);
  useEffect(() => {
    // Hvis URL allerede har country, respekter den (applyFromURL håndterer fetch)
    let urlHasCountry = false;
    try {
      const usp = new URLSearchParams(window.location.search);
      urlHasCountry = usp.has("country");
    } catch {}

    // Kun refetch hvis ingen country i URL (så SSR var "default") og vi har en geo-cookie
    const cc = readCookie("__geo_cc"); // fx "MX"
    if (!didGeoRefetch.current && !urlHasCountry && cc) {
      didGeoRefetch.current = true;
      (async () => {
        setLoadingFirstQuery(true);
        setError(null);
        try {
          // Ingen country i params -> worker injicerer country ud fra __geo_cc
          const res = await jobService.getJobs({
            page: 1,
            limit: pagination.limit || 7,
          });
          if (res?.success) {
            setJobs(res.data?.jobs || []);
            setPagination({
              page: 1,
              limit: pagination.limit || 7,
              total: res.meta?.pagination?.total || 0,
              totalPages: res.meta?.pagination?.totalPages || 0,
            });
            // Brug API’ets forståelse af country/city/label – fallback til cookies hvis tomt
            const apiCity = res.data?.chosenCity || "";
            const apiCountryName = res.data?.countryName || "";
            const apiLabel = res.data?.locationText || "";

            if (apiCity) setChosenCity(apiCity);
            if (apiCountryName) {
              setChosenCountry(apiCountryName);
              setCountry(apiCountryName);
            }
            if (apiLabel) setLocationText(apiLabel);
          }
        } catch (err) {
          setError(err?.message || "Failed to load jobs");
        } finally {
          setLoadingFirstQuery(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getLocation = useCallback(() => {
    if (
      locationText === "Ubicación no disponible." ||
      locationText === "No disponible en tu ubicación."
    ) {
      const place = [chosenCity, chosenCountry].filter(Boolean).join(", ");
      return place || "—";
    }
    return (
      locationText ||
      [chosenCity, chosenCountry].filter(Boolean).join(", ") ||
      "—"
    );
  }, [locationText, chosenCity, chosenCountry]);

  const containerStyle = useMemo(
    () => (reserveHeightPx ? { minHeight: `${reserveHeightPx}px` } : undefined),
    [reserveHeightPx]
  );

  // Initial mount + back/forward: read URL and fetch page=1 if filters present
  useEffect(() => {
    const applyFromURL = async () => {
      const next = readURLParams();
      const prev = urlStateRef.current;

      if (
        next.q === prev.q &&
        next.country === prev.country &&
        next.companyId === prev.companyId
      ) {
        return;
      }
      urlStateRef.current = next;

      setLoadingFirstQuery(true);
      setError(null);
      try {
        const res = await jobService.getJobs({
          page: 1,
          limit: pagination.limit || 7,
          ...(next.q && { search: next.q }),
          ...(next.country && { country: next.country }),
          ...(next.companyId && { company_id: next.companyId }),
        });

        if (res?.success) {
          setJobs(res.data?.jobs || []);
          setPagination({
            page: 1,
            limit: pagination.limit || 7,
            total: res.meta?.pagination?.total || 0,
            totalPages: res.meta?.pagination?.totalPages || 0,
          });
          setChosenCity(res.data?.chosenCity || "");
          setChosenCountry(res.data?.countryName || next.country || "");
          setLocationText(res.data?.locationText || "");
          setCountry(res.data?.countryName || next.country || "");
          setSearchKey(next.q || "");

          saveItem("jobsSearchTerms", {
            searchKey: next.q || "",
            country: res.data?.countryName || next.country || "",
          });
        } else {
          setJobs([]);
          setPagination((p) => ({ ...p, page: 1, total: 0, totalPages: 0 }));
          setError("Failed to load jobs");
        }
      } catch (err) {
        setJobs([]);
        setPagination((p) => ({ ...p, page: 1, total: 0, totalPages: 0 }));
        setError(err?.message || "Failed to load jobs");
      } finally {
        setLoadingFirstQuery(false);
      }
    };

    // Run on mount
    applyFromURL();

    // Handle back/forward
    const onPop = () => applyFromURL();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // controlled by urlStateRef + popstate

  // Load more (client)
  const handleLoadMore = useCallback(
    async () => {
      if (loadingMore || pagination.page >= pagination.totalPages) return;
      setLoadingMore(true);
      setError(null);
      try {
        const { q, country: c, companyId } = urlStateRef.current;
        const res = await jobService.getJobs({
          page: pagination.page + 1,
          limit: pagination.limit || 7,
          ...(q && { search: q }),
          ...(c && { country: c }),
          ...(companyId && { company_id: companyId }),
        });
        if (res?.success) {
          setJobs((prev) => [...prev, ...(res.data?.jobs || [])]);
          setPagination((prev) => ({
            ...prev,
            page: prev.page + 1,
            total: res.meta?.pagination?.total ?? prev.total,
            totalPages: res.meta?.pagination?.totalPages ?? prev.totalPages,
          }));
          setChosenCity(res.data?.chosenCity || chosenCity);
          setChosenCountry(res.data?.countryName || country || chosenCountry);
          setLocationText(res.data?.locationText || locationText);
        }
      } catch (err) {
        setError(err?.message || "Failed to load more");
      } finally {
        setLoadingMore(false);
      }
    },
    [loadingMore, pagination, chosenCity, chosenCountry, country, locationText]
  );

  // Search: update URL + local ref, then fetch page=1 immediately
  const handleSearchJobs = useCallback(
    async () => {
      const params = new URLSearchParams();
      if (searchKey) params.set("q", searchKey);
      if (country) params.set("country", country);

      const qs = params.toString();
      router.push(qs ? `/empleos?${qs}` : "/empleos");

      // Update ref & fetch immediately so we don't wait for popstate
      urlStateRef.current = {
        q: searchKey,
        country,
        companyId: urlStateRef.current.companyId || "",
      };

      setLoadingFirstQuery(true);
      setError(null);
      try {
        const res = await jobService.getJobs({
          page: 1,
          limit: pagination.limit || 7,
          ...(searchKey && { search: searchKey }),
          ...(country && { country }),
          ...(urlStateRef.current.companyId && {
            company_id: urlStateRef.current.companyId,
          }),
        });
        if (res?.success) {
          setJobs(res.data?.jobs || []);
          setPagination({
            page: 1,
            limit: pagination.limit || 7,
            total: res.meta?.pagination?.total || 0,
            totalPages: res.meta?.pagination?.totalPages || 0,
          });
          setChosenCity(res.data?.chosenCity || "");
          setChosenCountry(res.data?.countryName || country || "");
          setLocationText(res.data?.locationText || "");
          saveItem("jobsSearchTerms", {
            searchKey: searchKey || "",
            country: res.data?.countryName || country || "",
          });
        } else {
          setJobs([]);
          setPagination((p) => ({ ...p, page: 1, total: 0, totalPages: 0 }));
          setError("Failed to load jobs");
        }
      } catch (err) {
        setJobs([]);
        setPagination((p) => ({ ...p, page: 1, total: 0, totalPages: 0 }));
        setError(err?.message || "Failed to load jobs");
      } finally {
        setLoadingFirstQuery(false);
      }
    },
    [router, searchKey, country, pagination.limit]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 md:p-4">
      <div className="container max-w-screen-md mx-auto">
        <div className="bg-white shadow-lg p-2 md:p-4">
          <h2 className="text-lg md:text-xl font-black mb-2 mt-2 bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
            🎯 Seleccionado solo para ti
          </h2>

          <SearchSection
            category="jobs"
            search={handleSearchJobs}
            chosenCountry={chosenCountry}
            searchKey={searchKey}
            setSearchKey={setSearchKey}
            country={country}
            setCountry={setCountry}
          />

          <div className="flex justify-between items-center mb-4">
            <h2 className="text-gray-700 font-medium">
              {pagination.total} oportunidades en {chosenCity || "—"}
            </h2>
            <Link href="/empleos" className="text-xs text-blue-500 underline">
              Ver todos
            </Link>
          </div>

          <div className="relative rounded-lg" style={containerStyle}>
            <ShimmerOverlay show={loadingFirstQuery} />
            {!loadingFirstQuery ? (
              <>
                <JobsList
                  jobs={jobs}
                  loadingMore={loadingMore}
                  location={getLocation()}
                />
                <LoadMoreButton
                  onLoadMore={handleLoadMore}
                  hasMore={pagination.page < pagination.totalPages}
                  isLoading={loadingMore}
                />
                {error && (
                  <p className="mt-2 text-xs text-red-600">{String(error)}</p>
                )}
              </>
            ) : (
              <PageSkeleton />
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes esShimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
}
