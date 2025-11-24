"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import Navigation from "./Navigation";
import Header from "./Header";
import Footer from "./Footer";
import { useStickyFooter } from "./StickyFooterContext";

export default function ConditionalLayout({ children }) {
  const pathname = usePathname();
  const { hasStickyFooter, stickyFooterHeight } = useStickyFooter();
  const scrollContainerRef = useRef(null);

  // Check if we're in the admin section
  const isAdminPage = pathname.startsWith("/admin");

  // Reset scroll position when pathname changes
  useEffect(() => {
    if (scrollContainerRef.current && !isAdminPage) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            top: 0,
            left: 0,
            behavior: "instant", // Use instant to avoid animation conflicts
          });
        }
      });
    }
  }, [pathname, isAdminPage]);

  // Additional effect to handle any remaining scroll restoration issues
  useEffect(() => {
    if (!isAdminPage && scrollContainerRef.current) {
      // Disable browser's default scroll restoration for this container
      if ("scrollRestoration" in history) {
        history.scrollRestoration = "manual";
      }

      return () => {
        // Restore default behavior when component unmounts
        if ("scrollRestoration" in history) {
          history.scrollRestoration = "auto";
        }
      };
    }
  }, [isAdminPage]);

  // If it's an admin page, return just the children without site layout
  if (isAdminPage) {
    return <>{children}</>;
  }

  // For all other pages, return the normal site layout
  return (
    <div
      ref={scrollContainerRef}
      className="overflow-y-auto h-screen flex flex-col"
    >
      <Header />
      <Navigation />
      <main className="grow bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 ">
        {children}
      </main>
      <Footer />
      {/* Add bottom padding when sticky footer is present */}
      {hasStickyFooter && (
        <div
          className="flex-shrink-0"
          style={{
            height: `calc(${stickyFooterHeight}px + env(safe-area-inset-bottom))`,
          }}
        />
      )}
    </div>
  );
}
