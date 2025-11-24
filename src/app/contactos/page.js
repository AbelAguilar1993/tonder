// src/app/contactos/page.js
import { Suspense } from "react";
import { contactsService } from "../../services/contactsService";
import ContactsPageClient from "./ContactsPage.client";
import PageSkeleton from "../../components/contactos/PageSkeleton";

export const revalidate = 80000; // 1 dag (ISR)

export const dynamic = "error";

export default async function Page() {
  const page = 1, limit = 7;

  let initialContacts = [];
  let initialPagination = { page, limit, total: 0, totalPages: 0 };
  let initialSearchKey = "", initialCountry = "", initialChosenCity = "", initialChosenCountry = "";

  try {
    const res = await contactsService.getContacts({ page, limit });
    if (res?.success) {
      initialContacts = res.data?.contacts || [];
      initialPagination = {
        page, limit,
        total: res.meta?.pagination?.total || 0,
        totalPages: res.meta?.pagination?.totalPages || 0,
      };
      initialCountry = res.data?.countryName || "";
      initialChosenCity = res.data?.chosenCity || "";
      initialChosenCountry = res.data?.countryName || "";
    }
  } catch {}

  const ROW_H = 88, MIN_ROWS = Math.max(1, initialContacts.length || 6);
  const reserveHeightPx = ROW_H * MIN_ROWS;

  return (
    <Suspense fallback={<PageSkeleton />}>
      <ContactsPageClient
        initialContacts={initialContacts}
        initialPagination={initialPagination}
        initialSearchKey={initialSearchKey}
        initialCountry={initialCountry}
        initialChosenCity={initialChosenCity}
        initialChosenCountry={initialChosenCountry}
        reserveHeightPx={reserveHeightPx}
      />
    </Suspense>
  );
}
