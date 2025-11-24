// src/app/empresa/[company_name]/CompanyJobs.client.js
"use client";

import React, { useState, useCallback, useEffect, useRef, useTransition } from "react";
import dynamic from "next/dynamic";
import jobsService from "../../../services/jobsService";

// ——— Shimmer helpers (lokalt, ingen global CSS) ———
function ShimmerBlock({ className = "" }) {
  const style = { position: "relative", overflow: "hidden", background: "#e5e7eb" };
  const afterStyle = {
    content: '""',
    position: "absolute",
    inset: 0,
    transform: "translateX(-100%)",
    background:
      "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.6) 50%, rgba(255,255,255,0) 100%)",
    animation: "es-shimmer-move 1.2s infinite linear",
  };
  return (
    <div className={className} style={style}>
      <style>{`@keyframes es-shimmer-move { 100% { transform: translateX(100%); } }`}</style>
      <div style={afterStyle} aria-hidden />
    </div>
  );
}

function ShimmerJobCard() {
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

function ShimmerList({ count = 3 }) {
  return (
    <div className="space-y-2 md:space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerJobCard key={`shim-${i}`} />
      ))}
    </div>
  );
}

// ⬇️ Add shimmer fallbacks to prevent layout collapse while chunks load
const JobsList = dynamic(() => import("../../../components/empleos/JobsList"), {
  ssr: false,
  loading: () => <ShimmerList count={3} />,
});

const LoadMoreButton = dynamic(() => import("../../../components/ui/LoadMoreButton"), {
  ssr: false,
  loading: () => <ShimmerBlock className="h-[42px] w-full rounded-md border-[1px] border-[#0001]" />,
});

export default function CompanyJobs({ companyId, initialJobs, initialPagination, locationText }) {
  const [isPending, startTransition] = useTransition();

  const [jobs, setJobs] = useState(initialJobs || []);
  const [pagination, setPagination] = useState(
    initialPagination || { page: 1, limit: 7, total: 0, totalPages: 0 }
  );
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const abortRef = useRef(null);

  const load = useCallback(
    async (isLoadMore = false) => {
      if (!companyId) return;
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;

      try {
        if (isLoadMore) setLoadingMore(true);
        else setLoading(true);

        const params = {
          page: isLoadMore ? pagination.page : 1,
          limit: pagination.limit,
          company_id: companyId,
        };

        const res = await jobsService.getJobs(params, { signal });

        if (res?.success) {
          const newJobs = res.data?.jobs || [];
          if (isLoadMore) setJobs((prev) => [...prev, ...newJobs]);
          else setJobs(newJobs);

          if (res.meta?.pagination) {
            setPagination((prev) => ({
              ...prev,
              total: res.meta.pagination.total || 0,
              totalPages: res.meta.pagination.totalPages || 0,
            }));
          }
        } else {
          if (!isLoadMore) setJobs([]);
        }
      } catch (e) {
        if (e?.name !== "AbortError") {
          if (!isLoadMore) setJobs([]);
        }
      } finally {
        if (isLoadMore) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [companyId, pagination.page, pagination.limit]
  );

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const handleLoadMore = () => {
    if (pagination.page < pagination.totalPages && !loadingMore && companyId) {
      startTransition(() => setPagination((p) => ({ ...p, page: p.page + 1 })));
    }
  };

  useEffect(() => {
    if (pagination.page > 1) load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page]);

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-4">
        <h2 id="elige-tu-oportunidad">
          👇 <span className='text-lg max-[393px]:text-[16px] font-extrabold leading-snug text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand,#5E3FA6)] via-[var(--brand-2,#B276CA)] to-[var(--brand-3,#5E3FA6)]'>Paso 1 de 2: Elige tu próximo empleo:</span>
        </h2>
        <div className="flex items-center gap-2"></div>
      </div>

      <div className={loading && jobs.length === 0 ? "min-h-[360px]" : ""}>
        {loading && jobs.length === 0 ? (
          <ShimmerList count={3} />
        ) : jobs.length > 0 ? (
          <>
            <JobsList jobs={jobs} loadingMore={loadingMore || isPending} location={locationText} clickable />
            <LoadMoreButton
              onLoadMore={handleLoadMore}
              hasMore={pagination.page < pagination.totalPages}
              isLoading={loadingMore || isPending}
            />
            {(loadingMore || isPending) && <div className="mt-2"><ShimmerList count={2} /></div>}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">No hay oportunidades por ahora.</p>
            <p className="text-sm text-gray-500 mt-2">¡Vuelve pronto para nuevas oportunidades!</p>
          </div>
        )}
      </div>
    </div>
  );
}
