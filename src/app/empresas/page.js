// src/app/empresas/page.js
import { Suspense } from "react";
import companiesService from "../../services/companiesService";
import CompaniesPageClient from "./CompaniesPage.client";
import PageSkeleton from "../../components/empresas/PageSkeleton";

export const dynamic = "error";

export default async function Page() {
  const page = 1, limit = 7;

  let initialCompanies = [];
  let initialPagination = { page, limit, total: 0, totalPages: 0 };
  let initialCountry = "", initialCountryCode = "", initialChosenCity = "", initialSearchKey = "";

  try {
    const res = await companiesService.getCompanies({ page, limit });
    if (res?.success) {
      initialCompanies = res.data?.companies || [];
      initialPagination = {
        page, limit,
        total: res.meta?.pagination?.total || 0,
        totalPages: res.meta?.pagination?.totalPages || 0,
      };
      initialCountry = res.data?.countryName || "";
      initialCountryCode = res.data?.countryCode || "";   // ⬅️ NY
      initialChosenCity = res.data?.chosenCity || "";
    }
  } catch {}

  const ROW_H = 92, MIN_ROWS = Math.max(1, initialCompanies.length || 6);
  const reserveHeightPx = ROW_H * MIN_ROWS;

  return (
    <Suspense fallback={<PageSkeleton />}>
      <CompaniesPageClient
        initialCompanies={initialCompanies}
        initialPagination={initialPagination}
        initialSearchKey={initialSearchKey}
        initialCountry={initialCountry}
        initialCountryCode={initialCountryCode}   // ⬅️ NY
        initialChosenCity={initialChosenCity}
        reserveHeightPx={reserveHeightPx}
      />
    </Suspense>
  );
}
