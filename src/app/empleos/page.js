import jobService from "../../services/jobsService";
import JobsPageClient from "./JobsPage.client";
import PageSkeleton from "../../components/empleos/PageSkeleton";

export const revalidate = 80000; // 1 dag (ISR)
export const dynamic = "error";  // hold ruten statisk/eksport-sikker

export default async function Page() {
  const page = 1, limit = 7;

  let initialJobs = [];
  let initialPagination = { page, limit, total: 0, totalPages: 0 };
  let initialSearchKey = "", initialCountry = "", initialChosenCity = "", initialChosenCountry = "", initialLocationText = "";

  try {
    const res = await jobService.getJobs({ page, limit });
    if (res?.success) {
      initialJobs = res.data?.jobs || [];
      initialPagination = {
        page, limit,
        total: res.meta?.pagination?.total || 0,
        totalPages: res.meta?.pagination?.totalPages || 0,
      };
      initialChosenCity = res.data?.chosenCity || "";
      initialChosenCountry = res.data?.countryName || "";
      initialCountry = res.data?.countryName || "";
      initialLocationText = res.data?.locationText || "";
    }
  } catch {
    // tom, men pænt SSR'et fallback
  }

  // Reserver højde => ingen “blink”/jitter ved hydration og fetch
  const ROW_H = 92;
  const MIN_ROWS = Math.max(1, initialJobs.length || 6);
  const reserveHeightPx = ROW_H * MIN_ROWS;

  // Ingen <Suspense> her — SSR-indholdet står fast
  return (
    <JobsPageClient
      initialJobs={initialJobs}
      initialPagination={initialPagination}
      initialSearchKey={initialSearchKey}
      initialCountry={initialCountry}
      initialChosenCity={initialChosenCity}
      initialChosenCountry={initialChosenCountry}
      initialLocationText={initialLocationText}
      reserveHeightPx={reserveHeightPx}
      ssrFallback={<PageSkeleton />} // valgfrit hvis du vil vise noget under 0-data
    />
  );
}
