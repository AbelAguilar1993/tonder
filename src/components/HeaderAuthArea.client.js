"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./AuthContext";

export default function HeaderAuthArea() {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false); // ⬅️ NEW: hydration guard

  const { user, logout, openAuthModal, loading, isValidatingToken } = useAuth();

  const pathname = usePathname();
  const menuRef = useRef(null);
  const firstItemRef = useRef(null);
  const buttonRef = useRef(null);

  const toggleMenu = useCallback(() => {
    setUserMenuOpen((v) => !v);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    setUserMenuOpen(false);
  }, [logout]);

  // Ensure first render is identical on SSR and client
  useEffect(() => setHydrated(true), []); // ⬅️ NEW

  // Close menu on route change
  useEffect(() => {
    setUserMenuOpen(false);
  }, [pathname]);

  // Outside click + Escape, and focus first item when opened
  useEffect(() => {
    if (!userMenuOpen) return;

    const t = setTimeout(() => firstItemRef.current?.focus?.(), 0);

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setUserMenuOpen(false);
        buttonRef.current?.focus?.();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [userMenuOpen]);

  const initials =
    (user?.firstName?.[0] || "").toUpperCase() +
    (user?.lastName?.[0] || "").toUpperCase();

  const menuId = "user-menu";

  // ⬇️ NEW: Guarantee identical first render (SSR + client) = skeleton
  if (!hydrated) {
    return (
      <div
        aria-label="Cargando estado de sesión"
        className="flex items-center gap-2 px-2 py-1 bg-[#ffffffd9] text-[#4B004B] rounded-md font-semibold text-sm shadow-md border-2 border-[#ffffffb3]"
      >
        <span className="w-6 h-6 bg-gray-300 rounded-full animate-pulse" />
        <span className="w-12 h-4 bg-gray-300 rounded animate-pulse" />
        <span className="w-4 h-4 bg-gray-300 rounded animate-pulse" />
      </div>
    );
  }

  // Efter hydration: brug din normale tilstand
  if (loading) {
    // shimmer to prevent flicker
    return (
      <div
        aria-label="Cargando estado de sesión"
        className="flex items-center gap-2 px-2 py-1 bg-[#ffffffd9] text-[#4B004B] rounded-md font-semibold text-sm shadow-md border-2 border-[#ffffffb3]"
      >
        <span className="w-6 h-6 bg-gray-300 rounded-full animate-pulse" />
        <span className="w-12 h-4 bg-gray-300 rounded animate-pulse" />
        <span className="w-4 h-4 bg-gray-300 rounded animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={openAuthModal}
        className="text-white cursor-pointer"
      >
        <span className="flex items-center gap-1 px-2 py-2 bg-white/80 text-purple-600 rounded-md font-semibold text-sm shadow-md hover:bg-white/90 hover:shadow-lg">
          <span aria-hidden="true">🔒</span>
          <span>Login</span>
        </span>
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        aria-expanded={userMenuOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        className="flex items-center gap-2 px-2 py-1 bg-[#ffffffd9] text-[#4B004B] rounded-md font-semibold text-sm shadow-md hover:bg-white/90 hover:shadow-lg border-2 border-[#ffffffb3]"
      >
        <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs relative">
          {initials || "?"}
          {isValidatingToken && (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"
            />
          )}
        </span>
        <span className="truncate max-w-[120px]">{user.firstName}</span>
        {isValidatingToken && (
          <span className="text-xs text-gray-600 animate-pulse" aria-live="polite">
            Validando…
          </span>
        )}
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {userMenuOpen && (
        <div
          id={menuId}
          role="menu"
          aria-labelledby={menuId}
          className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-[100]"
        >
          {(user.role === "super_admin" || user.role === "company_admin") && (
            <Link
              ref={firstItemRef}
              href="/admin"
              role="menuitem"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              onClick={() => setUserMenuOpen(false)}
            >
              ⚙️ Admin Panel
            </Link>
          )}
          <Link
            href="/panel"
            role="menuitem"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
            onClick={() => setUserMenuOpen(false)}
          >
            📊 Panel
          </Link>
          <Link
            href="/creditos"
            role="menuitem"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
            onClick={() => setUserMenuOpen(false)}
          >
            💳 Créditos
          </Link>
          <Link
            href="/profile"
            role="menuitem"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
            onClick={() => setUserMenuOpen(false)}
          >
            👤 Mi perfil
          </Link>
          <Link
            href="/soporte"
            role="menuitem"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
            onClick={() => setUserMenuOpen(false)}
          >
            💬 Soporte
          </Link>
          <Link
            href="/guia"
            role="menuitem"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
            onClick={() => setUserMenuOpen(false)}
          >
            📖 Guía
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            role="menuitem"
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
          >
            🚪 Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
