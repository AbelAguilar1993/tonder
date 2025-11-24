// src/app/empresa/[company_name]/StickyApplyFooter.client.js
"use client";

import React, {
  memo,
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useStickyFooter } from "../../../components/StickyFooterContext";

// Lille hook til reduced-motion
function usePrefersReducedMotion() {
  const [prefers, setPrefers] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setPrefers(mq.matches);
    setPrefers(mq.matches);
    mq.addEventListener?.("change", onChange) ?? mq.addListener(onChange);
    return () => mq.removeEventListener?.("change", onChange) ?? mq.removeListener(onChange);
  }, []);
  return prefers;
}

const DEFAULT_BRAND = { base: "#5E3FA6", mid: "#744FBF", accent: "#A978D8" };

export default memo(function StickyApplyFooter({
  onEditScroll,
  brand = DEFAULT_BRAND,
  slowConnection,
}) {
  const { setHasStickyFooter, setStickyFooterHeight } = useStickyFooter();
  const prefersReducedMotion = usePrefersReducedMotion();

  const wrapRef = useRef(null);
  useEffect(() => {
    setHasStickyFooter(true);
    const measure = () => {
      if (wrapRef.current && setStickyFooterHeight) {
        setStickyFooterHeight(wrapRef.current.offsetHeight || 0);
      }
    };
    measure();
    document?.fonts?.ready?.then(measure).catch(() => {});
    window.addEventListener("resize", measure);
    const id = setTimeout(measure, 0);
    return () => {
      clearTimeout(id);
      window.removeEventListener("resize", measure);
      setHasStickyFooter(false);
      setStickyFooterHeight(0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔒 Ingen randomness i første render (hydration-safe)
  const [activeCount, setActiveCount] = useState(0);
  useEffect(() => {
    setActiveCount(Math.floor(Math.random() * 5) + 1);
  }, []);

  const computedSlowConnection = useMemo(() => {
    if (typeof slowConnection === "boolean") return slowConnection;
    if (typeof navigator !== "undefined" && navigator.connection) {
      const c = navigator.connection;
      if (c.saveData) return true;
      const t = (c.effectiveType || "").toLowerCase();
      if (["slow-2g", "2g", "3g"].includes(t)) return true;
    }
    return false;
  }, [slowConnection]);

  const footerStyle = useMemo(
    () => ({
      paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))",
      "--brand": brand.base,
      "--brand-2": brand.mid,
      "--brand-3": brand.accent,
    }),
    [brand]
  );

  const buttonStyle = useMemo(() => {
    if (computedSlowConnection) {
      return {
        background: brand.base,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        willChange: "transform",
      };
    }
    return {
      background: "linear-gradient(135deg, #5E3FA6 0%, #744FBF 55%, #A978D8 100%)",
      boxShadow: "0 0 15px rgba(116,79,191,0.45), 0 0 30px rgba(169,120,216,0.25)",
      willChange: "transform, box-shadow",
    };
  }, [computedSlowConnection, brand.base]);

  const handleClick = useCallback(() => {
    if (typeof onEditScroll === "function") {
      onEditScroll("elige-tu-oportunidad");
      return;
    }
    const el = document.getElementById("elige-tu-oportunidad");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [onEditScroll]);

  const buttonClassName = `relative mt-1 w-full rounded-xl border-0 text-white shadow-lg pointer-events-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90 px-4 py-4 ${
    !prefersReducedMotion ? "hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all" : ""
  }`;

  return (
    <div
      ref={wrapRef}
      className="fixed left-0 right-0 bottom-0 z-50 border-t border-gray-200 py-2 px-2 shadow-lg backdrop-blur-lg bg-white/70"
      style={footerStyle}
      role="region"
      aria-label="Barra de acción: ver ofertas de empleo ahora"
    >
      {!computedSlowConnection && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "linear-gradient(135deg, var(--brand), var(--brand-2) 55%, var(--brand-3))",
          }}
          aria-hidden
        />
      )}

      <div className="flex justify-center mb-1 mt-1">
        <div className="inline-flex items-center gap-0 bg-green-100 text-green-800 font-semibold text-sm px-3 py-1 rounded-xl shadow-sm">
          <span className="mr-1">🟢</span>
          <span>{activeCount} reclutadores activos ahora</span>
        </div>
      </div>

      <div className="container max-w-screen-md mx-auto">
        <div className="flex flex-col gap-0">
          <button
            type="button"
            aria-label="Ver ofertas de empleo ahora — aplica directo al reclutador verificado"
            onClick={handleClick}
            className={buttonClassName}
            style={buttonStyle}
          >
            <div className="flex items-center justify-center gap-3">
              <span className="text-xl leading-none"></span>
              <div className="flex flex-col leading-tight text-center">
                <span className="text-[17px] sm:text-[17px] font-extrabold tracking-tight">
                  👉 Paso 1 de 2: Elige tu próximo empleo <span className="text-xl leading-none" aria-hidden>→</span>

                </span>
                <span className="text-[13px] sm:text-[13px] mt-1 font-medium opacity-95">
                  🚀 Siguiente paso: contacto directo con el reclutador
                </span>
              </div>
            </div>
          </button>


        </div>
      </div>
    </div>
  );
});
