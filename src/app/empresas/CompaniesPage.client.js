/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import companiesService from "../../services/companiesService";
import PageSkeleton from "../../components/empresas/PageSkeleton";
import CompaniesList from "../../components/empresas/CompaniesList";
import LoadMoreButton from "../../components/ui/LoadMoreButton";
import SearchSection from "../../components/search/SearchSection";
import { saveItem } from "../../utils/localStorage"; // ⬅️ loadItem fjernet
import Link from "next/link";

const isISO2 = (s) => /^[A-Z]{2}$/i.test(s || "");

// Lokal, sikker loader (undgår afhængighed til utils/localStorage)
function safeLoadItem(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Læs en robust default-kode i prioriteret rækkefølge:
 * 1) [[GEO_COUNTRY]] fra HTML rewriter (erstattes til f.eks. "MX")
 * 2) localStorage (kun hvis ISO2)
 */
function resolveInitialCountryCode() {
  try {
    const geo = "[[GEO_COUNTRY]]"; // CF rewriter indsætter "MX"/"CO" her
    if (isISO2(geo)) return geo.toUpperCase();
  } catch {}
  try {
    const saved = safeLoadItem("companiesSearchTerms");
    if (saved && isISO2(saved.country)) return saved.country.toUpperCase();
  } catch {}
  return "";
}

export default function CompaniesPageClient({
  initialCompanies,
  initialPagination,
  initialSearchKey = "",
  initialCountry = "",        // label til visning
  initialCountryCode = "",    // ISO2 fra server (hvis tilgængelig)
  initialChosenCity = "",
}) {
  const router = useRouter();

  const [companies, setCompanies] = useState(initialCompanies);
  const [pagination, setPagination] = useState(initialPagination);
  const [searchKey, setSearchKey] = useState(initialSearchKey);

  // VIGTIGT: country holdes som ISO2
  const [country, setCountry] = useState(
    isISO2(initialCountryCode) ? initialCountryCode.toUpperCase() : ""
  );
  const [chosenCity, setChosenCity] = useState(initialChosenCity);

  const [loadingMore, setLoadingMore] = useState(false);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    if (!country) {
      const fallback = resolveInitialCountryCode();
      if (fallback) setCountry(fallback);
    }
  }, [country]);

  const loadMore = useCallback(async () => {
    if (loadingMore || pagination.page >= pagination.totalPages) return;
    setLoadingMore(true);
    try {
      const res = await companiesService.getCompanies({
        page: pagination.page + 1,
        limit: pagination.limit,
        ...(searchKey && { search: searchKey }),
        ...(country && { country: country.toUpperCase() }), // ISO2 til API
      });

      if (res?.success) {
        const newCompanies = res.data?.companies || [];
        setCompanies((prev) => [...prev, ...newCompanies]);

        setPagination((prev) => ({
          ...prev,
          page: prev.page + 1,
          total: res.meta?.pagination?.total ?? prev.total,
          totalPages: res.meta?.pagination?.totalPages ?? prev.totalPages,
        }));

        setChosenCity(res.data?.chosenCity || chosenCity);

        // Gem ISO2 (ikke labels)
        saveItem("companiesSearchTerms", {
          searchKey,
          country: (country || "").toUpperCase(),
        });
      }
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, pagination, searchKey, country, chosenCity]);

  const handleLoadMore = () => loadMore();

  // Søg → ny SSR via URL (ISO2-kode i query)
  const handleSearchCompanies = () => {
    const params = new URLSearchParams();
    if (searchKey) params.set("q", searchKey);
    if (country) params.set("country", (country || "").toUpperCase());

    setNavigating(true);
    router.push(params.toString() ? `/empresas?${params}` : "/empresas");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 md:p-4">
      <div className="container max-w-screen-md mx-auto">
        {navigating ? (
          <PageSkeleton />
        ) : (
          <div className="bg-white shadow-lg p-2 md:p-4">
            <h2 className="text-lg md:text-xl font-black mb-2 mt-2 bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
              ⚡ Empresas con oportunidades
            </h2>

            <SearchSection
              category="companies"
              search={handleSearchCompanies}
              searchKey={searchKey}
              setSearchKey={setSearchKey}
              country={country} // ISO2 som value
              setCountry={(c) => setCountry((c || "").toUpperCase())}
            />

            <div className="flex justify-between items-center mb-4">
              <h2 className="text-gray-700 font-medium">
                {pagination.total} empresas en {chosenCity || "—"}
              </h2>
              <Link href="/empresas" className="text-xs text-blue-500 underline">
                Ver todos
              </Link>
            </div>

            <CompaniesList companies={companies} loadingMore={loadingMore} />

            <LoadMoreButton
              onLoadMore={handleLoadMore}
              hasMore={pagination.page < pagination.totalPages}
              isLoading={loadingMore}
            />
          </div>
        )}
      </div>
    </div>
  );
}
