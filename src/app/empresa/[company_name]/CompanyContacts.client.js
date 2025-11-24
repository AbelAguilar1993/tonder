// src/app/empresa/[company_name]/CompanyContacts.client.js
"use client";

import React, { useEffect, useRef, useState, useCallback, useTransition } from "react";
import dynamic from "next/dynamic";
import contactsService from "../../../services/contactsService";

const ContactCard = dynamic(() => import("../../../components/contactos/ContactCard"), { ssr: false });

// ——— Shimmer helpers (lokalt) ———
function ShimmerBlock({ className = "" }) {
  const style = { position: "relative", overflow: "hidden", background: "#e5e7eb" };
  const afterStyle = {
    content: '""', position: "absolute", inset: 0, transform: "translateX(-100%)",
    background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.6) 50%, rgba(255,255,255,0) 100%)",
    animation: "es-shimmer-move 1.2s infinite"
  };
  return (
    <div className={className} style={style}>
      <style>{`@keyframes es-shimmer-move { 100% { transform: translateX(100%); } }`}</style>
      <div style={afterStyle} aria-hidden />
    </div>
  );
}
function ShimmerContactCard() {
  return (
    <div className="flex gap-2 items-center p-2 md:p-4 border-[1px] border-[#0001] shadow-lg rounded-lg">
      <ShimmerBlock className="min-w-[75px] h-[75px] rounded-lg" />
      <div className="flex flex-col gap-2 w-full">
        <ShimmerBlock className="h-6 w-3/4 rounded" />
        <ShimmerBlock className="h-4 w-1/2 rounded" />
        <ShimmerBlock className="h-4 w-1/4 rounded" />
      </div>
    </div>
  );
}

export default function CompanyContacts({ companyId, initialTotal = 0 }) {
  const [contacts, setContacts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 2, total: initialTotal, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isPending, startTransition] = useTransition();

  const abortRef = useRef(null);
  const sentinelRef = useRef(null);
  const loadedOnceRef = useRef(false);

  const load = useCallback(async (isLoadMore = false) => {
    if (!companyId) return;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    try {
      if (isLoadMore) setLoadingMore(true); else setLoading(true);
      const params = { page: isLoadMore ? pagination.page : 1, limit: pagination.limit, company_id: companyId };
      const res = await contactsService.getContacts(params, { signal });

      if (res?.success) {
        const newContacts = res.data?.contacts || [];
        if (isLoadMore) setContacts((prev) => [...prev, ...newContacts]);
        else setContacts(newContacts);

        if (res.meta?.pagination) {
          setPagination((prev) => ({
            ...prev,
            total: res.meta.pagination.total || prev.total,
            totalPages: res.meta.pagination.totalPages || 0,
          }));
        }
      } else {
        if (!isLoadMore) setContacts([]);
      }
    } catch (e) {
      if (e?.name !== "AbortError") {
        if (!isLoadMore) setContacts([]);
      }
    } finally {
      if (isLoadMore) setLoadingMore(false); else setLoading(false);
    }
  }, [companyId, pagination.page, pagination.limit]);

  useEffect(() => {
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, []);

  // Defer første hentning (idle + sentinel)
  useEffect(() => {
    if (!companyId || loadedOnceRef.current) return;

    const fetchNow = () => {
      if (loadedOnceRef.current) return;
      loadedOnceRef.current = true;
      load(false);
    };

    const idleId = ("requestIdleCallback" in window)
      ? window.requestIdleCallback(fetchNow, { timeout: 2500 })
      : setTimeout(fetchNow, 1800);

    let obs;
    if (sentinelRef.current && "IntersectionObserver" in window) {
      obs = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            fetchNow();
            obs.disconnect();
            break;
          }
        }
      }, { rootMargin: "400px 0px" });
      obs.observe(sentinelRef.current);
    }

    return () => {
      if (idleId) {
        if ("cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
        else clearTimeout(idleId);
      }
      if (obs) obs.disconnect();
    };
  }, [companyId, load]);

  // Load more handler
  const handleMore = () => {
    if (pagination.page < pagination.totalPages && !loadingMore && companyId) {
      startTransition(() => setPagination((p) => ({ ...p, page: p.page + 1 })));
    }
  };

  useEffect(() => {
    if (!companyId) return;
    if (!loadedOnceRef.current) return;
    if (pagination.page > 1) load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page]);

  return (
    <div className="mb-2" ref={sentinelRef}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[#222] text-[18px] font-bold">🔒 {pagination.total} reclutadores verificados</h2>
        <div className="flex items-center gap-3"><span className="text-gray-700 font-medium" /></div>
      </div>

      <div className={loading && contacts.length === 0 ? "min-h-[220px]" : ""}>
        {loading && contacts.length === 0 ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => <ShimmerContactCard key={i} />)}
          </div>
        ) : contacts.length > 0 ? (
          <>
            <ContactCard contact={contacts[0]} />
            {contacts.length > 1 && (
              <div className="flex justify-center mt-4">
                <a
                  href={`/contactos?company_id=${companyId}`}
                  className="bg-[#f0f0f0] text-sm text-black px-4 py-2 rounded-md border-none transition-all duration-200 cursor-pointer hover:bg-[#e0e0e0]"
                >
                  Mostrar más reclutadores
                </a>
              </div>
            )}
            {(loadingMore || isPending) && (
              <div className="mt-3 space-y-4">
                {Array.from({ length: 1 }).map((_, i) => <ShimmerContactCard key={`more-${i}`} />)}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">No hay reclutadores disponibles en esta empresa en este momento.</p>
            <p className="text-sm text-gray-500 mt-2">¡Vuelve pronto para nuevos reclutadores!</p>
          </div>
        )}
      </div>
    </div>
  );
}
