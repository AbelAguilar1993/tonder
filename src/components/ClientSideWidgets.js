// src/components/ClientSideWidgets.js
"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

// Trackeren og modal’en må gerne være rene klient-øer
const MetaPixelRouteTracker = dynamic(
  () => import("./MetaPixelRouteTracker.client"),
  { ssr: false, loading: () => null }
);

const GlobalAuthModal = dynamic(
  () => import("./GlobalAuthModal"),
  { ssr: false, loading: () => null }
);

export default function ClientSideWidgets() {
  return (
    <>
      {/* små, isolerede Suspense-grænser (valgfrit) */}
      <Suspense fallback={null}>
        <MetaPixelRouteTracker />
      </Suspense>
      <Suspense fallback={null}>
        <GlobalAuthModal />
      </Suspense>
    </>
  );
}
