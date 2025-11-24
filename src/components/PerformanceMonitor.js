"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function PerformanceMonitor() {
  const pathname = usePathname();

  useEffect(() => {
    // Log navigation timing for development
    if (process.env.NODE_ENV === "development") {
      // const start = performance.now();

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "navigation") {
            console.log(`🚀 Navigation to ${pathname}:`, {
              domContentLoaded: `${
                entry.domContentLoadedEventEnd -
                entry.domContentLoadedEventStart
              }ms`,
              loadComplete: `${entry.loadEventEnd - entry.loadEventStart}ms`,
              total: `${entry.loadEventEnd - entry.navigationStart}ms`,
            });
          }
        }
      });

      observer.observe({ entryTypes: ["navigation"] });

      // Cleanup
      return () => {
        observer.disconnect();
      };
    }
  }, [pathname]);

  // This component doesn't render anything
  return null;
}
