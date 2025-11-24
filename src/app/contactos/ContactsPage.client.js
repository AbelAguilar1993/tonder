// src/app/contactos/ContactsPage.client.js
"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { contactsService } from "../../services/contactsService";
import PageSkeleton from "../../components/contactos/PageSkeleton";
import ContactsList from "../../components/contactos/ContactsList";
import LoadMoreButton from "../../components/ui/LoadMoreButton";
import SearchSection from "../../components/search/SearchSection";
import { saveItem } from "../../utils/localStorage";
import Link from "next/link";

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

export default function ContactsPageClient({
  initialContacts,
  initialPagination,
  initialSearchKey = "",
  initialCountry = "",
  initialChosenCity = "",
  initialChosenCountry = "",
  reserveHeightPx = 0,
}) {
  const router = useRouter();
  const sp = useSearchParams();

  // Hydrate with server data
  const [contacts, setContacts] = useState(initialContacts);
  const [pagination, setPagination] = useState(initialPagination);
  const [searchKey, setSearchKey] = useState(initialSearchKey);
  const [country, setCountry] = useState(initialCountry);
  const [chosenCity, setChosenCity] = useState(initialChosenCity);
  const [chosenCountry, setChosenCountry] = useState(initialChosenCountry);

  const [loadingFirstQuery, setLoadingFirstQuery] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const containerStyle = useMemo(
    () => (reserveHeightPx ? { minHeight: `${reserveHeightPx}px` } : undefined),
    [reserveHeightPx]
  );

  // React to URL (?q, ?country, ?company_id) — client fetch page 1 (export-safe)
  useEffect(() => {
    const q = sp.get("q") || "";
    const c = sp.get("country") || "";
    const companyId = sp.get("company_id") || "";

    (async () => {
      setLoadingFirstQuery(true);
      try {
        const res = await contactsService.getContacts({
          page: 1,
          limit: pagination.limit || 7,
          ...(q && { search: q }),
          ...(c && { country: c }),
          ...(companyId && { company_id: companyId }),
        });

        if (res?.success) {
          const newContacts = res.data?.contacts || [];
          setContacts(newContacts);
          setPagination({
            page: 1,
            limit: pagination.limit || 7,
            total: res.meta?.pagination?.total || 0,
            totalPages: res.meta?.pagination?.totalPages || 0,
          });
          setChosenCity(res.data?.chosenCity || "");
          setChosenCountry(res.data?.countryName || c || "");
          setCountry(res.data?.countryName || c || "");
          setSearchKey(q || "");

          saveItem("contactsSearchTerms", {
            searchKey: q || "",
            country: res.data?.countryName || c || "",
          });
        } else {
          setContacts([]);
          setPagination((p) => ({ ...p, page: 1, total: 0, totalPages: 0 }));
        }
      } finally {
        setLoadingFirstQuery(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  // Load more (client)
  const handleLoadMore = useCallback(async () => {
    if (loadingMore || pagination.page >= pagination.totalPages) return;
    setLoadingMore(true);
    try {
      const q = sp.get("q") || "";
      const c = sp.get("country") || "";
      const companyId = sp.get("company_id") || "";

      const res = await contactsService.getContacts({
        page: pagination.page + 1,
        limit: pagination.limit || 7,
        ...(q && { search: q }),
        ...(c && { country: c }),
        ...(companyId && { company_id: companyId }),
      });

      if (res?.success) {
        const more = res.data?.contacts || [];
        setContacts((prev) => [...prev, ...more]);
        setPagination((prev) => ({
          ...prev,
          page: prev.page + 1,
          total: res.meta?.pagination?.total ?? prev.total,
          totalPages: res.meta?.pagination?.totalPages ?? prev.totalPages,
        }));
        setChosenCity(res.data?.chosenCity || chosenCity);
        setChosenCountry(res.data?.countryName || country || chosenCountry);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, pagination, sp, chosenCity, chosenCountry, country]);

  // Search handler → update URL; fetching happens in effect above
  const handleSearchContacts = useCallback(() => {
    const params = new URLSearchParams();
    if (searchKey) params.set("q", searchKey);
    if (country) params.set("country", country);
    const existingCompany = sp.get("company_id");
    if (existingCompany) params.set("company_id", existingCompany);
    router.push(params.toString() ? `/contactos?${params}` : "/contactos");
  }, [router, searchKey, country, sp]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 md:p-4">
      <div className="container max-w-screen-md mx-auto">
        <div className="bg-white shadow-lg p-2 md:p-4">
          <h2 className="text-lg md:text-xl font-black mb-2 mt-2 bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
            🔑 Acceso a contactos verificados
          </h2>

          <SearchSection
            category="contacts"
            search={handleSearchContacts}
            chosenCountry={chosenCountry}
            searchKey={searchKey}
            setSearchKey={setSearchKey}
            country={country}
            setCountry={setCountry}
          />

          <div className="flex justify-between items-center mb-4">
            <h2 className="text-gray-700 font-medium">
              {pagination.total} contactos verificados en {chosenCity || "—"}
            </h2>
            <Link href="/contactos/" className="text-xs text-blue-500 underline">
              Ver todos
            </Link>
          </div>

          <div className="relative rounded-lg" style={containerStyle}>
            <ShimmerOverlay show={loadingFirstQuery} />
            {!loadingFirstQuery ? (
              <>
                <ContactsList contacts={contacts} loadingMore={loadingMore} />
                <LoadMoreButton
                  onLoadMore={handleLoadMore}
                  hasMore={pagination.page < pagination.totalPages}
                  isLoading={loadingMore}
                />
              </>
            ) : (
              <PageSkeleton />
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes esShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
