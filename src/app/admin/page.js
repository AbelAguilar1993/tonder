// server component
import { Suspense } from "react";
import AdminDashboardClient from "./AdminDashboardClient.client";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminDashboardClient />
    </Suspense>
  );
}
