/* eslint-disable react/no-unescaped-entities */
"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useReducer,
  useLayoutEffect,
} from "react";
import { useRouter } from "next/navigation";
import { authService } from "../services/authService";
import { jobsService } from "../services/jobsService";
import { paymentsService } from "../services/paymentsService";
import { creditsService } from "../services/creditsService";
import { tonderService } from "../services/tonderService";
import { useToast } from "./ui/Toast";
import { useAuth } from "./AuthContext";
import { getInitials, hexToRgb } from "../utils";
import { trackGoal } from "../utils/clicky";

/* ===================== Helpers ===================== */

// Luminans → vælg hvid eller soft black (#1f2937)
const getTextColorForBackground = (hexColor) => {
  if (!hexColor) return "#1f2937";
  const c = hexColor.replace("#", "");
  if (c.length === 3) {
    const r = c[0] + c[0];
    const g = c[1] + c[1];
    const b = c[2] + c[2];
    const luminance =
      (0.299 * parseInt(r, 16) +
        0.587 * parseInt(g, 16) +
        0.114 * parseInt(b, 16)) /
      255;
    return luminance > 0.6 ? "#1f2937" : "#ffffff";
  }
  if (c.length !== 6) return "#1f2937";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1f2937" : "#ffffff";
};

// ——— Simple hashing/normalisering (LATAM, ingen consent gate) ———
const deaccent = (s = "") => s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
const normLower = (s = "") => deaccent(String(s).trim().toLowerCase());

async function sha256Hex(str) {
  const data = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const toE164 = (raw = "", country = "co") => {
  const digits = String(raw).replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("57") || digits.startsWith("+57"))
    return `+${digits.replace(/^\+?/, "")}`;
  if (country.toLowerCase() === "co") return `+57${digits}`;
  if (country.toLowerCase() === "mx") {
    if (digits.startsWith("52") || digits.startsWith("+52"))
      return `+${digits.replace(/^\+?/, "")}`;
    return `+52${digits}`;
  }
  return `+${digits}`;
};

const splitName = (full = "") => {
  const parts = String(full).trim().split(/\s+/);
  const first = parts[0] || "";
  const last = parts.length > 1 ? parts.slice(1).join(" ") : "";
  return { first, last };
};

/**
 * Samlet helper til advanced matching user_data til Pixel/CAPIG.
 * (Vi lader Pixel selv hashe — vi sender normaliserede rå værdier.)
 */
function buildPixelUserData({ formData, payerPhone, city, countryCode = "mx" }) {
  const { first, last } = splitName(formData?.fullName || "");
  const emailNorm = normLower(formData?.email || "");
  const phoneE164 = toE164(payerPhone || "", countryCode);
  const cityNorm = normLower(city || "")
    .replace(/\s+/g, "") // fjern mellemrum
    .replace(/[^a-z0-9]/g, ""); // fjern evt. specialtegn
  const countryNorm = normLower(countryCode || "");

  const userData = {};
  if (emailNorm) userData.em = emailNorm;
  if (first) userData.fn = normLower(first);
  if (last) userData.ln = normLower(last);
  if (phoneE164) userData.ph = phoneE164.replace(/[^\d+]/g, "");
  if (cityNorm) userData.ct = cityNorm;
  if (countryNorm) userData.country = countryNorm; // fx "mx", "co"

  return userData;
}

function getGeoFromClient() {
  if (typeof window === "undefined") {
    return { city: "", countryCode: "", label: "" };
  }

  let city = "";
  let countryCode = "";

  try {
    const g = window.__GEO__ || {};
    city = g.city || "";
    countryCode = g.country || "";
  } catch (e) {
    // ignore
  }

  try {
    const html = document.documentElement;

    if (!city) {
      city = html?.getAttribute("data-geo-city") || "";
    }
    if (!countryCode) {
      countryCode = html?.getAttribute("data-geo-country") || "";
    }
  } catch (e) {
    // ignore
  }

  // label = kun bynavn
  const label = city || "";

  return {
    city,
    countryCode: (countryCode || "").toLowerCase(), // "mx", "co", "dk"…
    label,
  };
}

// Hashet Advanced Matching + Meta Lead + Clicky 752 (simpel)
async function sendLeadSimple({
  job,
  company,
  city,
  currency = "MXN",
  priceMinor,
  formData,
  payerPhone,
  countryCode = "mx",
}) {
  const geo = getGeoFromClient();
  const effectiveCity = geo.city || city || "";
  const effectiveCountryCode = geo.countryCode || countryCode || "mx";

  const userData = buildPixelUserData({
    formData,
    payerPhone,
    city: effectiveCity,
    countryCode: effectiveCountryCode,
  });

  try {
    // ❌ INGEN fbq('init', ...) HER – kun event tracking.
    window.fbq?.("track", "Lead", {
      content_name: "Acceso al reclutador",
      content_category: "Checkout",
      ...userData,
    });
  } catch {}

  try {
    trackGoal(752);
  } catch {}
}

// Luminans-baseret tekstfarve (ekstra helper)
function textColorForBg(input) {
  if (!input) return "#1f2937";
  const color = String(input).trim().toLowerCase();
  let r, g, b;

  const rgbMatch = color.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i
  );
  if (rgbMatch) {
    r = Math.min(255, Math.max(0, parseFloat(rgbMatch[1])));
    g = Math.min(255, Math.max(0, parseFloat(rgbMatch[2])));
    b = Math.min(255, Math.max(0, parseFloat(rgbMatch[3])));
  } else {
    const hex = color.startsWith("#") ? color.slice(1) : color;
    if (hex.length === 3) {
      const rr = hex[0] + hex[0];
      const gg = hex[1] + hex[1];
      const bb = hex[2] + hex[2];
      r = parseInt(rr, 16);
      g = parseInt(gg, 16);
      b = parseInt(bb, 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    } else {
      return "#1f2937";
    }
  }
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1f2937" : "#fff";
}

const isValidEmail = (e) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "").trim());

const onlyDigits = (val = "") => (val || "").replace(/[^\d]/g, "");

/* === Signatur-builder til Step 2 (spansk, brugerens data) === */
/* [DK: "Saludos cordiales," = "Venlig hilsen"; "Cel." = "Mobil"; "Correo" = "E-mail"] */
const mxLocal = (p = "") => {
  let d = String(p).replace(/[^\d]/g, "");
  if (d.startsWith("52")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  if (d.length !== 10) return "";
  return `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}`;
};

const buildSignature = (fullName = "", email = "", phone = "", countryCode = "mx") => {
  const name = (fullName || "").trim();
  const lines = [];

  if (name) {
    lines.push("Saludos cordiales,");
    lines.push(name);
  }

  if (phone) {
    const isMX = String(countryCode).toLowerCase() === "mx";
    const mx = isMX ? mxLocal(phone) : "";
    if (mx) {
      lines.push(`Cel.: ${mx} (WhatsApp)`);
    } else {
      const phoneFmt =
        typeof toE164 === "function"
          ? toE164(phone, countryCode)
          : String(phone).trim();
      if (phoneFmt) lines.push(`Tel.: ${phoneFmt}`);
    }
  }

  if (email) lines.push(`Correo: ${String(email).trim()}`);

  return lines.length ? `\n\n${lines.join("\n")}` : "";
};

/* ===================== CUSTOM HOOKS ===================== */

/**
 * 🚀 OPTIMERET useAutoGrow (Gemini-style)
 * Undgår "layout thrashing" ved at sætte height til "1px" i stedet for "auto" før måling.
 */
function useAutoGrow(
  textareaRef,
  value,
  { minRows = 4, maxRows = 10, maxHeightPx = null } = {}
) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = textareaRef?.current;
    if (!el) return;

    const style = window.getComputedStyle(el);
    const lineHeight = parseFloat(style.lineHeight || "16") || 16;
    const paddingY =
      parseFloat(style.paddingTop || "0") +
      parseFloat(style.paddingBottom || "0");

    const minHeight = minRows * lineHeight + paddingY;
    const maxHeight = maxRows * lineHeight + paddingY;
    let frameId;

    const resize = () => {
      if (!el) return;
      const prevHeight = el.style.height;
      // Sæt til en minimal højde for at måle scrollHeight korrekt
      el.style.height = "1px";

      const scrollH = el.scrollHeight || minHeight;
      const target = Math.min(scrollH, maxHeightPx || maxHeight);
      const newHeightPx = `${Math.max(target, minHeight)}px`;

      // Undgå unødvendig re-paint hvis højden er den samme
      if (newHeightPx !== prevHeight) {
        el.style.height = newHeightPx;
      } else {
        el.style.height = prevHeight;
      }
    };

    frameId = requestAnimationFrame(resize);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [textareaRef, value, minRows, maxRows, maxHeightPx]);
}

/**
 * 💎 BLINK-FIX HOOK
 * Låser scroll uden at lege med position: fixed (som plejer at give blink på Android).
 */
function useBodyScrollLock(isLocked) {
  useLayoutEffect(() => {
    if (!isLocked) return;
    if (typeof document === "undefined") return;

    const html = document.documentElement;
    const body = document.body;

    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverscroll = html.style.overscrollBehaviorY;
    const prevBodyOverscroll = body.style.overscrollBehaviorY;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehaviorY = "contain";
    body.style.overscrollBehaviorY = "contain";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.overscrollBehaviorY = prevHtmlOverscroll;
      body.style.overscrollBehaviorY = prevBodyOverscroll;
    };
  }, [isLocked]);
}

/**
 * Hook til at håndtere --vh (Viewport Height)
 */
function useViewportHeight() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };
    setVh();
    window.addEventListener("resize", setVh);
    window.addEventListener("orientationchange", setVh);
    return () => {
      window.removeEventListener("resize", setVh);
      window.removeEventListener("orientationchange", setVh);
    };
  }, []);
}

/* ===================== SUB-KOMPONENTER ===================== */

function Collapsible({
  children,
  collapsedPx = 170,
  moreLabel = "Ver más",
  lessLabel = "Ver menos",
}) {
  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const sh = el.scrollHeight || 0;
    setShowToggle(sh > collapsedPx + 8);
  }, [children, collapsedPx]);

  return (
    <div className="relative">
      <div
        ref={contentRef}
        className="relative overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{ maxHeight: expanded ? "1000px" : `${collapsedPx}px` }}
        aria-expanded={expanded}
      >
        {children}

        {!expanded && showToggle && (
          <>
            <div
              className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/95 via-white/60 to-transparent backdrop-blur-[1px] pointer-events-none"
              aria-hidden="true"
            />
            <div className="absolute inset-x-0 bottom-2.5 flex justify-center z-10 pointer-events-auto">
              <button
                type="button"
                onClick={() => {
                  try {
                    trackGoal(750);
                  } catch {}
                  setExpanded((v) => !v);
                }}
                aria-expanded={expanded}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#512f9b] px-3 py-0 rounded-full border border-[rgba(94,63,166,.28)] bg-[rgba(94,63,166,.08)] hover:bg-[rgba(94,63,166,.12)] active:scale-[0.98] transition shadow-sm ring-1 ring-[rgba(94,63,166,.12)]"
              >
                {moreLabel}
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>

      {expanded && showToggle && (
        <div className="mt-2 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#512f9b] px-3 py-1.5 rounded-full border border-[rgba(94,63,166,.28)] bg-[rgba(94,63,166,.08)] hover:bg-[rgba(94,63,166,.12)] active:scale-[0.98] transition"
          >
            {lessLabel}
            <svg
              className="w-3.5 h-3.5 rotate-180"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

/* ===================== Global persist keys ===================== */
const MSG_GLOBAL_KEY = "es_msg_last";
const PAYER_GLOBAL_KEY = "es_payer_last";

/* ===================== ValueStack ===================== */
function Slide2ValueStack({
  company,
  job,
  selectedContact,
  vacantes,
  reclutadores,
  ciudad,
}) {
  const empresa = company?.name || "la empresa";
  const titulo = job?.title || "esta vacante";
  const city = ciudad || selectedContact?.city || "tu ciudad";
  const recruiterFirstName = (selectedContact?.name || "Reclutador")
    .trim()
    .split(/\s+/)[0];

  const StatBox = ({ label, value }) =>
    value ? (
      <div className="rounded-lg border bg-gray-50 px-2 py-1 text-center">
        <div className="text-[10px] text-gray-600">{label}</div>
        <div className="text-[12px] font-bold text-gray-800">{value}</div>
      </div>
    ) : null;

  return (
    <div className="mb-3 mt-4 space-y-2">
      <div
        className="relative group rounded-2xl p-[1.5px] bg-gradient-to-br from-[var(--brand,#5E3FA6)] via-[var(--brand-2,#B276CA)] to-[var(--brand-3,#FF8AD8)] shadow-[0_10px_30px_rgba(94,63,166,.28)]"
        style={{
          "--brand": "#5E3FA6",
          "--brand-2": "#B276CA",
          "--brand-3": "#FF8AD8",
        }}
      >
        <div className="rounded-2xl bg-white/95 backdrop-blur border border-white/70 p-3 sm:p-4 relative overflow-hidden">
          <div className="pointer-events-none absolute -top-6 right-10 h-16 w-16 rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--brand-3)] blur-2xl opacity-40"></div>

          <div className="flex items-center justify-between gap-2">
            <h4 className="text-[18px] sm:text-[18px] font-extrabold leading-none text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand)] via-[var(--brand-2)] to-[var(--brand-3)]">
              💜 Cómo funciona
            </h4>
          </div>

          <ol className="mt-2 text-[14px] text-gray-800 list-decimal pl-5 space-y-2 marker:font-extrabold marker:text-[var(--brand)] marker:opacity-90">
            <li className="leading-relaxed">
              ✅ <strong>Tu mensaje directo</strong> al correo de{" "}
              <strong>
                {recruiterFirstName} ({empresa})
              </strong>{" "}
              - está listo para enviar.
            </li>
            <li className="leading-relaxed">
              💜 <strong>(Opcional)</strong> te ayudamos a{" "}
              <strong>mejorar</strong> tu texto{" "}
              <strong>antes de confirmar el envío</strong>.
            </li>
            <li className="leading-relaxed">
              ⚡ Al confirmar,{" "}
              <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand)] via-[var(--brand-2)] to-[var(--brand-3)]">
                activas la entrega directa
              </span>{" "}
              y hacemos seguimiento de <strong>lectura y respuesta</strong>.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

/* ===================== Reducer-state ===================== */

const baseState = {
  currentStep: 1,
  isAnimating: false,
  formData: { fullName: "", email: "" },
  payerPhone: "",
  messageText: "",
  messageError: "",
  validationErrors: { fullName: "", email: "", phone: "" },
  selectedPayment: "card",
  cardOpen: false,
  showPaymentMethodsInline: true,
  isLoading: false,
  isRegistering: false,
  isCheckingStatus: false,
  jobStatus: "locked",
  userCredits: 0,
  canUnlock: false,
  creditPriceText: "No disponible",
  showStep2Intro: false,
  step2Progress: 0,
  step2Checks: [],
  showManualOpen: false,
  manualUrl: "",
  paymentStatus: 'idle',
  paymentId: null,
  intentId: null,
  secureToken: null,
  speiReference: null,
  oxxoVoucher: null,
  oxxoExpiresAt: null,
  pollingInterval: null,
};

function createInitialState({ authed, user }) {
  const next = { ...baseState };
  next.currentStep = authed ? 3 : 1;

  if (authed && user) {
    next.formData = {
      fullName: user.name || user.fullName || "",
      email: user.email || "",
    };
    next.payerPhone = user.phone || "";
  }

  return next;
}

function applyNowReducer(state, action) {
  switch (action.type) {
    case "RESET_ON_OPEN":
      return action.payload;

    case "PATCH":
      return { ...state, ...action.payload };

    case "SET_FORM_DATA":
      return {
        ...state,
        formData: { ...state.formData, ...action.payload },
      };

    case "SET_VALIDATION_ERRORS":
      return {
        ...state,
        validationErrors: {
          ...state.validationErrors,
          ...action.payload,
        },
      };

    case "PAYMENT_PENDING":
      return {
        ...state,
        paymentStatus: 'pending',
        paymentId: action.payload.paymentId,
        intentId: action.payload.intentId,
        secureToken: action.payload.secureToken || state.secureToken,
        speiReference: action.payload.speiReference || null,
        oxxoVoucher: action.payload.oxxoVoucher || null,
        oxxoExpiresAt: action.payload.oxxoExpiresAt || null,
        isLoading: false,
      };

    case "PAYMENT_PROCESSING":
      return {
        ...state,
        paymentStatus: 'processing',
        isLoading: true,
      };

    case "PAYMENT_SUCCEEDED":
      return {
        ...state,
        paymentStatus: 'succeeded',
        isLoading: false,
      };

    case "PAYMENT_FAILED":
      return {
        ...state,
        paymentStatus: 'failed',
        isLoading: false,
      };

    case "PAYMENT_EXPIRED":
      return {
        ...state,
        paymentStatus: 'expired',
        isLoading: false,
      };

    case "SET_POLLING_INTERVAL":
      return {
        ...state,
        pollingInterval: action.payload,
      };

    default:
      return state;
  }
}

/* ===================== ApplyNowModal ===================== */
const ApplyNowModal = ({
  isOpen,
  onClose,
  job,
  company,
  selectedContact,
  extras,
}) => {
  const router = useRouter();
  const { user, isAuthenticated, login } = useAuth();
  const authed = isAuthenticated();
  const isGuestFlow = !authed;

  const [state, dispatch] = useReducer(
    applyNowReducer,
    { authed, user },
    createInitialState
  );

  const {
    currentStep,
    isAnimating, // eslint-disable-line
    formData,
    payerPhone,
    messageText,
    messageError,
    validationErrors,
    selectedPayment,
    cardOpen,
    showPaymentMethodsInline,
    isLoading,
    isRegistering, // eslint-disable-line
    isCheckingStatus,
    jobStatus,
    userCredits,
    canUnlock,
    creditPriceText,
    showStep2Intro, // eslint-disable-line
    step2Progress, // eslint-disable-line
    step2Checks, // eslint-disable-line
    showManualOpen,
    manualUrl,
    paymentStatus,
    paymentId,
    intentId,
    secureToken,
    speiReference,
    oxxoVoucher,
    oxxoExpiresAt,
    pollingInterval
  } = state;

  const scrollerRef = useRef(null);
  const step2TopRef = useRef(null);
  const step3TopRef = useRef(null);
  const sinRiesgoRef = useRef(null);
  const messageTextareaRef = useRef(null);

  const [saveTimerRefMsg] = useState({ current: null });
  const [saveTimerRefPayer] = useState({ current: null });

  const { showSuccess, showError, ToastComponent } = useToast();

  const companyColor = company?.color || "#3b82f6";
  const companyColorRgb = hexToRgb(companyColor);

  const dynamicStyles = {
    "--brand": companyColor,
    "--brand-rgb": `${companyColorRgb.r}, ${companyColorRgb.g}, ${companyColorRgb.b}`,
    "--brand-soft": `rgba(${companyColorRgb.r}, ${companyColorRgb.g}, ${companyColorRgb.b}, 0.1)`,
    "--brand-ring": `rgba(${companyColorRgb.r}, ${companyColorRgb.g}, ${companyColorRgb.b}, 0.3)`,
    "--ring": `rgba(${companyColorRgb.r}, ${companyColorRgb.g}, ${companyColorRgb.b}, 0.55)`,
  };

  const REDIRECT_FLAG = "es_checkout_redirect_v1";

  useEffect(() => {
    if (typeof window !== 'undefined' && isOpen) {
      tonderService.initialize(
        process.env.NEXT_PUBLIC_TONDER_API_KEY,
        process.env.NEXT_PUBLIC_TONDER_ENV === 'production' ? 'production' : 'development'
      );
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Hooks
  useAutoGrow(messageTextareaRef, messageText, {
    minRows: 4,
    maxRows: 10,
    maxHeightPx: 260,
  });
  useBodyScrollLock(isOpen);
  useViewportHeight();

  const getFirstName = (name) => (name ? name.trim().split(" ")[0] : "");

  const draftKey = useMemo(() => {
    const j = job?.id || "job";
    const c = selectedContact?.id || "contact";
    return `es_msg_draft_v3:${j}:${c}`;
  }, [job?.id, selectedContact?.id]);

  const step2Key = useMemo(() => {
    const j = job?.id || "job";
    const c = selectedContact?.id || "contact";
    return `es_payer_v1:${j}:${c}`;
  }, [job?.id, selectedContact?.id]);

  const softScrollTo = (container, targetTop, duration = 800) => {
    if (!container) return;
    const start = container.scrollTop;
    const diff = targetTop - start;
    if (!diff) return;

    const startTime = performance.now();
    const easeOutQuad = (t) => t * (2 - t);

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      container.scrollTop = start + diff * easeOutQuad(progress);
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  const scrollModalToBottom = () => {
    const sc = scrollerRef.current;
    if (!sc) return;
    const target = sc.scrollHeight - sc.clientHeight;
    if (target <= 0) return;
    softScrollTo(sc, target, 800); // blødere end native smooth
  };

  const scrollToSinRiesgo = () => {
    const sc = scrollerRef.current;
    const target = sinRiesgoRef.current;
    if (!sc || !target) return;
    const scRect = sc.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const offset = 9; // lidt afstand til toppen
    const targetTop =
      sc.scrollTop + (targetRect.top - scRect.top) - offset;
    softScrollTo(sc, targetTop < 0 ? 0 : targetTop);
  };

  const resetInnerScroll = () => {
    const sc = scrollerRef.current;
    if (!sc) return;
    sc.scrollTop = 0;
    requestAnimationFrame(() => {
      sc.scrollTop = 0;
    });
    setTimeout(() => {
      sc.scrollTop = 0;
    }, 60);
  };

  const animateVacancies = () => {
    const targetVacancies = Math.floor(Math.random() * 30) + 15;
    let current = 0;
    const duration = 800;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      current = Math.round(targetVacancies * progress);
      const vacElement = document.getElementById("vacancy-count");
      if (vacElement) vacElement.textContent = String(current);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  };

  const animateBenefitRail = () => {
    setTimeout(() => {
      const rail = document.getElementById("benefit-rail");
      if (rail) rail.classList.add("animate-in");
    }, 100);
  };

  const persistMessageNow = () => {
    try {
      if (saveTimerRefMsg.current) {
        clearTimeout(saveTimerRefMsg.current);
        saveTimerRefMsg.current = null;
      }
      const val = (messageText || "").trim();
      if (val) {
        localStorage.setItem(draftKey, val);
        localStorage.setItem(MSG_GLOBAL_KEY, val);
      } else {
        localStorage.removeItem(draftKey);
        localStorage.removeItem(MSG_GLOBAL_KEY);
      }
    } catch {}
  };

  const persistPayerNow = () => {
    try {
      if (saveTimerRefPayer.current) {
        clearTimeout(saveTimerRefPayer.current);
        saveTimerRefPayer.current = null;
      }
      const payload = {
        fullName: (formData.fullName || "").trim(),
        email: (formData.email || "").trim(),
        phone: (payerPhone || "").trim(),
      };
      if (payload.fullName || payload.email || payload.phone) {
        const s = JSON.stringify(payload);
        localStorage.setItem(step2Key, s);
        localStorage.setItem(PAYER_GLOBAL_KEY, s);
      } else {
        localStorage.removeItem(step2Key);
        localStorage.removeItem(PAYER_GLOBAL_KEY);
      }
    } catch {}
  };

  const persistAllNow = () => {
    persistMessageNow();
    persistPayerNow();
  };

  const handleClose = () => {
    try {
      persistAllNow();
    } catch {}
    onClose?.();
  };

  const handleInputChange = (field, value) => {
    dispatch({ type: "SET_FORM_DATA", payload: { [field]: value } });
    if (validationErrors[field]) {
      dispatch({
        type: "SET_VALIDATION_ERRORS",
        payload: { [field]: "" },
      });
    }
  };

  const validatePayerStep = () => {
    const errors = { fullName: "", email: "", phone: "" };

    const nameTrim = (formData.fullName || "").trim();
    if (!nameTrim) {
      errors.fullName = "Nombre completo requerido";
    } else if (nameTrim.split(/\s+/).length < 2) {
      errors.fullName = "Escribe nombre y apellido";
    }

    if (!isValidEmail(formData.email)) {
      errors.email = "Correo inválido";
    }

    const phoneDigits = onlyDigits(payerPhone);
    if (phoneDigits.length < 7) {
      errors.phone = "Teléfono inválido";
    }

    dispatch({
      type: "PATCH",
      payload: { validationErrors: errors },
    });

    const ok = !errors.fullName && !errors.email && !errors.phone;
    return ok;
  };

  const validateMessageStep = () => {
    const t = (messageText || "").trim();
    if (t.length < 8) {
      dispatch({
        type: "PATCH",
        payload: {
          messageError: "Escribe un mensaje breve para el reclutador.",
        },
      });
      return false;
    }
    dispatch({ type: "PATCH", payload: { messageError: "" } });
    return true;
  };

  const goToStep = (step) => {
    if (step === currentStep) return;
    if (authed && (step === 1 || step === 2)) return;

    dispatch({
      type: "PATCH",
      payload: { isAnimating: true, currentStep: step },
    });

    requestAnimationFrame(() => {
      if (step === 2) {
        resetInnerScroll();
        try {
          step2TopRef.current?.scrollIntoView({ block: "start" });
        } catch {}
      } else if (step === 3) {
        resetInnerScroll();
        try {
          step3TopRef.current?.scrollIntoView({ block: "start" });
        } catch {}
      }
    });

    setTimeout(
      () => dispatch({ type: "PATCH", payload: { isAnimating: false } }),
      300
    );
  };

  const checkJobStatus = async () => {
    if (!authed || !job?.id || !selectedContact?.id) return;
    dispatch({ type: "PATCH", payload: { isCheckingStatus: true } });
    try {
      const creditsResponse = await creditsService.getPricing();
      if (creditsResponse.success) {
        dispatch({
          type: "PATCH",
          payload: {
            creditPriceText: creditsResponse.data.price_text || "No disponible",
          },
        });
      }
      const response = await jobsService.getJobStatus(job.id, selectedContact.id);
      if (response.success) {
        dispatch({
          type: "PATCH",
          payload: {
            jobStatus: response.status,
            userCredits: response.userCredits,
            canUnlock: response.canUnlock,
          },
        });
      }
    } catch (error) {
      console.error("Failed to check job status:", error);
      showError("Failed to check job status");
    } finally {
      dispatch({ type: "PATCH", payload: { isCheckingStatus: false } });
    }
  };

  // Cleanup efter redirect
  useEffect(() => {
    const resetAfterReturn = () => {
      try {
        if (sessionStorage.getItem(REDIRECT_FLAG)) {
          sessionStorage.removeItem(REDIRECT_FLAG);
          dispatch({
            type: "PATCH",
            payload: {
              isLoading: false,
              isCheckingStatus: false,
              showManualOpen: false,
              manualUrl: "",
            },
          });
        }
      } catch {}
    };
    const onPageShow = () => resetAfterReturn();
    const onVisibility = () => {
      if (document.visibilityState === "visible") resetAfterReturn();
    };
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Set --vh
  useEffect(() => {
    if (typeof window === "undefined") return;
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };
    setVh();
    window.addEventListener("resize", setVh);
    window.addEventListener("orientationchange", setVh);
    return () => {
      window.removeEventListener("resize", setVh);
      window.removeEventListener("orientationchange", setVh);
    };
  }, []);

  // Master reset når modal åbnes
  useEffect(() => {
    if (!isOpen) return;

    const nextState = createInitialState({ authed, user });

    // load message
    try {
      const globalSaved = localStorage.getItem(MSG_GLOBAL_KEY);
      if (globalSaved && globalSaved.trim()) {
        nextState.messageText = globalSaved;
        nextState.messageError = "";
        localStorage.setItem(draftKey, globalSaved);
      } else {
        const saved = localStorage.getItem(draftKey);
        if (saved && saved.trim()) {
          nextState.messageText = saved;
          nextState.messageError = "";
          localStorage.setItem(MSG_GLOBAL_KEY, saved);
        }
      }
    } catch {}

    // load payer
    try {
      const rawG = localStorage.getItem(PAYER_GLOBAL_KEY);
      if (rawG) {
        const parsedG = JSON.parse(rawG || "{}");
        if (parsedG.fullName !== undefined) {
          nextState.formData.fullName = parsedG.fullName;
        }
        if (parsedG.email !== undefined) {
          nextState.formData.email = parsedG.email;
        }
        if (parsedG.phone !== undefined) {
          nextState.payerPhone = parsedG.phone;
        }
        localStorage.setItem(step2Key, rawG);
      } else {
        const raw = localStorage.getItem(step2Key);
        if (raw) {
          const parsed = JSON.parse(raw || "{}");
          if (parsed.fullName !== undefined) {
            nextState.formData.fullName = parsed.fullName;
          }
          if (parsed.email !== undefined) {
            nextState.formData.email = parsed.email;
          }
          if (parsed.phone !== undefined) {
            nextState.payerPhone = parsed.phone;
          }
          localStorage.setItem(PAYER_GLOBAL_KEY, raw);
        }
      }
    } catch {}

    dispatch({ type: "RESET_ON_OPEN", payload: nextState });

    try {
      localStorage.setItem("es_checkout_variant", "guest-step1");
    } catch {}

    if (authed && user) {
      checkJobStatus();
    }

    setTimeout(() => {
      animateVacancies();
      animateBenefitRail();
    }, 300);
  }, [isOpen, authed, user, job?.id, draftKey, step2Key]);

  // Gem besked (debounced)
  useEffect(() => {
    if (!isOpen) return;
    if (saveTimerRefMsg.current) clearTimeout(saveTimerRefMsg.current);
    saveTimerRefMsg.current = setTimeout(() => {
      try {
        const val = (messageText || "").trim();
        if (val) {
          localStorage.setItem(draftKey, val);
          localStorage.setItem(MSG_GLOBAL_KEY, val);
        } else {
          localStorage.removeItem(draftKey);
          localStorage.removeItem(MSG_GLOBAL_KEY);
        }
      } catch {}
    }, 400);
    return () => {
      if (saveTimerRefMsg.current) clearTimeout(saveTimerRefMsg.current);
    };
  }, [messageText, draftKey, isOpen]);

  // Gem payer (debounced)
  useEffect(() => {
    if (!isOpen) return;
    if (saveTimerRefPayer.current) clearTimeout(saveTimerRefPayer.current);
    saveTimerRefPayer.current = setTimeout(() => {
      try {
        const payload = {
          fullName: (formData.fullName || "").trim(),
          email: (formData.email || "").trim(),
          phone: (payerPhone || "").trim(),
        };
        if (payload.fullName || payload.email || payload.phone) {
          const s = JSON.stringify(payload);
          localStorage.setItem(step2Key, s);
          localStorage.setItem(PAYER_GLOBAL_KEY, s);
        } else {
          localStorage.removeItem(step2Key);
          localStorage.removeItem(PAYER_GLOBAL_KEY);
        }
      } catch {}
    }, 400);
    return () => {
      if (saveTimerRefPayer.current) clearTimeout(saveTimerRefPayer.current);
    };
  }, [formData.fullName, formData.email, payerPhone, step2Key, isOpen, saveTimerRefPayer]);

  // Persist ved unload
  useEffect(() => {
    if (!isOpen) return;

    const persist = () => {
      persistAllNow();
    };

    window.addEventListener("beforeunload", persist, true);
    window.addEventListener("pagehide", persist, true);

    return () => {
      window.removeEventListener("beforeunload", persist, true);
      window.removeEventListener("pagehide", persist, true);
    };
  }, [
    isOpen,
    messageText,
    formData.fullName,
    formData.email,
    payerPhone,
    draftKey,
    step2Key,
  ]);

  // Autofyld navn på kortet
  useEffect(() => {
    if (!isOpen) return;
    if (currentStep !== 3 || !showPaymentMethodsInline) return;
    const fill = () => {
      try {
        const el = document.getElementById("card-name-input");
        const name = (formData.fullName || "").trim();
        if (el && name && (!el.value || el.value.trim().length < 2)) {
          el.value = name;
        }
      } catch {}
    };
    fill();
    const t = setTimeout(fill, 60);
    return () => clearTimeout(t);
  }, [
    isOpen,
    currentStep,
    formData.fullName,
    cardOpen,
    selectedPayment,
    showPaymentMethodsInline,
  ]);

  const isBusy = isLoading || isCheckingStatus;

  const handleRegistration = async () => {
    if (!validatePayerStep()) {
      return;
    }
    dispatch({ type: "PATCH", payload: { isRegistering: true } });
    try {
      const response = await authService.quickRegister({
        email: formData.email.trim(),
        fullName: formData.fullName.trim(),
      });
      showSuccess("¡Registro exitoso! Revisa tu correo para crear tu clave.");
      if (response.user && response.token) {
        login(response.user, response.token);
      }
      setTimeout(() => {
        goToStep(3);
      }, 800);
    } catch (error) {
      if (error.code === "EMAIL_EXISTS") {
        showError("Este correo ya existe. ¿Quieres iniciar sesión?");
      } else if (error.message && error.message !== "An error occurred") {
        showError(error.message);
      } else {
        showError("Registro falló. Intenta de nuevo.");
      }
    } finally {
      dispatch({ type: "PATCH", payload: { isRegistering: false } });
    }
  };

  const startPaymentPolling = (paymentId) => {
    const interval = setInterval(async () => {
      try {
        const statusResponse = await tonderService.getStatus(paymentId);
        
        if (statusResponse.success && statusResponse.data) {
          const status = statusResponse.data.status;
          
          if (status === 'succeeded') {
            clearInterval(interval);
            dispatch({ type: 'PAYMENT_SUCCEEDED' });
            showSuccess("¡Pago confirmado! Redirigiendo...");
            
            setTimeout(() => {
              if (authed) {
                router.push('/panel');
              } else {
                router.push('/pagos/success?redirect=panel');
              }
            }, 1500);
          } else if (status === 'failed' || status === 'expired') {
            clearInterval(interval);
            dispatch({ 
              type: status === 'expired' ? 'PAYMENT_EXPIRED' : 'PAYMENT_FAILED' 
            });
            showError(status === 'expired' 
              ? "El pago expiró. Por favor, intenta de nuevo."
              : "El pago falló. Por favor, intenta de nuevo."
            );
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000);

    dispatch({ type: 'SET_POLLING_INTERVAL', payload: interval });

    setTimeout(() => {
      clearInterval(interval);
    }, 300000);
  };

  const startCheckout = async (methodId) => {
    if (isBusy) return null;
    if (!job?.id || !selectedContact?.id) {
      showError("Falta información del empleo/contacto");
      return null;
    }
    if (!validatePayerStep()) {
      return null;
    }
    if (!validateMessageStep()) {
      goToStep(1);
      return null;
    }

    dispatch({
      type: "PATCH",
      payload: {
        isLoading: true,
        showManualOpen: false,
        manualUrl: "",
        paymentStatus: 'processing',
      },
    });

    try {
      const geo = getGeoFromClient();

      const userData = buildPixelUserData({
        formData,
        payerPhone,
        city: geo.city || extras?.userCity || selectedContact?.city || "",
        countryCode: geo.countryCode || extras?.countryCode || "mx",
      });

      try {
        window.fbq?.("track", "CheckoutPaymentStart", {
          content_name: "Acceso al reclutador",
          content_category: "Checkout",
          value: 79,
          currency: "MXN",
          payment_method: methodId || "card",
          ...userData,
        });
      } catch {}

      trackGoal(769);

      const intentResponse = await tonderService.createIntent({
        amount: 79,
        currency: 'mxn',
        payment_type: 'job_unlock',
        metadata: {
          job_id: job.id,
          contact_id: selectedContact.id,
          extras: extras || {},
          message_text: (messageText || "").trim(),
          payment_method: methodId || "card",
          email: formData.email.trim(),
          payer: {
            name: formData.fullName.trim(),
            email: formData.email.trim(),
            phone: payerPhone.trim(),
          },
        },
      });

      if (!intentResponse.success) {
        throw new Error(intentResponse.error || "Failed to create payment intent");
      }

      const { intent_id, payment_id, secure_token } = intentResponse.data;

      dispatch({
        type: "PATCH",
        payload: {
          intentId: intent_id,
          paymentId: payment_id,
          secureToken: secure_token,
        },
      });

      if (methodId === "card") {
        dispatch({
          type: "PATCH",
          payload: {
            paymentStatus: 'pending',
            isLoading: false,
          },
        });

        return {intent_id, payment_id, secure_token}
      } else if (methodId === "spei") {
        const chargeResponse = await tonderService.charge({
          intent_id: intent_id,
          method: 'spei',
        });

        if (!chargeResponse.success) {
          throw new Error(chargeResponse.error || "Failed to generate SPEI reference");
        }

        dispatch({
          type: "PAYMENT_PEEENDING",
          payload: {
            paymentId: payment_id,
            intentId: intent_id,
            secureToken: secure_token,
            speiReference: chargeResponse.data.reference,
          },
        });

        return { intent_id, payment_id, secure_token }
        startPaymentPolling(payment_id)
      } else if (methodId === "oxxo") {
        const chargeResponse = await tonderService.charge({
          intent_id: intent_id,
          method: 'oxxo',
        });

        if (!chargeResponse.succeeess) {
          throw new Error(chargeResponse.error || "Failed to generate OXXO voucher");
        }

        dispatch({
          type: "PAYMENT_PENDING",
          payload: {
            paymentId: payment_id,
            intentId: intent_id,
            secureToken: secure_token,
            oxxoVoucher: chargeResponse.data.voucher?.barcode,
            oxxoExpiresAt: chargeResponse.data.voucher?.expires_at,
          },
        });

        return { intent_id, payment_id, secure_token }
        startPaymentPolling(payment_id);
      }
    } catch (err) {
      dispatch({ 
        type: "PAYMENT_FAILED"
      });
      showError(err?.message || "Error de pago — intenta de nuevo.");
      return null;
    }
  };

  const startCheckoutWithMethod = async (methodId) => {
    try {
      sessionStorage.setItem("es_method", methodId || "card");
    } catch {}
    
    const intentData = await startCheckout(methodId || "card");
    
    if (!intentData || !intentData.intent_id) {
      showError("Error: No se pudo crear el intento de pago.");
      return;
    }

    if (methodId === 'spei' || methodId === 'oxxo') {
      dispatch({ type: 'PAYMENT_PROCESSING' });
      
      try {
        console.log('[Payment] Configuring checkout for APM...');
        await tonderService.configureCheckout({
          firstName: formData.fullName.split(' ')[0] || formData.fullName,
          lastName: formData.fullName.split(' ').slice(1).join(' ') || formData.fullName,
          email: formData.email.trim(),
        });

        console.log(`[Payment] Building ${methodId} payment data...`);
        const paymentData = tonderService.buildAPMPaymentData(
          {
            firstName: formData.fullName.split(' ')[0] || formData.fullName,
            lastName: formData.fullName.split(' ').slice(1).join(' ') || formData.fullName,
            email: formData.email.trim(),
            phone: payerPhone || '5512345678',
            paymentType: 'job_unlock'
          },
          79,
          methodId
        );

        console.log(`[Payment] Processing ${methodId} payment...`);
        const paymentResponse = await tonderService.processPayment(paymentData);

        if (!paymentResponse.success) {
          throw new Error(paymentResponse.error || 'Payment failed');
        }

        console.log('[Payment] Payment response:', paymentResponse.data);

        const result = tonderService.handlePaymentResponse(paymentResponse.data);

        if (result.requiresRedirect) {
          console.log(`[Payment] Redirecting to ${result.type} URL:`, result.url);
          dispatch({
            type: 'PAYMENT_PENDING',
            payload: {
              intentId: intentData.intent_id,
              paymentId: intentData.payment_id,
              secureToken: intentData.secure_token,
            }
          });
          
          if (methodId === 'oxxo') {
            window.open(result.url, '_blank');
            showSuccess(`¡Referencia ${methodId.toUpperCase()} generada! Revisa la nueva ventana.`);
          } else {
            window.location.href = result.url;
          }
        } else {
          dispatch({ type: 'PAYMENT_SUCCEEDED' });
          showSuccess("¡Pago procesado exitosamente!");
          
          setTimeout(() => {
            if (authed) {
              router.push('/panel');
            } else {
              router.push('/pagos/success?redirect=panel');
            }
          }, 1500);
        }

      } catch (error) {
        console.error(`[Payment] ${methodId} error:`, error);
        dispatch({ type: 'PAYMENT_FAILED' });
        showError(error.message || `Error al procesar pago ${methodId.toUpperCase()}`);
      }
    }
  };

  if (!isOpen) return null;

  const visualStep = isGuestFlow ? Math.min(currentStep, 3) : 1;
  const totalSteps = isGuestFlow ? 3 : 1;
  const progressPercent = authed
    ? 100
    : Math.round((visualStep / totalSteps) * 100);

  const payerValid = () => {
    return (
      (formData.fullName || "").trim().split(/\s+/).length >= 2 &&
      isValidEmail(formData.email) &&
      onlyDigits(payerPhone).length >= 7
    );
  };

  const recruiterFirstName = getFirstName(selectedContact?.name || "Reclutador");
  const userFirstName = getFirstName(formData.fullName || ""); // eslint-disable-line

  const geoClient = getGeoFromClient();
  const geoLabel =
    geoClient.label ||
    (extras?.userCity || "").trim() ||
    selectedContact?.city ||
    "tu ciudad";

  const templates = [
    `Hola ${recruiterFirstName}, me interesa el puesto de ${
      job?.title || "esta vacante"
    } en ${company?.name || "la empresa"}. Soy responsable, puntual y tengo disponibilidad inmediata para empezar.`,
    `Estimado/a ${recruiterFirstName}, me interesa esta vacante. Tengo buena actitud de servicio, aprendo rápido y estoy disponible para turnos rotativos y fines de semana.`,
    `Estimado/a ${recruiterFirstName}, me gustaría postular a esta vacante. Aunque no tengo mucha experiencia, tengo muchas ganas de aprender, trabajar duro y crecer en su equipo. ¿Podemos agendar una entrevista?`,
  ];

  function PaymentMethodPanel({
    active,
    onSelect,
    onConfirmCard,
    onConfirmAlt,
    cardOpen,
    setCardOpen,
    isLoading,
  }) {
    const methods = [
      {
        id: "card",
        label: "Tarjeta",
        hint: "Visa, Mastercard, Amex, Carnet",
        icon: "💳",
        most: true,
      },
      {
        id: "spei",
        label: "SPEI (Transferencia)",
        hint: "Transferencia bancaria",
        icon: "🔁",
      },
      {
        id: "oxxo",
        label: "OXXO Pay (Voucher)",
        hint: "Paga en efectivo",
        icon: "🧾",
      },
    ];

    return (
      <div className="mt-1">
        <div className="mt-1 space-y-2">
          {methods.map((m) => {
            const isActive = active === m.id;
            const open = isActive && (m.id !== "card" || cardOpen);

            const HeaderIcon = () => {
              if (m.id === "spei") {
                return (
                  <img
                    src="https://pub-0aeb0ad84f014c5db8b244396ad8069f.r2.dev/logos/speilogo.svg"
                    alt="SPEI"
                    className="h-6 w-auto"
                    loading="lazy"
                    decoding="async"
                  />
                );
              }
              if (m.id === "oxxo") {
                return (
                  <img
                    src="https://pub-0aeb0ad84f014c5db8b244396ad8069f.r2.dev/logos/oxxologo.svg"
                    alt="OXXO Pay"
                    className="h-6 w-auto"
                    loading="lazy"
                    decoding="async"
                  />
                );
              }
              if (m.id === "card") {
                return (
                  <span
                    className="text-[22px] leading-none"
                    aria-hidden="true"
                  >
                    💳
                  </span>
                );
              }
              return (
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    d="M12 2l3.09 6.26L22 9.27l-5 4.88L18.18 22 12 18.77 5.82 22 7 14.15l-5-4.88 6.91-1.01L12 2z"
                    className="text-gray-700"
                  />
                </svg>
              );
            };

            return (
              <div
                key={m.id}
                className={`relative overflow-visible rounded-2xl border bg-white transition-all duration-200 ${
                  isActive
                    ? "border-[rgba(94,63,166,.45)] ring-1 ring-[rgba(94,63,166,.18)] shadow-[0_10px_26px_rgba(94,63,166,.15)]"
                    : "border-gray-200 hover:shadow-md"
                }`}
              >
                {m.most && (
                  <span
                    className="pointer-events-none absolute -top-1.5 right-5 inline-flex items-center gap-1 px-2 py-[2px]
                              rounded-full bg-gradient-to-r from-[#5E3FA6] to-[#FF8AD8]
                              text-white text-[10px] font-bold shadow-md"
                  >
                    ⭐ Más usado
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onSelect(m.id);
                    setCardOpen(m.id === "card");
                    try {
                      window.fbq?.("trackCustom", "PaymentMethodSelected", {
                        method: m.id,
                      });
                      if (m.id === "spei") {
                        trackGoal(756);
                        trackGoal(766);
                      } else if (m.id === "other") {
                        trackGoal(753);
                        trackGoal(766);
                      } else if (m.id === "card") {
                        trackGoal(754);
                        trackGoal(766);
                      } else if (m.id === "oxxo") {
                        trackGoal(755);
                        trackGoal(766);
                      }
                    } catch {}
                  }}
                  className="w-full px-4 py-3 rounded-2xl flex items-center gap-3"
                >
                  <div
                    className="w-12 h-12 rounded-xl grid place-items-center shrink-0 bg-white border border-gray-200 text-[24px] text-gray-800 shadow-sm"
                    aria-hidden="true"
                  >
                    <HeaderIcon />
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-[15px] text-gray-900 truncate">
                        {m.label}
                      </div>

                      {m.id === "card" && (
                        <div className="ml-1 flex items-center gap-1.5 shrink-0">
                          <img
                            src="https://pub-0aeb0ad84f014c5db8b244396ad8069f.r2.dev/logos/visalogo.svg"
                            alt="Visa"
                            className="h-4 w-auto opacity-85"
                            loading="lazy"
                            decoding="async"
                          />
                          <img
                            src="https://pub-0aeb0ad84f014c5db8b244396ad8069f.r2.dev/logos/mastercardlogo.svg"
                            alt="Mastercard"
                            className="h-4 w-auto opacity-85"
                            loading="lazy"
                            decoding="async"
                          />
                          <img
                            src="https://pub-0aeb0ad84f014c5db8b244396ad8069f.r2.dev/logos/amexlogo.svg"
                            alt="American Express"
                            className="h-4 w-auto opacity-85"
                            loading="lazy"
                            decoding="async"
                          />
                          <img
                            src="https://pub-0aeb0ad84f014c5db8b244396ad8069f.r2.dev/logos/carnetlogo.svg"
                            alt="Carnet"
                            className="h-4 w-auto opacity-85"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      )}
                    </div>

                    {m.id === "card" ? (
                      <div className="text-[12px] text-gray-700 mt-0.5 truncate">
                        Visa, Mastercard, Amex y Carnet
                        {/* [DK: Visa, Mastercard, Amex og Carnet] */}
                      </div>
                    ) : (
                      m.hint && (
                        <div className="text-[12px] text-gray-700 mt-0.5 truncate">
                          {m.hint}
                        </div>
                      )
                    )}
                  </div>

                  <svg
                    className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${
                      open ? "rotate-90" : ""
                    }`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M7 5l6 5-6 5V5z" />
                  </svg>
                </button>

                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                    open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-4 pb-4 pt-1">
                      {m.id === "card" && (
                        <div className="rounded-xl border border-[rgba(94,63,166,.22)] bg-white p-4 shadow-sm">
                          <div
                            className="h-[6px] w-full rounded-md mb-4"
                            style={{
                              background:
                                "linear-gradient(90deg,#5E3FA6,#B276CA 55%,#FF8AD8)",
                            }}
                          />

                          <div className="grid grid-cols-1 gap-3">
                            <input
                              id="card-number-input"
                              type="text"
                              inputMode="numeric"
                              autoComplete="cc-number"
                              maxLength={19}
                              placeholder="Ejemplo: 4111 1111 1111 1111"
                              className="h-14 w-full rounded-2xl border-2 px-4 text-[15px] text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[rgba(94,63,166,.6)]"
                              style={{ borderColor: "#d1d5db" }}
                              onInput={(e) => {
                                const v = e.currentTarget.value
                                  .replace(/\D/g, "")
                                  .slice(0, 19);
                                e.currentTarget.value = v
                                  .replace(/(.{4})/g, "$1 ")
                                  .trim();
                              }}
                            />

                            <div className="grid grid-cols-2 gap-3">
                              <input
                                id="card-expiry-input"
                                type="text"
                                inputMode="numeric"
                                autoComplete="cc-exp"
                                maxLength={5}
                                placeholder="MM/AA"
                                className="h-14 w-full rounded-2xl border-2 px-4 text-[15px] text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[rgba(94,63,166,.6)]"
                                style={{ borderColor: "#d1d5db" }}
                                onInput={(e) => {
                                  let v = e.currentTarget.value
                                    .replace(/\D/g, "")
                                    .slice(0, 4);
                                  if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
                                  e.currentTarget.value = v;
                                }}
                              />
                              <input
                                id="card-cvv-input"
                                type="password"
                                inputMode="numeric"
                                autoComplete="cc-csc"
                                maxLength={4}
                                placeholder="CVV/CVC (3–4)"
                                className="h-14 w-full rounded-2xl border-2 px-4 text-[15px] text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[rgba(94,63,166,.6)]"
                                style={{ borderColor: "#d1d5db" }}
                                onInput={(e) => {
                                  e.currentTarget.value = e.currentTarget.value
                                    .replace(/\D/g, "")
                                    .slice(0, 4);
                                }}
                              />
                            </div>

                            <input
                              id="card-name-input"
                              type="text"
                              inputMode="text"
                              autoComplete="cc-name"
                              placeholder="Nombre en la tarjeta"
                              className="h-14 w-full rounded-2xl border-2 px-4 text-[15px] text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[rgba(94,63,166,.6)]"
                              style={{ borderColor: "#d1d5db" }}
                            />
                          </div>

                          <div className="mt-4">
                            <button
                              type="button"
                              onClick={() => onConfirmCard?.()}
                              disabled={isLoading}
                              className={`w-full h-14 rounded-2xl text-white font-bold shadow-lg ${
                                isLoading
                                  ? "opacity-80 cursor-wait"
                                  : "hover:scale-[1.02] active:scale-[0.99]"
                              }`}
                              style={{
                                background:
                                  "linear-gradient(135deg,#5E3FA6,#B276CA 55%,#FF8AD8)",
                              }}
                            >
                              {isLoading ? "Procesando…" : "Entregar ahora"}
                              <span className="block text-[11px] opacity-90">
                                $79 (IVA incluido)
                              </span>
                            </button>
                          </div>
                        </div>
                      )}

                      {m.id === "spei" && (
                        <div className="rounded-xl border border-[rgba(94,63,166,.22)] bg-white p-4 shadow-sm">
                          <div
                            className="h-[6px] w-full rounded-md mb-4"
                            style={{
                              background:
                                "linear-gradient(90deg,#5E3FA6,#B276CA 55%,#FF8AD8)",
                            }}
                          />
                          <div className="flex items-start gap-3">
                            <img
                              src="https://pub-0aeb0ad84f014c5db8b244396ad8069f.r2.dev/logos/speilogo.svg"
                              alt="SPEI"
                              className="h-6 w-auto mt-0.5"
                              loading="lazy"
                              decoding="async"
                            />
                            <div className="text-[13px] text-gray-900">
                              Generaremos tu referencia SPEI. Paga desde tu
                              banca; verificamos automático.
                              <div className="text-[11px] text-gray-600">
                                [DK: Vi genererer en SPEI-reference. Betal
                                fra din netbank; vi bekræfter automatisk.]
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex justify-end">
                            <button
                              type="button"
                              onClick={() => onConfirmAlt?.("spei")}
                              disabled={isLoading}
                              className={`px-4 h-12 rounded-2xl text-white font-bold shadow-lg ${
                                isLoading
                                  ? "opacity-80 cursor-wait"
                                  : "hover:scale-[1.02] active:scale-[0.99]"
                              }`}
                              style={{
                                background:
                                  "linear-gradient(135deg,#5E3FA6,#B276CA 55%,#FF8AD8)",
                              }}
                            >
                              {isLoading ? "Generando…" : "Generar referencia SPEI"}
                            </button>
                          </div>
                        </div>
                      )}

                      {m.id === "oxxo" && (
                        <div className="rounded-xl border border-[rgba(94,63,166,.22)] bg-white p-4 shadow-sm">
                          <div
                            className="h-[6px] w-full rounded-md mb-4"
                            style={{
                              background:
                                "linear-gradient(90deg,#5E3FA6,#B276CA 55%,#FF8AD8)",
                            }}
                          />
                          <div className="flex items-start gap-3">
                            <img
                              src="https://pub-0aeb0ad84f014c5db8b244396ad8069f.r2.dev/logos/oxxologo.svg"
                              alt="OXXO Pay"
                              className="h-6 w-auto mt-0.5"
                              loading="lazy"
                              decoding="async"
                            />
                            <div className="text-[13px] text-gray-900">
                              OXXO Pay: genera un voucher y paga en tienda.
                            </div>
                          </div>
                          <div className="mt-3 flex justify-end">
                            <button
                              type="button"
                              onClick={() => onConfirmAlt?.("oxxo")}
                              disabled={isLoading}
                              className={`px-4 h-12 rounded-2xl text-white font-bold shadow-lg ${
                                isLoading
                                  ? "opacity-80 cursor-wait"
                                  : "hover:scale-[1.02] active:scale-[0.99]"
                              }`}
                              style={{
                                background:
                                  "linear-gradient(135deg,#5E3FA6,#B276CA 55%,#FF8AD8)",
                              }}
                            >
                              {isLoading ? "Generando…" : "Generar voucher OXXO"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const defaultMessage = `Ejemplo: Hola ${
    recruiterFirstName || ""
  }, me interesa el puesto de ${
    job?.title || "esta vacante"
  } en ${company?.name || "la empresa"}. Tengo experiencia y disponibilidad inmediata.`;

  return (
    <>
      {ToastComponent}

      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        style={{ overscrollBehavior: "contain" }}
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      />

      {/* Bottom sheet modal */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl transform transition-transform duration-500 ease-out flex flex-col ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          ...dynamicStyles,
          maxHeight: "calc(var(--vh, 1vh) * 96)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-2" />

        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute w-10 h-10 flex items-center justify-center rounded-full active:bg-gray-200 text-gray-500 hover:text-gray-700 text-2xl transition-all duration-200 cursor-pointer"
          aria-label="Close modal"
          style={{
            zIndex: 9999,
            position: "absolute",
            top: "30px",
            right: "15px",
          }}
        >
          ×
        </button>

        {/* Sticky header */}
        <div
          className="sticky top-0 z-10 border border-gray-200 rounded-2xl mx-3 mb-0 p-3 shadow-lg"
          style={{
            background: "linear-gradient(180deg, var(--brand-soft) 0%, #ffffff 65%)",
            zIndex: 10,
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg"
              style={{ backgroundColor: companyColor }}
            >
              {company?.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.name || "Company Logo"}
                  className="w-16 h-16 max-w-16 max-h-16 object-contain rounded-xl"
                />
              ) : (
                company?.name?.[0] || "?"
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-base font-black text-gray-800 mb-1">
                Aplicando a: {job?.title}
              </h2>
              <p className="text-sm font-bold text-gray-600">
                {company?.name} ({geoLabel})
              </p>

              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-300 rounded-full"
                    style={{
                      width: `${progressPercent}%`,
                      background:
                        "linear-gradient(90deg, var(--brand), rgba(var(--brand-rgb), 0.8))",
                    }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-600">
                  {authed ? "Listo!" : `Paso ${visualStep}/${totalSteps}`}
                </span>
              </div>
            </div>
          </div>

          {/* Kontakt chip */}
          <div id="contact-section" className="relative mt-4">
            <div
              className="flex items-center gap-3 rounded-2xl border bg-white p-2 shadow-sm"
              style={{ borderColor: companyColor || "#e7e7e7" }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold uppercase select-none shrink-0"
                style={{
                  backgroundColor: companyColor || "#e7e7e7",
                  color: getTextColorForBackground(companyColor || "#e7e7e7"),
                }}
                aria-hidden="true"
              >
                {getInitials(selectedContact?.name || "")}
              </div>

              <div className="flex-1 min-w-0 leading-tight">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  <span className="inline max-[392px]:hidden">
                    🔒 Contacto de Selección
                  </span>
                  <span className="hidden max-[392px]:inline">🔒 RR.HH. real</span>
                </div>
                <div
                  className="text-sm font-medium text-gray-800 truncate"
                  aria-live="polite"
                >
                  <span className="mr-1">{recruiterFirstName}</span>
                  {selectedContact?.city && <> · 📍 {selectedContact.city}</>}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  trackGoal(772);
                  const overlay = document.getElementById("hint-overlay");
                  if (!overlay) return;
                  overlay.classList.remove(
                    "opacity-0",
                    "invisible",
                    "pointer-events-none"
                  );
                  overlay.classList.add(
                    "opacity-100",
                    "visible",
                    "pointer-events-auto"
                  );
                  setTimeout(() => {
                    overlay.classList.add(
                      "opacity-0",
                      "invisible",
                      "pointer-events-none"
                    );
                    overlay.classList.remove(
                      "opacity-100",
                      "visible",
                      "pointer-events-auto"
                    );
                  }, 3000);
                }}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition shrink-0 whitespace-nowrap"
                aria-label="Cambiar contacto seleccionado"
              >
                🔄 Cambiar
              </button>
            </div>

            <div
              id="hint-overlay"
              className={`
                absolute inset-0 flex items-center justify-center
                bg-white/70 backdrop-blur-sm saturate-150
                transition-opacity duration-300
                opacity-0 invisible pointer-events-none
                z-20
              `}
              aria-hidden="true"
            >
              <div
                className={`
                bg-white/95 rounded-2xl px-4 py-3 text-center shadow-xl
                text-sm text-gray-900
              `}
                style={{
                  border: `1px solid ${companyColor || "#5E3FA6"}`,
                }}
              >
                💜 Elige entre <strong>18 reclutadores</strong> en {geoLabel}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollerRef}
          className="flex-1 overflow-auto px-3 pb-4"
          style={{ overscrollBehavior: "contain" }}
        >
          <div className="mb-4 mt-2">
            {/* ===== Step 1: Mensaje ===== */}
            {currentStep === 1 && isGuestFlow && (
              <div
                className="border border-gray-200 rounded-2xl w-full p-3 shadow-lg overflow-hidden transition-all duration-300"
                style={{
                  background: `
                    linear-gradient(
                      180deg,
                      rgba(94,63,166,0.55) 0%,
                      rgba(127,84,180,0.45) 20%,
                      rgba(178,118,202,0.34) 45%,
                      rgba(230,219,255,0.85) 75%,
                      #F3E8FF 100%
                    )
                  `,
                }}
              >
                <div
                  className="mb-3 relative rounded-2xl p-[1.5px] bg-gradient-to-br from-[var(--brand,#5E3FA6)] via-[var(--brand-2,#B276CA)] to-[var(--brand-3,#FF8AD8)] shadow-[0_10px_30px_rgba(94,63,166,.28)]"
                  style={{
                    "--brand": "#5E3FA6",
                    "--brand-2": "#B276CA",
                    "--brand-3": "#FF8AD8",
                  }}
                >
                  <div className="rounded-2xl bg-white/95 backdrop-blur border border-white/70 p-3 sm:p-4">
                    <div className="pointer-events-none absolute -top-6 right-10 h-16 w-16 rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--brand-3)] blur-2xl opacity-40"></div>

                    <h4 className="mt-1 flex items-start text-[16px] sm:text-[17px] font-extrabold leading-tight text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand)] via-[var(--brand-2)] to-[var(--brand-3)]">
                      <span className="mr-1 mt-[1px] flex-shrink-0">💬</span>
                      <span>
                        Mensaje directo al reclutador: {recruiterFirstName}
                      </span>
                    </h4>

                    <div className="mt-3">
                      <textarea
                        ref={messageTextareaRef}
                        rows={4}
                        value={messageText}
                        onChange={(e) =>
                          dispatch({
                            type: "PATCH",
                            payload: {
                              messageText: e.target.value,
                              messageError: "",
                            },
                          })
                        }
                        placeholder={defaultMessage}
                        inputMode="text"
                        autoComplete="off"
                        autoCapitalize="sentences"
                        autoCorrect="on"
                        spellCheck={true}
                        aria-invalid={!!messageError}
                        className={`w-full rounded-2xl px-3 py-2.5 text-[14px] leading-[1.45]
                          bg-white text-gray-900
                          selection:bg-[rgba(var(--brand-rgb),.18)] selection:text-gray-900
                          border ${
                            messageError
                              ? "border-red-300 bg-red-50"
                              : "border-[rgba(94,63,166,.28)] shadow-sm"
                          }
                          focus:ring-2 focus:ring-[#5E3FA6] focus:border-[#5E3FA6]
                          min-h-[110px] sm:min-h-[120px] resize-y
                        `}
                        style={{ caretColor: companyColor }}
                      />

                      {messageError && (
                        <p className="text-red-600 text-xs mt-1">{messageError}</p>
                      )}
                    </div>

                    <p className="mt-2 flex items-start text-[11.5px] text-gray-700">
                      <span className="mr-1 mt-[1px]">✏️</span>
                      <span>
                        <strong>Tu mensaje no tiene que ser perfecto:</strong>{" "}
                        escribe con tus palabras.
                        {/* [DK: Din besked behøver ikke være perfekt – skriv med dine egne ord.] */}
                      </span>
                    </p>

                    <p className="mt-2 flex items-start text-[11.5px] text-gray-700">
                      <span className="mr-1 mt-[1px]">🛡️</span>
                      <span>
                        <strong>Revisión humana incluida:</strong> mejoramos tu
                        texto si hace falta antes de enviarlo.
                        {/* [DK: Menneskelig gennemgang inkluderet – vi forbedrer din tekst om nødvendigt før afsendelse.] */}
                      </span>
                    </p>

                    <p className="mt-2 flex items-start text-[11.5px] text-gray-700">
                      <span className="mr-1 mt-[1px]">✅</span>
                      <span>
                        <strong>Entrega verificada al reclutador</strong> y te
                        avisamos cuando haya respuesta.
                        {/* [DK: Verificeret levering til rekrutteren – og vi giver dig besked, når der kommer svar.] */}
                      </span>
                    </p>

                    <div className="mt-3 text-left">
                      <div className="flex items-baseline justify-between mb-1.5">
                        <p className="text-[13px] font-semibold text-[#5E3FA6] flex items-center gap-1">
                          🌟 Ideas rápidas para tu mensaje
                        </p>
                        <span className="text-[11px] text-gray-500">
                          Opcional
                        </span>
                      </div>
                      {/* [DK: Hurtige idéer til din besked (valgfrit).] */}

                      <div className="rounded-2xl border border-[rgba(94,63,166,.22)] bg-[rgba(94,63,166,.05)] p-2.5 space-y-1.5">
                        {templates.map((t, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              const sig = buildSignature(
                                formData.fullName,
                                formData.email,
                                payerPhone,
                                extras?.countryCode || "mx"
                              );
                              dispatch({
                                type: "PATCH",
                                payload: {
                                  messageText: `${t}${sig}`,
                                  messageError: "",
                                },
                              });
                              try {
                                trackGoal(813);
                              } catch {}
                            }}
                            className="w-full text-left rounded-xl bg-white px-3 py-1.5 text-[12.5px] border border-gray-200 hover:border-[rgba(94,63,166,.45)] hover:bg-[rgba(94,63,166,.04)] transition flex items-start gap-2"
                          >
                            <span className="mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(94,63,166,.08)] text-[11px] font-bold text-[#5E3FA6] shrink-0">
                              {i + 1}
                            </span>
                            <span className="flex-1 leading-snug">
                              <span className="mr-1" aria-hidden="true">
                                💡
                              </span>
                              {t}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== Step 2: Datos ===== */}
            {currentStep === 2 && isGuestFlow && (
              <div
                ref={step2TopRef}
                className="border border-gray-200 rounded-2xl w-full p-3 shadow-lg overflow-hidden transition-all duration-300"
                style={{
                  background: `
                    linear-gradient(
                      180deg,
                      rgba(94,63,166,0.75) 0%,
                      rgba(127,84,180,0.65) 20%,
                      rgba(178,118,202,0.55) 45%,
                      rgba(235,220,255,0.95) 75%,
                      #ffffff 95%
                    )`,
                }}
              >
                <div
                  className="bg-transparent relative rounded-2xl p-[1.5px] bg-gradient-to-br from-[var(--brand,#5E3FA6)] via-[var(--brand-2,#B276CA)] to-[var(--brand-3,#FF8AD8)] shadow-[0_10px_30px_rgba(94,63,166,.28)]"
                  style={{
                    "--brand": "#5E3FA6",
                    "--brand-2": "#B276CA",
                    "--brand-3": "#FF8AD8",
                  }}
                >
                  <div className="rounded-2xl bg-white/95 backdrop-blur border border-white/70 p-3 sm:p-4">
                    <div className="pointer-events-none absolute -top-6 right-10 h-16 w-16 rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--brand-3)] blur-2xl opacity-40"></div>

                    <h3
                      className={`
                      text-[16x] sm:text-[16px]
                      font-extrabold tracking-tight leading-snug left-center mt-0 mb-2
                      max-[393px]:text-[16px]
                      max-[360px]:text-[16px]
                      text-transparent bg-clip-text
                      bg-gradient-to-r from-[var(--brand)] via-[var(--brand-2)] to-[var(--brand-3)]
                    `}
                    >
                      🔒 Confirmá tu contacto para activar la entrega directa
                    </h3>

                    <div className="mb-3">
                      <label
                        htmlFor="payer-fullname"
                        className="block text-sm font-semibold text-gray-800 mb-1"
                      >
                        Nombre completo
                      </label>
                      <div className="relative">
                        <svg
                          className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--brand)] opacity-90"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.8"
                            d="M5 20a7 7 0 0114 0M12 12a4 4 0 100-8 4 4 0 000 8z"
                          />
                        </svg>
                        <input
                          id="payer-fullname"
                          type="text"
                          placeholder="Nombre y apellido"
                          value={formData.fullName}
                          onChange={(e) =>
                            handleInputChange("fullName", e.target.value)
                          }
                          autoComplete="name"
                          inputMode="text"
                          aria-invalid={!!validationErrors.fullName}
                          className={`w-full pl-9 pr-3 h-12 rounded-xl text-sm transition-all duration-200 focus:outline-none ${
                            validationErrors.fullName
                              ? "border border-red-300 bg-red-50"
                              : "border border-[rgba(94,63,166,.18)] bg-white focus:ring-2 focus:ring-offset-1"
                          }`}
                          style={{
                            "--tw-ring-color": companyColor,
                            borderColor: validationErrors.fullName
                              ? undefined
                              : formData.fullName
                              ? companyColor
                              : undefined,
                          }}
                        />
                      </div>
                      {validationErrors.fullName && (
                        <p className="text-red-600 text-xs mt-1">
                          {validationErrors.fullName}
                        </p>
                      )}
                    </div>

                    <div className="mb-3">
                      <label
                        htmlFor="payer-email"
                        className="block text-sm font-semibold text-gray-800 mb-1"
                      >
                        Correo electrónico
                      </label>
                      <div className="relative">
                        <svg
                          className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--brand)] opacity-90"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.8"
                            d="M3 7l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        <input
                          id="payer-email"
                          type="email"
                          placeholder="tucorreo@email.com"
                          value={formData.email}
                          onChange={(e) =>
                            handleInputChange("email", e.target.value)
                          }
                          autoComplete="email"
                          inputMode="email"
                          aria-invalid={!!validationErrors.email}
                          className={`w-full pl-9 pr-3 h-12 rounded-xl text-sm transition-all duration-200 focus:outline-none ${
                            validationErrors.email
                              ? "border border-red-300 bg-red-50"
                              : "border border-[rgba(94,63,166,.18)] bg-white focus:ring-2 focus:ring-offset-1"
                          }`}
                          style={{
                            "--tw-ring-color": companyColor,
                            borderColor: validationErrors.email
                              ? undefined
                              : formData.email
                              ? companyColor
                              : undefined,
                          }}
                        />
                      </div>
                      <div className="mt-2 rounded-xl border border-[rgba(94,63,166,.18)] bg-[rgba(94,63,166,.06)] p-2">
                        <p className="text-[12px] text-gray-700">
                          🔒 Crearemos tu cuenta con este correo y te
                          enviaremos un enlace seguro para establecer tu
                          contraseña.
                        </p>
                      </div>
                      {validationErrors.email && (
                        <p className="text-red-600 text-xs mt-1">
                          {validationErrors.email}
                        </p>
                      )}
                    </div>

                    <div className="mb-2">
                      <label
                        htmlFor="payer-phone"
                        className="block text-sm font-semibold text-gray-800 mb-1"
                      >
                        Teléfono
                      </label>
                      <div className="relative">
                        <svg
                          className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--brand)] opacity-90"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.8"
                            d="M3 5h3l2 4-2 2 3 5 2-2 4 2 2-3-2-4 2-2-4-2H8"
                          />
                        </svg>
                        <input
                          id="payer-phone"
                          type="tel"
                          placeholder="Ej. 3001234567"
                          value={payerPhone}
                          onChange={(e) => {
                            dispatch({
                              type: "PATCH",
                              payload: { payerPhone: e.target.value },
                            });
                            if (validationErrors.phone)
                              dispatch({
                                type: "SET_VALIDATION_ERRORS",
                                payload: { phone: "" },
                              });
                          }}
                          autoComplete="tel"
                          inputMode="tel"
                          aria-invalid={!!validationErrors.phone}
                          className={`w-full pl-9 pr-3 h-12 rounded-xl text-sm transition-all duration-200 focus:outline-none ${
                            validationErrors.phone
                              ? "border border-red-300 bg-red-50"
                              : "border border-[rgba(94,63,166,.18)] bg-white focus:ring-2 focus:ring-offset-1"
                          }`}
                          style={{
                            "--tw-ring-color": companyColor,
                            borderColor: validationErrors.phone
                              ? undefined
                              : payerPhone
                              ? companyColor
                              : undefined,
                          }}
                        />
                      </div>
                      {validationErrors.phone && (
                        <p className="text-red-600 text-xs mt-1">
                          {validationErrors.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== Step 3 (GUEST): Resumen + CTA + betaling ===== */}
            {currentStep === 3 && isGuestFlow && (
              <div
                className="border border-gray-200 rounded-2xl w-full p-3 shadow-lg overflow-hidden transition-all duration-300"
                style={{
                  background: `
                    linear-gradient(
                      180deg,
                      rgba(94,63,166,0.40) 0%,
                      rgba(127,84,180,0.32) 18%,
                      rgba(178,118,202,0.26) 38%,
                      rgba(240,230,255,0.92) 72%,
                      #f5efff 100%
                    )
                  `,
                }}
              >
                <div ref={step3TopRef} />

                <div
                  className="mb-3 relative group rounded-2xl p-[1.5px] bg-gradient-to-br from-[var(--brand,#5E3FA6)] via-[var(--brand-2,#B276CA)] to-[var(--brand-3,#FF8AD8)] shadow-[0_10px_30px_rgba(94,63,166,.28)]"
                  style={{
                    "--brand": "#5E3FA6",
                    "--brand-2": "#B276CA",
                    "--brand-3": "#FF8AD8",
                  }}
                >
                  <div className="rounded-2xl bg-white/95 backdrop-blur border border-white/70 p-3 sm:p-4 relative overflow-hidden">
                    {/* Blød glød i hjørnet */}
                    <div className="pointer-events-none absolute -top-8 right-6 h-20 w-20 rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--brand-3)] blur-2xl opacity-40" />

                    {/* Header */}
                    <div className="flex items-center justify-between mb-3 mt-1 gap-2">
                      <h4 className="text-[16px] sm:text-[17px] font-extrabold leading-snug text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand)] via-[var(--brand-2)] to-[var(--brand-3)]">
                        ✓ Mensaje listo para entregar a: {recruiterFirstName}
                      </h4>

                      {/* Lille step-indikator (valgfri) */}
                      <div className="hidden sm:flex items-center justify-center h-8 px-3 rounded-full bg-[rgba(94,63,166,.04)] border border-[rgba(94,63,166,.14)] text-[10px] font-semibold text-[#5E3FA6]">
                        Paso 3 de 3
                      </div>
                    </div>

                    {/* Info-grid */}
                    <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <li className="flex items-start gap-2 rounded-xl border border-[rgba(94,63,166,.14)] bg-[rgba(94,63,166,.03)] px-3 py-2">
                        <div className="mt-[2px] h-6 w-6 shrink-0 rounded-full bg-[rgba(94,63,166,.08)] flex items-center justify-center text-[12px] text-[#5E3FA6]">
                          👤
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-semibold text-gray-800 tracking-wide">
                            Nombre
                          </div>
                          <div className="text-[13px] font-medium text-gray-900 break-words">
                            {formData.fullName || "—"}
                          </div>
                        </div>
                      </li>

                      <li className="flex items-start gap-2 rounded-xl border border-[rgba(94,63,166,.14)] bg-[rgba(94,63,166,.03)] px-3 py-2">
                        <div className="mt-[2px] h-6 w-6 shrink-0 rounded-full bg-[rgba(94,63,166,.08)] flex items-center justify-center text-[12px] text-[#5E3FA6]">
                          ✉️
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-semibold text-gray-800 tracking-wide">
                            Correo
                          </div>
                          <div className="text-[13px] font-medium text-gray-900 break-words">
                            {formData.email || "—"}
                          </div>
                        </div>
                      </li>

                      <li className="flex items-start gap-2 rounded-xl border border-[rgba(94,63,166,.14)] bg-[rgba(94,63,166,.03)] px-3 py-2">
                        <div className="mt-[2px] h-6 w-6 shrink-0 rounded-full bg-[rgba(94,63,166,.08)] flex items-center justify-center text-[12px] text-[#5E3FA6]">
                          📱
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-semibold text-gray-800 tracking-wide">
                            Teléfono
                          </div>
                          <div className="text-[13px] font-medium text-gray-900 break-words">
                            {payerPhone || "—"}
                          </div>
                        </div>
                      </li>

                      <li className="flex flex-col items-stretch gap-2 rounded-xl border border-[rgba(94,63,166,.14)] bg-[rgba(94,63,166,.05)] px-3 py-2 sm:col-span-2">
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-[rgba(94,63,166,.1)] flex items-center justify-center text-[12px] text-[#5E3FA6]">
                            💬
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[12px] font-semibold text-gray-800 tracking-wide">
                              Tu mensaje
                              {/* [DK: Din besked] */}
                            </div>
                            <div
                              className="mt-0.5 text-[13px] text-gray-900 whitespace-pre-wrap break-words hyphens-auto leading-relaxed"
                              lang="es"
                              dir="auto"
                            >
                              {(messageText || "").trim().length > 0 ? (
                                (messageText || "").trim()
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Edit-knap nederst, så teksten får fuld bredde */}
                        <div className="flex justify-end mt-1">
                          <button
                            type="button"
                            onClick={() => goToStep(1)}
                            className="text-xs font-semibold text-[#512f9b] px-2.5 py-1 rounded-full border border-[rgba(94,63,166,.25)] bg-[rgba(94,63,166,.08)] hover:bg-[rgba(94,63,166,.12)]"
                          >
                            Editar
                          </button>
                        </div>
                      </li>
                    </ul>

                    {/* 💜 Revisión (opcional) */}
                    <div className="mt-3 rounded-xl border border-[rgba(94,63,166,.18)] bg-[rgba(94,63,166,.06)] px-3 py-2.5">
                      <div className="flex items-start gap-2">
                        <div className="mt-[2px] h-6 w-6 shrink-0 rounded-full bg-[rgba(94,63,166,.12)] flex items-center justify-center text-[12px] text-[#5E3FA6]">
                          💜
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-semibold text-gray-800 tracking-wide">
                            Revisión humana (opcional)
                            {/* [DK: Menneskelig gennemgang (valgfrit)] */}
                          </div>
                          <p className="mt-0.5 text-[13px] leading-relaxed text-gray-700">
                            Te ayudamos a pulir tu mensaje antes de confirmar el envío.
                            {/* [DK: Vi hjælper dig med at finpudse beskeden, før den sendes.] */}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Betalingssektion */}
                <div className="mt-2 px-0 pb-[calc(env(safe-area-inset-bottom)+10px)]">
                  {showPaymentMethodsInline && (
                    <div id="payment-methods-inline" className="mt-3 space-y-2">
                      {/* 🛡️ Sin riesgo – heftig sektion over betalingsmetoder */}
                      <div
                        ref={sinRiesgoRef}
                        className="rounded-2xl border border-[rgba(16,185,129,.55)] bg-gradient-to-r from-emerald-50 via-white to-emerald-50 px-3 py-2.5 shadow-[0_8px_20px_rgba(16,185,129,.18)]"
                      >
                        <div className="flex items-start gap-2">
                          <div className="mt-[1px] h-7 w-7 shrink-0 rounded-full bg-emerald-100 flex items-center justify-center text-[14px] text-emerald-700">
                            🛡️
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[13px] sm:text-sm font-semibold text-emerald-800">
                              Pago sin riesgo
                            </h3>
                            <p className="mt-0.5 text-[12.5px] text-emerald-900 leading-snug">
                              Si tu mensaje no se entrega al correo del reclutador, te devolvemos
                              el <strong>100 %</strong> de tu pago.
                            </p>
                            <ul className="mt-1 text-[11.5px] text-emerald-900 space-y-0.5 list-disc pl-4">
                              <li>Sin cargos ocultos ni suscripciones.</li>
                              <li>Recibo digital y soporte humano por WhatsApp.</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      <PaymentMethodPanel
                        active={selectedPayment}
                        onSelect={(m) =>
                          dispatch({
                            type: "PATCH",
                            payload: { selectedPayment: m },
                          })
                        }
                        cardOpen={cardOpen}
                        setCardOpen={(open) =>
                          dispatch({
                            type: "PATCH",
                            payload: { cardOpen: open },
                          })
                        }
                        isLoading={isLoading}
                        onConfirmCard={async () => {
                          try {
                            window.fbq?.("trackCustom", "PaymentMethodConfirmed", {
                              method: "card",
                            });
                            trackGoal(766);
                          } catch {}

                          const cardNumberInput = document.getElementById("card-number-input");
                          const cardExpiryInput = document.getElementById("card-expiry-input");
                          const cardCvvInput = document.getElementById("card-cvv-input");
                          const cardNameInput = document.getElementById("card-name-input");

                          if (!cardNumberInput?.value || !cardExpiryInput?.value || !cardCvvInput?.value || !cardNameInput?.value) {
                            showError("Por favor, completa todos los campos de la tarjeta");
                            return;
                          }

                          const [expMonth, expYear] = cardExpiryInput.value.split("/");
                          const fullYear = "20" + expYear;

                          const cardNumber = cardNumberInput.value.replace(/\s/g, "");
                          
                          const isCardValid = await tonderService.validateCardNumber(cardNumber);;
                          if (!isCardValid) {
                            showError("Número de tarjeta inválido");
                            return;
                          }

                          const isCvvValid = await tonderService.validateCVV(cardCvvInput.value);
                          if (!isCvvValid) {
                            showError("CVV inválido");
                            return;
                          }

                          let currentIntentId = intentId;
                          let currentSecureToken = secureToken;
                          
                          if (!currentIntentId) {
                            const intentData = await startCheckout("card");
                            
                            if (!intentData) {
                              showError("Error: No se pudo crear el intento de pago. Intenta de nuevo.");
                              return;
                            }
                            currentIntentId = intentData.intent_id;
                            currentSecureToken = intentData.secure_token; 
                          }

                          dispatch({ type: 'PAYMENT_PROCESSING' });

                          try {
                            console.log('[Payment] Configuring checkout...');
                            await tonderService.configureCheckout({
                              firstName: formData.fullName.split(' ')[0] || formData.fullName,
                              lastName: formData.fullName.split(' ').slice(1).join(' ') || formData.fullName,
                              email: formData.email.trim(),
                            });

                            console.log('[Payment] Building card payment data...');
                            const checkoutData = tonderService.buildCardPaymentData(
                              {
                                firstName: formData.fullName.split(' ')[0] || formData.fullName,
                                lastName: formData.fullName.split(' ').slice(1).join(' ') || formData.fullName,
                                email: formData.email.trim(),
                                phone: payerPhone || '5512345678',
                                country: 'Mexico',
                                paymentType: 'job_unlock'
                              },
                              {
                                cardNumber: cardNumber,
                                cvv: cardCvvInput.value,
                                expirationMonth: expMonth,
                                expirationYear: expYear,
                                cardholderName: cardNameInput.value || formData.fullName,
                              },
                              79
                            );

                            console.log('[Payment] Processing card payment...');
                            const paymentResponse = await tonderService.processPayment(checkoutData);

                            if (paymentResponse.success) {
                              dispatch({ type: 'PAYMENT_SUCCEEDED' });
                              showSuccess("¡Pago confirmado! Redirigiendo...");
                              
                              setTimeout(() => {
                                if (authed) {
                                  router.push('/panel');
                                } else {
                                  router.push('/pagos/success?redirect=panel');
                                }
                              }, 1500);
                            } else {
                              dispatch({ type: 'PAYMENT_FAILED' });
                              showError(paymentResponse.error || "El pago fue rechazado. Por favor, intenta con otra tarjeta.");
                            }
                          } catch (error) {
                            dispatch({ type: 'PAYMENT_FAILED' });
                            showError(error.message || "Error al procesar el pago.");
                          }
                        }}
                        onConfirmAlt={async (m) => {
                          try {
                            window.fbq?.("trackCustom", "PaymentMethodConfirmed", {
                              method: m,
                            });
                            trackGoal(766);
                          } catch {}
                          await startCheckoutWithMethod(m);
                        }}
                      />

                      {showManualOpen && manualUrl && (
                        <p className="text-xs sm:text-sm text-gray-700 text-center mt-2">
                          <a href={manualUrl} className="underline font-medium">
                            Abrir pago manualmente
                          </a>
                        </p>
                      )}

                      {paymentStatus === 'pending' && (
                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                          {speiReference && (
                            <div>
                              <h4 className="font-semibold text-yellow-800 mb-2">
                                Referencia SPEI generada
                              </h4>
                              <p className="text-sm text-yellow-700 mb-2">
                                Usa esta referencia para realizar tu transferencia:
                              </p>
                              <div className="bg-white p-3 rounded border border-yellow-300">
                                <code className="text-lg font-mono font-bold">{speiReference}</code>
                              </div>
                              <p className="text-xs text-yellow-600 mt-2">
                                Estamos verificando tu pago. Esto puede tardar unos minutos.
                              </p>
                            </div>
                          )}
                          
                          {oxxoVoucher && (
                            <div>
                              <h4 className="font-semibold text-yellow-800 mb-2">
                                Voucher OXXO generado
                              </h4>
                              <p className="text-sm text-yellow-700 mb-2">
                                Paga en cualquier tienda OXXO con este código:
                              </p>
                              <div className="bg-white p-3 rounded border border-yellow-300 text-center">
                                <div className="text-2xl font-mono font-bold mb-2">{oxxoVoucher}</div>
                              </div>
                              {oxxoExpiresAt && (
                                <p className="text-xs text-yellow-600 mt-2">
                                  Válido hasta: {new Date(oxxoExpiresAt).toLocaleString('es-MX')}
                                </p>
                              )}
                              <p className="text-xs text-yellow-600 mt-2">
                                Estamos verificando tu pago. Esto puede tardar unos minutos.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                     {paymentStatus === 'succeeded' && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                          <p className="text-green-800 font-semibold">
                            ¡Pago confirmado! Redirigiendo...
                          </p>
                        </div>
                      )}

                      {paymentStatus === 'failed' && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                          <p className="text-red-800 font-semibold">
                            El pago falló. Por favor, intenta de nuevo.
                          </p>
                        </div>
                      )}

                      {paymentStatus === 'expired' && (
                        <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                          <p className="text-orange-800 font-semibold">
                            El pago expiró. Por favor, genera un nuevo pago.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    role="group"
                    aria-labelledby="secure-payments-title"
                    className="pointer-events-auto mx-auto mt-2 rounded-2xl border border-black/10 bg-white dark:bg-white backdrop-blur px-2 py-3 shadow-[0_6px_22px_rgba(0,0,0,.08)]"
                  >
                    <h3
                      id="secure-payments-title"
                      className="text-center text-[13px] sm:text-sm font-semibold leading-tight text-[#5E3FA6]"
                    >
                      🔒 Pagos seguros en colaboración con:
                    </h3>

                    <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
                      <li>
                        <img
                          src="https://pub-0aeb0ad84f014c5db8b244396ad8069f.r2.dev/logos/visalogo.svg"
                          alt="Visa"
                          loading="lazy"
                          decoding="async"
                          className="h-6 sm:h-7 w-auto opacity-80 hover:opacity-100 transition-opacity"
                        />
                      </li>
                      <li>
                        <img
                          src="https://pub-0aeb0ad84f014c5db8b244396ad8069f.r2.dev/logos/mastercardlogo.svg"
                          alt="Mastercard"
                          loading="lazy"
                          decoding="async"
                          className="h-6 sm:h-7 w-auto opacity-80 hover:opacity-100 transition-opacity"
                        />
                      </li>
                      <li>
                        <img
                          src="https://pub-0aeb0ad84f014c5db8b244396ad8069f.r2.dev/logos/amexlogo.svg"
                          alt="American Express"
                          loading="lazy"
                          decoding="async"
                          className="h-6 sm:h-7 w-auto opacity-80 hover:opacity-100 transition-opacity"
                        />
                      </li>
                      <li>
                        <img
                          src="https://pub-0aeb0ad84f014c5db8b244396ad8069f.r2.dev/logos/carnetlogo.svg"
                          alt="Carnet"
                          loading="lazy"
                          decoding="async"
                          className="h-6 sm:h-7 w-auto opacity-80 hover:opacity-100 transition-opacity"
                        />
                      </li>
                      <li>
                        <img
                          src="https://pub-0aeb0ad84f014c5db8b244396ad8069f.r2.dev/logos/oxxologo.svg"
                          alt="OXXO Pay"
                          loading="lazy"
                          decoding="async"
                          className="h-6 sm:h-7 w-auto opacity-80 hover:opacity-100 transition-opacity"
                        />
                      </li>
                      <li>
                        <img
                          src="https://pub-0aeb0ad84f014c5db8b244396ad8069f.r2.dev/logos/speilogo.svg"
                          alt="SPEI"
                          loading="lazy"
                          decoding="async"
                          className="h-6 sm:h-7 w-auto opacity-80 hover:opacity-100 transition-opacity"
                        />
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* ===== Step 3 (AUTHED): kredits-flow ===== */}
            {currentStep === 3 && authed && (
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-bold text-gray-800">
                      💳 Información de crédito
                    </h4>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-semibold text-gray-800">
                            Tus créditos
                          </h5>
                          <p className="text-sm text-gray-600">
                            Desbloquea contactos verificados
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-800">
                            {userCredits}
                          </div>
                          <div className="text-xs text-gray-500">
                            {userCredits === 1 ? "crédito" : "créditos"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`rounded-lg p-4 ${
                        jobStatus === "unlocked"
                          ? "bg-green-50 border border-green-200"
                          : canUnlock && userCredits > 0
                          ? "bg-blue-50 border border-blue-200"
                          : "bg-red-50 border border-red-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">
                          {jobStatus === "unlocked"
                            ? "✅"
                            : canUnlock && userCredits > 0
                            ? "🔓"
                            : "🔒"}
                        </div>
                        <div>
                          <h5 className="font-semibold text-gray-800">
                            {jobStatus === "unlocked"
                              ? "Desbloqueado"
                              : canUnlock && userCredits > 0
                              ? "Listo para desbloquear"
                              : "⚠️ Créditos insuficientes"}
                          </h5>
                          <p className="text-sm text-gray-600">
                            {jobStatus === "unlocked"
                              ? "Ya puedes postularte"
                              : canUnlock && userCredits > 0
                              ? "1 crédito para desbloquear"
                              : `Necesitas ${
                                  1 - userCredits
                                } crédito${
                                  1 - userCredits > 1 ? "s" : ""
                                } más para desbloquear`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border-t border-gray-200 mt-2">
                    <button
                      onClick={async () => {
                        dispatch({
                          type: "PATCH",
                          payload: { isLoading: true },
                        });
                        try {
                          trackGoal(758);
                          const response = await jobsService.unlockJob(
                            job.id,
                            selectedContact.id,
                            extras
                          );
                          if (response.success) {
                            showSuccess(
                              `¡Desbloqueado! Te quedan ${response.remainingCredits} crédito(s).`
                            );
                            setTimeout(() => router.push(`/panel`), 1200);
                          } else
                            showError(
                              response.error || "Failed to unlock job"
                            );
                        } catch (e) {
                          showError(
                            "No se pudo desbloquear. Intenta de nuevo."
                          );
                        } finally {
                          dispatch({
                            type: "PATCH",
                            payload: { isLoading: false },
                          });
                        }
                      }}
                      className="w-full font-bold py-4 px-6 rounded-xl text-white shadow-lg transition-all duration-200 relative overflow-hidden min-h-[74px] hover:scale-[1.02] active:scale-[0.98]"
                      style={{ backgroundColor: companyColor }}
                    >
                      Usar créditos
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky CTA-footer for step 1 – klistret til bunden af modal/screen */}
        {currentStep === 1 && isGuestFlow && (
          <div
            className="border-t bg-gradient-to-t from-white/90 via-white/70 to-transparent px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+10px)]"
            style={{
              borderTopWidth: "3px",
              borderTopColor: "#5E3FA6", // din lilla
            }}
          >
            <button
              onClick={() => {
                if (!validateMessageStep()) {
                  return;
                }
                try {
                  trackGoal(758);
                  window.fbq?.("trackCustom", "MailDraft", {
                    step_from: 1,
                    step_to: 2,
                    ui: "ContinueCTA",
                    content_name: "Acceso al reclutador",
                    content_category: "Checkout",
                    content_type: "service",
                  });
                } catch {}
                goToStep(2);
              }}
              className="w-full font-bold py-4 px-6 mt-1.5 rounded-xl shadow-lg transition-all duration-200 relative overflow-hidden text-center min-h-[78px] text-white hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background:
                  "linear-gradient(135deg,#5E3FA6,#B276CA 55%,#FF8AD8)",
              }}
            >
              <div className="flex flex-col items-center justify-center leading-snug">
                <span className="text-sm opacity-95">
                  💬 Seguí con tu mensaje para {recruiterFirstName} ✨
                </span>
                <span className="text-base font-semibold mt-1">
                  👉 Confirmá tu contacto y continuá →
                </span>
              </div>
            </button>
          </div>
        )}

        {/* Sticky CTA-footer for step 2 */}
        {currentStep === 2 && isGuestFlow && (
          <div
            className="border-t bg-gradient-to-t from-white/90 via-white/70 to-transparent px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+10px)]"
            style={{
              borderTopWidth: "3px",
              borderTopColor: "#5E3FA6",
            }}
          >
            <button
              onClick={async () => {
                const ok = validatePayerStep();
                if (!ok) {
                  return;
                }

                await sendLeadSimple({
                  job,
                  company,
                  city: selectedContact?.city || extras?.userCity || "",
                  currency: extras?.currency || "MXN",
                  priceMinor: extras?.priceMinor,
                  formData,
                  payerPhone,
                  countryCode: extras?.countryCode || "mx",
                });

                goToStep(3);
              }}
              disabled={isBusy || !payerValid()}
              className={`w-full font-bold py-4 px-3 mt-1.5 rounded-xl shadow-lg transition-all duration-200 relative overflow-hidden text-center min-h-[78px]
                ${isBusy ? "pointer-events-none cursor-wait" : ""}
                ${
                  !isBusy && !payerValid()
                    ? "text-gray-700 ring-1 ring-gray-300 shadow-none bg-gradient-to-r from-gray-100 to-gray-200"
                    : "text-white hover:scale-[1.02] active:scale-[0.98]"
                }`}
              style={{
                background:
                  !isBusy && !payerValid()
                    ? undefined
                    : "linear-gradient(135deg,#5E3FA6,#B276CA 55%,#FF8AD8)",
              }}
              aria-busy={isBusy}
              aria-live="polite"
            >
              <div
                className={`${
                  isBusy ? "invisible" : "visible"
                } flex flex-col items-center justify-center leading-snug`}
              >
                <span className="text-sm">🔒 Confirmá tus datos</span>
                <span className="text-base font-semibold mt-1">
                  ⚡ Continúa para confirmar ahora →
                </span>
              </div>

              <div
                className={`absolute inset-0 grid place-items-center transition-opacity duration-200 px-3 ${
                  isBusy ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
                role="status"
              >
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <span className="inline-block h-4 w-4 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />
                    <span>Procesando…</span>
                  </div>
                  <p className="text-[14px] opacity-90 mt-1">
                    Verificando tus datos personales
                  </p>
                </div>
                <div className="absolute left-0 top-0 h-[2px] w-full bg-white/70 animate-pulse" />
              </div>
            </button>
          </div>
        )}

        {/* Sticky CTA-footer for step 3 */}
        {currentStep === 3 && isGuestFlow && (
          <div
            className="border-t bg-gradient-to-t from-white/90 via-white/70 to-transparent px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+10px)]"
            style={{
              borderTopWidth: "3px",
              borderTopColor: "#5E3FA6",
            }}
          >
          <div className="mt-0 mb-0.5 rounded-xl border border-amber-200 bg-amber-50/80 px-2.5 py-2 flex items-start gap-2">
            {/* Ikon-chip */}
            <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 border border-amber-200">
              <span className="text-amber-700 text-base">⏳</span>
            </div>

            <div className="flex-1">
              <p className="text-[12.5px] font-semibold text-amber-900 leading-tight">
                Cupos limitados por reclutador
              </p>
              {/* [DK: Begrænset antal pladser per rekrutter] */}

              <p className="text-[11px] text-amber-900/90 mt-0.5 leading-tight">
                Evitamos el spam para que tu mensaje sí se lea y reciba prioridad.
              </p>
              {/* [DK: Vi undgår spam, så din besked faktisk bliver læst og får prioritet.] */}
            </div>
          </div>


            <button
              onClick={() => {
                if (!payerValid() || !(messageText || "").trim()) return;

                let userData = {};
                try {
                  const geo = getGeoFromClient();
                  userData = buildPixelUserData({
                    formData,
                    payerPhone,
                    city:
                      geo.city ||
                      extras?.userCity ||
                      selectedContact?.city ||
                      "",
                    countryCode:
                      geo.countryCode || extras?.countryCode || "mx",
                  });
                } catch {}

                try {
                  trackGoal(769);
                  window.fbq?.("track", "InitiateCheckout", {
                    step: 3,
                    ui: "InlinePaymentVisible",
                    content_name: "Acceso al reclutador",
                    content_category: "Checkout",
                    content_type: "service",
                    value: 79,
                    currency: "MXN",
                    ...userData,
                  });
                } catch {}

                // Kun tracking + blød scroll til "Pago sin riesgo"-sektionen
                scrollToSinRiesgo();
              }}
              disabled={!payerValid() || !(messageText || "").trim()}
              className="w-full font-bold py-4 px-4 mt-1.5 rounded-xl shadow-xl transition-transform duration-200 relative overflow-hidden min-h-[78px] text-white hover:scale-[1.04] active:scale-[0.98]"
              style={{
                background:
                  "linear-gradient(135deg,#5E3FA6,#B276CA 55%,#FF8AD8)",
                boxShadow: "0 8px 24px rgba(94,63,166,0.35)",
              }}
              aria-label="Activar entrega directa al reclutador por 79 pesos mexicanos, IVA incluido. Reclutador verificado, pago único y pago seguro. Aceptamos tarjetas, SPEI y OXXO."
              title="Entrega directa al reclutador — pago único, IVA incluido"
            >
              <div className="flex flex-col items-center justify-center leading-snug">
                <span className="text-[17px] sm:text-[17px] max-[392px]:text-[15px]">
                  👉 Entregar tu mensaje directo a {recruiterFirstName}
                </span>

                <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-[10px] max-[370px]:text-[9px] opacity-95">
                  <span className="inline-flex items-center gap-1">
                    ✅ Reclutador verificado
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    ☑️ Pago único
                  </span>
                  <span className="max-[370px]:hidden">·</span>
                  <span className="inline-flex items-center gap-1 max-[370px]:hidden">
                    🔒 Pago seguro
                  </span>
                </div>

                <span className="text-lg font-semibold mt-1">
                  Solo $79{" "}
                  <span className="text-sm font-normal">(IVA incluido)</span>
                </span>
              </div>
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .animate-in .benefit-line {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
        .focus-highlight {
          box-shadow: 0 0 0 3px rgba(var(--brand-rgb), 0.3),
            0 0 0 6px rgba(var(--brand-rgb), 0.15) !important;
          animation: focus-bump 0.22s ease-out;
        }
        @keyframes focus-bump {
          0% {
            transform: scale(0.995);
          }
          100% {
            transform: scale(1);
          }
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
};

export default ApplyNowModal;
