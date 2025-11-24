"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useAuth } from "./AuthContext";

const navigationItems = [
  { name: "Empleos", href: "/empleos", icon: "💼" },
  { name: "Empresas", href: "/empresas", icon: "🏢" },
  { name: "Contactos", href: "/contactos", icon: "📞" },
];

const guideNavigation = { name: "Guía", href: "/guia", icon: "📖" };
const dashboardNavigation = { name: "Panel", href: "/panel", icon: "📊" };

const baseNavItemClasses =
  "flex items-center justify-center py-2 gap-2 rounded-xl text-xl font-medium text-center text-white grow border border-white/12 shadow-md bg-white/7 transition-all duration-300 hover:shadow-xl hover:translate-y-[-1px] hover:bg-white/18";

export default function Navigation() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();

  // Create dynamic navigation items based on authentication status
  const dynamicNavigationItems = useMemo(() => {
    const baseItems = [...navigationItems];

    // Add conditional navigation item at the end
    if (isAuthenticated()) {
      baseItems.push(dashboardNavigation);
    } else {
      baseItems.push(guideNavigation);
    }

    return baseItems;
  }, [user]);

  // Memoize navigation items with computed classes
  const desktopNavItems = useMemo(() => {
    return dynamicNavigationItems.map((item, index) => {
      const itemClasses = `${baseNavItemClasses}`;

      return (
        <div key={item.href} className="flex gap-1 items-center">
          <Link href={item.href} className={`${itemClasses}`} prefetch={true}>
            <div className="flex flex-col md:flex-row items-center gap-0 md:gap-1">
              <span className="text-xl md:text-2xl">{item.icon}</span>
              <span className="text-xs md:text-xl">{item.name}</span>
            </div>
          </Link>
          {index !== dynamicNavigationItems.length - 1 && (
            <div className="w-px h-8 bg-white/20" />
          )}
        </div>
      );
    });
  }, [dynamicNavigationItems, pathname]);

  return (
    <nav className="bg-[#B276CA] shadow-lg backdrop-blur-sm px-2 md:px-4">
      <div className="container max-w-screen-md mx-auto py-2">
        <div className="flex justify-between items-center h-14">
          {/* Desktop Navigation */}
          <div
            className={`grid gap-1 w-full ${
              dynamicNavigationItems.length === 4
                ? "grid-cols-4"
                : "grid-cols-3"
            }`}
          >
            {desktopNavItems}
          </div>
        </div>
      </div>
    </nav>
  );
}
