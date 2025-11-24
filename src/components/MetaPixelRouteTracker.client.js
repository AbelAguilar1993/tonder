'use client';
import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function MetaPixelRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const didMount = useRef(false);

  useEffect(() => {
    const url = pathname + (searchParams?.toString() ? `?${searchParams}` : '');
    const key = '__pv_last_path';
    const prev = sessionStorage.getItem(key);

    // Skip første render: base-snippet har allerede skudt initial PageView
    if (!didMount.current) {
      sessionStorage.setItem(key, url);
      didMount.current = true;
      return;
    }

    // Dedupe: hvis vi allerede har tracket denne URL, så skip
    if (prev === url) return;
    sessionStorage.setItem(key, url);

    if (typeof window.fbq === 'function') {
      window.fbq('track', 'PageView'); // kun ved reelle route changes
    }
  }, [pathname, searchParams]);

  return null;
}
