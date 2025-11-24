/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { jobApplicationsService, creditsService } from "../../services";
import { useAuth } from "../../components/AuthContext";
import { useToast } from "../../components/ui/Toast";
import PanelPageSkeleton from "../../components/panel/PanelPageSkeleton";
import WizardModal from "../../components/WizardModal";
import { getInitials } from "../../utils";

// ============================================================================
// BRAND TOKENS (samme vibe som modal)
// ============================================================================
const BRAND = {
  primary: "#5E3FA5",
  secondary: "#B276CA",
};

// ===== Color helpers (company color -> lysere gradient) =====
const clamp = (n) => Math.max(0, Math.min(255, n));
const hexToRgb = (hex = "") => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(
    (hex || "").trim(),
  );
  if (!m) return { r: 94, g: 63, b: 165 }; // fallback til BRAND.primary
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
};
const rgbToHex = (r, g, b) =>
  "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
const shadeHex = (hex, pct) => {
  const { r, g, b } = hexToRgb(hex);
  const f = 1 + pct / 100;
  return rgbToHex(
    clamp(Math.round(r * f)),
    clamp(Math.round(g * f)),
    clamp(Math.round(b * f)),
  );
};
const safeHex = (hex) =>
  /^#([0-9a-fA-F]{6})$/.test(hex || "") ? hex : BRAND.primary;
/** Blid gradient: let lysning (+10%) til en svag mørkning (-6%) */
const gradientFrom = (hex) => {
  const base = safeHex(hex);
  const light = shadeHex(base, +10);
  const dark = shadeHex(base, -6);
  return `linear-gradient(180deg, ${light}, ${dark})`;
};

// ============================================================================
// SUB-COMPONENTS - UI Building Blocks
// ============================================================================

// Robust normalisering til pæn UI-tekst
const normalize = (val, { fallback = "No disponible" } = {}) => {
  const raw = String(val ?? "").trim();
  const s = raw
    .replace(/🔒|🔐|–|—|\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!s || /^(unknown|desconocido|n\/a|na|none|null|undefined|-|—)$/i.test(s))
    return fallback;
  return s;
};

// By-resolver: find første tilgængelige kilde til by og normaliser
const resolveCity = (c) =>
  normalize(
    c?.contact?.city ??
      c?.company?.city ??
      c?.job?.city ??
      c?.job?.location ??
      c?.listing?.location ??
      c?.company?.hq_city ??
      c?.company?.location?.city,
  );

/**
 * KPI Card Component
 */
const KPICard = ({
  label,
  value,
  description,
  button,
  isGradient = false,
  adjustY = 0,
}) => (
  <div
    className="relative overflow-hidden rounded-2xl p-1.75 shadow-sm hover:shadow-md transition-shadow border bg-white"
    style={{ borderColor: "rgba(94,63,166,.22)" }}
  >
    <div
      className="text-xs uppercase tracking-wide font-semibold mb-1"
      style={{ color: "#4b2f9c" }}
    >
      {label}
    </div>

    <div className="flex items-center justify-between gap-2">
      <div
        className={`text-2xl font-black ${
          isGradient
            ? "bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent"
            : "text-gray-900"
        }`}
      >
        {value}
      </div>

      {button && (
        <button
          onClick={button.onClick}
          style={{
            transform: `translateY(${adjustY}px)`,
            background: `linear-gradient(90deg, ${BRAND.secondary}, ${BRAND.primary})`,
            boxShadow: "0 6px 14px rgba(94,63,166,.20)",
          }}
          className="shrink-0 text-white inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border-0 hover:brightness-110 active:translate-y-px"
        >
          {button.label}
        </button>
      )}
    </div>

    {description && (
      <div className="text-xs text-gray-500 mt-1">{description}</div>
    )}
  </div>
);

/**
 * Back Button Component
 */
const BackButton = ({ onClick }) => (
  <button
    onClick={onClick}
    className="p-2 rounded-lg transition-colors"
    style={{ border: "1px solid rgba(94,63,166,.22)" }}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="black"
    >
      <path d="M19 13H7.83l5.59 5.59L12 20l-8-8 8-8 1.41 1.41L7.83 11H19v2z" />
    </svg>
  </button>
);

/**
 * Conversation List Item Component
 */
const ConversationListItem = ({ conversation, onClick }) => {
  const getConversationStatus = (status = "") => {
    const map = {
      unlocked: "⚡ Compra",
      drafted: "⏳ Borrador",
      sent: "🚀 Enviado",
      read: "👀 Leído",
      replied: "💬 Respuesta",
    };
    return map[status] ?? "—";
  };

  const companyColor = conversation?.company?.color;

  return (
    <button
      onClick={() => onClick(conversation?.id)}
      className="w-full text-left py-3 px-3 rounded-xl flex items-center gap-3 transition-all group hover:bg-purple-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300"
    >
      {/* Company Logo */}
      <div
        className="bg-white rounded-lg shadow-md border-1 border-[#e7e7e7] shadow-[0 8px 24px rgba(0, 0, 0, .06)]"
        style={{
          backgroundColor: conversation.company?.color || "#e7e7e7",
        }}
      >
        {conversation?.company?.logo_url ? (
          <img
            src={conversation.company.logo_url}
            alt="Company logo"
            className="h-18 w-18 min-w-18 min-h-18 object-contain rounded-lg"
          />
        ) : (
          <span className="text-white font-black">
            {conversation?.company?.name?.charAt(0) || "?"}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-gray-900 font-bold truncate">
          {conversation?.job?.title}
        </div>
        <div className="text-sm text-gray-600 truncate">
          {conversation?.company?.name}
        </div>
        <div className="text-xs text-gray-500 truncate mt-0.5">
          {getConversationStatus(conversation?.status)}
        </div>
      </div>

      {/* Action arrow (indikator) */}
      <div className="ml-2 opacity-60 group-hover:opacity-100 transform group-hover:translate-x-0.5 transition-all">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="#5E3FA5"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </button>
  );
};

/**
 * AI Assistant Card Component
 */
const AIAssistantCard = ({ title, description, buttonLabel, onStart }) => (
  <div
    className="rounded-2xl p-5 shadow-sm"
    style={{
      background:
        "conic-gradient(from 210deg at 80% -20%, rgba(94,63,166,.10), #fff 45%), #faf9ff",
      border: "1px solid rgba(94,63,166,.22)",
      boxShadow: "0 6px 14px rgba(20,16,45,.06)",
    }}
  >
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mb-2"
      style={{ background: "rgba(94,63,166,.14)", color: "#4b2f9c" }}
    >
      ✨ Asistente IA
    </div>
    <h3 className="text-lg md:text-xl font-semibold text-gray-900 mt-2 mb-1">
      {title}
    </h3>
    <p className="text-sm text-gray-700 mb-3">{description}</p>
    <button
      onClick={onStart}
      className="inline-flex items-center gap-2.5 text-white border-0 rounded-full font-extrabold text-sm tracking-wide transition-all hover:brightness-110 active:translate-y-px active:scale-[0.99]"
      style={{
        background: `radial-gradient(120% 140% at 80% -40%, ${BRAND.secondary} 0%, ${BRAND.primary} 55%, #5a3aa0 100%)`,
        padding: "0.9rem 1.15rem",
        boxShadow:
          "0 18px 38px rgba(20,16,45,.10), 0 0 0 1px rgba(255,255,255,.25) inset, 0 12px 30px rgba(94,63,166,.28)",
        letterSpacing: "0.2px",
      }}
    >
      {buttonLabel}
    </button>
  </div>
);

// ============================================================================
// SECTION COMPONENTS - Major UI Sections
// ============================================================================

/**
 * Panel Header Section
 */
const PanelHeader = ({ onBuyCredits, kpis }) => (
  <header className="mb-3">
    <div
      className="relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-sm p-2.5 md:p-4 shadow-lg"
      style={{ border: "1px solid rgba(94,63,166,.22)" }}
    >
      {/* Top accent stripe */}
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{
          background: `linear-gradient(90deg, ${BRAND.secondary}, ${BRAND.primary})`,
        }}
      />

      {/* Title */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
            Panel - Tus contactos
          </h1>
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-2 gap-3">
        {kpis.map((kpi, index) => (
          <KPICard key={index} {...kpi} />
        ))}
      </div>
    </div>
  </header>
);

/**
 * Conversation List View Section
 */
const ConversationListView = ({ conversations, onSelectConversation }) => (
  <section className="space-y-2">
    {/* Ingen ramme rundt om hele listen */}
    <div className="rounded-2xl shadow-sm overflow-hidden bg-white">
      <div className="p-2.5">
        {/* Search */}
        <div className="mb-4">
          <input
            className="w-full rounded-xl px-4 py-2 shadow-sm focus:outline-none focus:ring-2 transition-all text-gray-700 placeholder:text-gray-400 bg-white"
            style={{
              border: "1px solid rgba(94,63,166,.22)",
              "--tw-ring-color": "#5E3FA5",
            }}
            placeholder="🔍 Busca por empresa, cargo o nombre del reclutador…"
          />
        </div>

        {/* List items */}
        <div className="divide-y divide-purple-100">
          {conversations.map((conversation) => (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
              onClick={onSelectConversation}
            />
          ))}
        </div>

        <p className="mt-4 text-xs text-gray-600 text-center">
          ⚡ Consejo: Selecciona una vacante y deja que la IA prepare tu mensaje
          en solo 20 segundos.
        </p>
      </div>
    </div>
  </section>
);

/**
 * Conversation Header Section
 */
const ConversationHeader = ({ initial, title, company, onBack, color }) => (
  <div
    className="p-2.5 md:p-4 flex items-center gap-3"
    style={{ borderBottom: "1px solid rgba(94,63,166,.14)" }}
  >
    <BackButton onClick={onBack} />
    <div
      className="w-10 h-10 rounded-full grid place-items-center text-white font-bold shadow-md"
      style={{
        background: gradientFrom(color),
        boxShadow: "0 8px 18px rgba(94,63,166,.20)",
      }}
    >
      {initial}
    </div>
    <div className="flex-1 min-w-0">
      <div className="font-semibold text-gray-900 truncate">{title}</div>
      <div className="text-sm text-gray-600 truncate">{company}</div>
    </div>
  </div>
);

/**
 * HR Contact Card Section
 */
const HRContactCard = ({
  name,
  company,
  email,
  phone,
  location,
  isLocked = false,
  companyColor, // farve til avatar
}) => {
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-sm"
      style={{ border: "1px solid rgba(94,63,166,.22)", background: "white" }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 font-bold text-sm flex items-center gap-2"
        style={{
          background: isLocked
            ? "linear-gradient(90deg, rgba(94,63,166,.10), rgba(94,63,166,.04))"
            : "linear-gradient(90deg, rgba(16,185,129,.12), rgba(16,185,129,.06))",
          borderBottom: isLocked
            ? "1px solid rgba(94,63,166,.22)"
            : "1px solid rgba(16,185,129,.25)",
          color: isLocked ? "#4b2f9c" : "#065f46",
        }}
      >
        {isLocked ? "🔒" : "✅"} Reclutador verificado para este mensaje
      </div>

      {/* Content */}
      <div className="p-2.5 md:p-4 grid grid-cols-[56px_1fr_auto] gap-3 items-center">
        {/* Initialer i company-farver (lysere) */}
        <div
          className="w-14 h-14 rounded-full grid place-items-center text-white font-black text-lg"
          style={{
            background: gradientFrom(companyColor),
            boxShadow: "0 8px 18px rgba(94,63,166,.20)",
          }}
        >
          {getInitials(normalize(name))}
        </div>

        <div>
          <h3 className="font-bold text-gray-900 mb-1">
            👤 {normalize(name)} — {normalize(company)}
          </h3>

          <div className="flex flex-wrap gap-2 text-xs text-gray-700 mb-1">
            <span>
              📧{" "}
              <span className="font-semibold">
                {isLocked ? "Oculto hasta respuesta 🔒" : normalize(email)}
              </span>
            </span>
            <span className="hidden md:inline">·</span>
            <span>
              📞{" "}
              <span className="font-semibold">
                {isLocked ? "Oculto hasta respuesta 🔒" : normalize(phone)}
              </span>
            </span>
          </div>

          <div className="text-xs text-gray-700">📍 {normalize(location)}</div>
        </div>
      </div>
    </div>
  );
};

/**
 * Status Progress Section
 */
const StatusProgress = ({
  status,
  progress = 0.8,
  stages,
  activePopovers,
  onTogglePopover,
  popoverRefs,
}) => (
  <div
    className="rounded-2xl p-2.5 md:p-4 shadow-sm bg-white"
    style={{ border: "1px solid rgba(94,63,166,.22)" }}
  >
    <div className="flex items-center justify-between mb-3">
      <strong className="text-sm text-gray-900">{status}</strong>
    </div>

    <div
      className="relative rounded-full mb-2"
      style={{
        height: "12px",
        background: "rgba(94,63,166,.10)",
        border: "1px solid rgba(94,63,166,.18)",
      }}
    >
      <div
        className="absolute inset-0 rounded-full origin-left"
        style={{
          background: `linear-gradient(90deg, ${BRAND.secondary}, ${BRAND.primary})`,
          transform: `scaleX(${progress})`,
        }}
      />
    </div>

    <div className="flex justify-between gap-2 mt-2 px-2">
      {stages.map((stage, index, array) => (
        <div
          key={stage.id}
          ref={(el) => {
            if (popoverRefs && popoverRefs.current)
              popoverRefs.current[stage.id] = el;
          }}
          className="relative flex flex-col items-center group"
        >
          <button
            onClick={() => onTogglePopover(stage.id)}
            className="rounded-full flex items-center justify-center transition-colors"
            style={{
              width: "18px",
              height: "18px",
              border: "1px solid rgba(94,63,166,.28)",
              background: "rgba(94,63,166,.08)",
              color: "#4b2f9c",
              fontSize: ".7rem",
              fontWeight: 700,
            }}
          >
            i
          </button>
          <span
            className="mt-1 text-center tracking-wide"
            style={{
              fontSize: ".68rem",
              fontWeight: 800,
              color: stage.active ? "#3b2f7a" : "#5b4aa8",
              letterSpacing: ".2px",
              textDecoration: stage.active ? "underline" : "none",
            }}
          >
            {stage.label}
          </span>

          {activePopovers && activePopovers[stage.id] && (
            <div
              className={`absolute top-full bg-white rounded-xl p-3 z-50 ${
                index === 0
                  ? "left-0"
                  : index === array.length - 1
                  ? "right-0"
                  : "left-1/2 transform -translate-x-1/2"
              }`}
              style={{
                marginTop: "0.5rem",
                minWidth: "220px",
                maxWidth: "280px",
                border: "1px solid rgba(94,63,166,.22)",
                boxShadow: "0 6px 14px rgba(20,16,45,.06)",
              }}
            >
              <div
                className={`absolute transform rotate-45 bg-white ${
                  index === 0
                    ? "left-4"
                    : index === array.length - 1
                    ? "right-4"
                    : "left-1/2 -translate-x-1/2"
                }`}
                style={{
                  top: "-6px",
                  width: "12px",
                  height: "12px",
                  borderLeft: "1px solid rgba(94,63,166,.22)",
                  borderTop: "1px solid rgba(94,63,166,.22)",
                }}
              />
              <h5
                className="mb-1"
                style={{
                  fontSize: ".78rem",
                  fontWeight: 800,
                  color: "#3b2f7a",
                }}
              >
                {stage.label}
              </h5>
              <p style={{ fontSize: ".76rem", color: "#475569" }}>
                {stage.info}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

/**
 * Live Listing Selector Section
 */
const LiveListingSelector = ({ listings, selectedId, onSelect }) => (
  <div
    className="rounded-2xl p-2.5 md:p-4 shadow-sm bg-white"
    style={{ border: "1px solid rgba(94,63,166,.22)" }}
  >
    <div className="font-bold text-gray-900 mb-3">
      Elige Oferta en Vivo (terceros)
    </div>
    {listings.map((listing) => (
      <label key={listing.id} className="block cursor-pointer">
        <input
          className="sr-only peer"
          name="listing"
          type="radio"
          checked={selectedId === listing.id}
          onChange={() => onSelect(listing.id)}
        />
        <div
          className="grid grid-cols-[56px_1fr_auto] gap-3 items-center rounded-2xl p-3 transition-all hover:shadow-md"
          style={{
            border:
              selectedId === listing.id
                ? "1px solid rgba(16,185,129,.55)"
                : "1px solid rgba(94,63,166,.22)",
            background: "white",
          }}
        >
          <div
            className="w-14 h-14 rounded-full grid place-items-center text-white font-black"
            style={{ background: gradientFrom(listing.color || BRAND.primary) }}
          >
            {listing.initial}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 leading-tight truncate">
              {listing.company} — {listing.title}
            </h3>
            <div className="flex flex-wrap gap-2 text-xs text-gray-700 mt-1">
              <span>📍 {listing.location}</span>
              <span className="hidden md:inline">·</span>
              <span>Fuente: {listing.source}</span>
              <span className="hidden md:inline">·</span>
              <a
                href={listing.url}
                className="underline hover:opacity-90"
                onClick={(e) => e.stopPropagation()}
                style={{ color: BRAND.primary }}
              >
                Abrir oferta ↗️
              </a>
            </div>
          </div>
          {selectedId === listing.id && (
            <span
              className="px-3 py-1 rounded-full text-xs font-bold"
              style={{
                background: "rgba(16,185,129,.12)",
                border: "1px solid rgba(16,185,129,.45)",
                color: "#065f46",
              }}
            >
              Seleccionada
            </span>
          )}
        </div>
      </label>
    ))}
  </div>
);

/**
 * Conversation Message Component
 *  - HR/rekrutter avatar: company color (lys gradient)
 *  - Dine beskeder: lidt lysere brand-gradient
 */
const ConversationMessage = ({
  senderName,
  senderEmail,
  senderInitial,
  subject,
  content,
  timestamp,
  isUser = false,
  isPending = false,
  status,
  companyColor, // NY: for HR/rekrutter
}) => {
  const userBg = `linear-gradient(180deg, ${shadeHex(BRAND.primary, +8)}, ${
    BRAND.primary
  })`;
  const hrBg = gradientFrom(companyColor);

  const bgStyle = isUser ? userBg : hrBg;
  const borderColor = isUser ? "rgba(94,63,166,.22)" : "rgba(94,63,166,.22)";

  return (
    <div className={`flex gap-3 items-start ${isPending ? "opacity-60" : ""}`}>
      <div
        className="w-10 h-10 rounded-full grid place-items-center text-white font-bold flex-shrink-0 shadow-sm"
        style={{ background: bgStyle }}
      >
        {senderInitial}
      </div>
      <div
        className="flex-1 rounded-2xl p-2.5 md:p-4 bg-white shadow-sm"
        style={{ border: `1px solid ${borderColor}` }}
      >
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <div className="font-semibold text-gray-900 flex items-center gap-2">
            {senderName}{" "}
            {isUser ? (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: "rgba(94,63,166,.14)", color: "#4b2f9c" }}
              >
                Tú
              </span>
            ) : (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: "rgba(94,63,166,.12)", color: "#4b2f9c" }}
              >
                Reclutador
              </span>
            )}
          </div>
        </div>
        {subject && (
          <div
            className="font-medium text-gray-900 mb-2 pb-2"
            style={{ borderBottom: "1px solid rgba(0,0,0,.06)" }}
          >
            📧 {subject}
          </div>
        )}
        <div
          className={
            isPending ? "text-sm text-gray-500 italic" : "text-gray-700"
          }
          style={{ whiteSpace: "pre-wrap" }}
        >
          {content}
        </div>
        <div className="text-xs text-gray-500 flex items-center gap-1 float-right">
          {timestamp}
          {isPending && <span className="text-orange-500">⏳</span>}
          {status === "sent" && !isPending && (
            <span className="text-green-500">✓</span>
          )}
          {status === "delivered" && <span className="text-green-600">✓✓</span>}
          {status === "failed" && <span className="text-red-500">✗</span>}
        </div>
      </div>
    </div>
  );
};

/**
 * Conversation Thread Section
 */
const ConversationThread = ({
  hrName,
  hrInitial,
  company,
  readStatus,
  messages,
  companyColor,
}) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div
      className="rounded-2xl bg-white shadow-sm overflow-hidden"
      style={{ border: "1px solid rgba(94,63,166,.22)" }}
    >
      <div
        className="p-2.5 md:p-4 flex items-center gap-3"
        style={{ borderBottom: "1px solid rgba(94,63,166,.14)" }}
      >
        <div
          className="w-10 h-10 rounded-full grid place-items-center text-white font-bold shadow-sm"
          style={{
            background: gradientFrom(companyColor),
            boxShadow: "0 8px 18px rgba(94,63,166,.20)",
          }}
        >
          {hrInitial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 truncate">
            {normalize(hrName)} — Reclutador
          </div>
          <div className="text-sm text-gray-600 truncate">
            {normalize(company)}
          </div>
        </div>
        {messages.length > 0 && (
          <span
            className="px-3 py-1 rounded-full text-xs font-bold"
            style={{
              background: "rgba(16,185,129,.12)",
              border: "1px solid rgba(16,185,129,.45)",
              color: "#065f46",
            }}
          >
            {messages.length} {messages.length === 1 ? "mensaje" : "mensajes"}
          </span>
        )}
      </div>

      <div className="p-2.5 md:p-4 space-y-4 max-h-[600px] overflow-y-auto scroll-smooth">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div
              className="w-16 h-16 rounded-full grid place-items-center text-3xl mb-4"
              style={{ background: "rgba(94,63,166,.12)" }}
            >
              💬
            </div>
            <div className="font-semibold text-gray-900 mb-2">
              Aún no hay mensajes
            </div>
            <div className="text-sm text-gray-600">
              Esperando la respuesta del reclutador a tu correo
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={message.id || index}>
              {message.type === "message" ? (
                <ConversationMessage {...message} companyColor={companyColor} />
              ) : message.type === "system" ? (
                <div className="flex justify-center">
                  <div
                    className="px-4 py-2 rounded-full text-xs font-medium"
                    style={{
                      background: "rgba(94,63,166,.10)",
                      border: "1px dashed rgba(94,63,166,.35)",
                      color: "#4b2f9c",
                    }}
                  >
                    {message.content}
                  </div>
                </div>
              ) : null}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

// ============================================================================
// VIEW COMPONENTS - Complete Views for Different Stages
// ============================================================================

const PreConversationView = ({
  conversation,
  onBack,
  activePopovers,
  onTogglePopover,
  popoverRefs,
  onStartAI,
  creditsBalance,
}) => {
  const stages = [
    {
      id: "purchase",
      label: "Compra",
      info: `Tienes ${creditsBalance} créditos. Usa 1 para comenzar.`,
    },
    {
      id: "draft",
      label: "Borrador",
      info: "Borrador IA basado en tu oferta y reclutador.",
    },
    {
      id: "sent",
      label: "Enviado",
      info: "Aún no enviado. Envíalo cuando el borrador esté listo.",
    },
    {
      id: "read",
      label: "Leído",
      info: "Aún sin lecturas. Mostraremos la hora cuando el reclutador abra el correo.",
    },
    {
      id: "replied",
      label: "Respuesta",
      info: "Esperando respuesta. Puedes enviar un seguimiento en 3 días.",
    },
  ];

  const statusToProgress = {
    unlocked: 1 / 5,
    drafted: 2 / 5,
    sent: 3 / 5,
    read: 4 / 5,
    replied: 5 / 5,
  };
  const progress = statusToProgress[conversation?.status] || 0;

  return (
    <section className="space-y-5">
      <div
        className="rounded-2xl bg-white shadow-sm overflow-hidden"
        style={{ border: "1px solid rgba(94,63,166,.22)" }}
      >
        <ConversationHeader
          initial={conversation?.company?.name?.charAt(0) || "?"}
          title={conversation?.job?.title}
          company={conversation?.company?.name}
          color={conversation?.company?.color}
          onBack={onBack}
        />

        <div className="p-2.5 md:p-4 space-y-5">
          <p className="text-[11px] text-gray-600 text-center leading-snug px-4">
            Por privacidad, los datos se muestran tras la respuesta del
            reclutador.
          </p>

          <HRContactCard
            name={conversation?.contact?.name}
            company={conversation?.company?.name}
            email={conversation?.contact?.email}
            phone={conversation?.contact?.phone}
            location={resolveCity(conversation)}
            isLocked={true}
            companyColor={conversation?.company?.color}
          />

          <StatusProgress
            status="⏳ Estado"
            progress={progress}
            stages={stages}
            activePopovers={activePopovers}
            onTogglePopover={onTogglePopover}
            popoverRefs={popoverRefs}
          />

          <AIAssistantCard
            title="Obtén un buen borrador en 20 s."
            description="La IA usa tu oferta y reclutador seleccionados."
            buttonLabel="🚀 Iniciar Asistente"
            onStart={onStartAI}
          />
        </div>
      </div>
    </section>
  );
};

// Helper function to check if 3 days have passed since first message
const canSendFollowUp = (appliedAt) => {
  if (!appliedAt) return false;
  const sentDate = new Date(appliedAt);
  const now = new Date();
  const diffInMs = now - sentDate;
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
  return diffInDays >= 3;
};

// Helper function to get days remaining until follow-up is available
const getDaysUntilFollowUp = (appliedAt) => {
  if (!appliedAt) return 3;
  const sentDate = new Date(appliedAt);
  const now = new Date();
  const diffInMs = now - sentDate;
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
  const daysRemaining = Math.ceil(3 - diffInDays);
  return daysRemaining > 0 ? daysRemaining : 0;
};

// Helper function to check if HR has replied
const hasHRReplied = (messages) => {
  if (!messages || messages.length === 0) return false;
  return messages.some((msg) => msg.direction === "contact_to_user");
};

const LiveConversationView = ({
  conversation,
  onBack,
  activePopovers,
  onTogglePopover,
  popoverRefs,
  onStartFollowUp,
  onTakeToEmail,
  onReplyOnWebsite,
}) => {
  const stages = [
    {
      id: "purchase-live",
      label: "Compra",
      info: "Crédito usado al iniciar el mensaje. Saldo actual: 9.",
    },
    {
      id: "draft-live",
      label: "Borrador",
      info: "Borrador enviado el 24 sep 2025 · 09:30. Guardado en el hilo.",
    },
    {
      id: "sent-live",
      label: "Enviado",
      info: "Enviado el 24 sep 2025 · 09:30 a Elena Pérez.",
    },
    {
      id: "read-live",
      label: "Leído",
      info: "Leído por Elena el 25 sep 2025 · 10:14.",
    },
    { id: "replied-live", label: "Respuesta", info: "— Sin respuesta aún." },
  ];

  const statusToProgress = {
    unlocked: 1 / 5,
    drafted: 2 / 5,
    sent: 3 / 5,
    read: 4 / 5,
    replied: 5 / 5,
  };
  const progress = statusToProgress[conversation?.status] || 0;

  const hrReplied = hasHRReplied(conversation?.messages);
  const canFollowUp = canSendFollowUp(conversation?.applied_at);
  const daysRemaining = getDaysUntilFollowUp(conversation?.applied_at);

  const fallbackMessages = [
    {
      type: "message",
      senderName: "Tú",
      senderEmail: "you@user",
      senderInitial: "TÚ",
      subject: "Postulación — Vigilante",
      content:
        "Hola Elena, 8 meses de experiencia. Disponible turnos nocturnos. Resido en Medellín.",
      timestamp: "24/09 09:30",
      isUser: true,
    },
    {
      type: "system",
      content: (
        <>
          👁️ Leído por <strong>Elena</strong> — 25 sep 2025 · 10:14
        </>
      ),
    },
    {
      type: "message",
      senderName: "Elena Pérez",
      senderEmail: "(— sin respuesta aún)",
      senderInitial: "EP",
      content: "En espera de respuesta…",
      timestamp: "—",
      isUser: false,
      isPending: true,
    },
  ];

  return (
    <section className="space-y-5">
      <div
        className="rounded-2xl bg-white shadow-sm overflow-hidden"
        style={{ border: "1px solid rgba(94,63,166,.22)" }}
      >
        <ConversationHeader
          initial={conversation?.contact?.name?.charAt(0) || "?"}
          title={conversation?.job?.title}
          company={conversation?.company?.name}
          color={conversation?.company?.color}
          onBack={onBack}
        />

        <div className="p-2.5 md:p-4 space-y-5">
          <HRContactCard
            name={conversation?.contact?.name}
            company={conversation?.company?.name}
            email={conversation?.contact?.email}
            phone={conversation?.contact?.phone}
            location={resolveCity(conversation)}
            isLocked={false}
            companyColor={conversation?.company?.color}
          />

          <StatusProgress
            status="📤 Estado"
            progress={progress}
            stages={stages}
            activePopovers={activePopovers}
            onTogglePopover={onTogglePopover}
            popoverRefs={popoverRefs}
          />

          <ConversationThread
            hrName={conversation?.contact?.name}
            hrInitial={conversation?.contact?.name?.charAt(0) || "?"}
            company={conversation?.company?.name}
            readStatus={conversation?.last_message_at}
            messages={conversation?.messages || fallbackMessages}
            companyColor={conversation?.company?.color}
          />

          {/* Show different options based on whether HR has replied */}
          {hrReplied ? (
            // HR has replied - show options to continue conversation
            <div
              className="rounded-2xl p-5 shadow-sm space-y-4"
              style={{
                background:
                  "conic-gradient(from 210deg at 80% -20%, rgba(94,63,166,.10), #fff 45%), #faf9ff",
                border: "1px solid rgba(94,63,166,.22)",
                boxShadow: "0 6px 14px rgba(20,16,45,.06)",
              }}
            >
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                style={{ background: "rgba(94,63,166,.14)", color: "#4b2f9c" }}
              >
                ✅ El reclutador respondió
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900">
                ¿Cómo quieres continuar?
              </h3>
              <p className="text-sm text-gray-700">
                Puedes continuar la conversación por email o aquí en la
                plataforma.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                {/* Take to email button */}
                <button
                  onClick={onTakeToEmail}
                  className="flex-1 inline-flex items-center justify-center gap-2 text-white border-0 rounded-xl font-bold text-sm tracking-wide transition-all hover:brightness-110 active:translate-y-px active:scale-[0.99]"
                  style={{
                    background: `linear-gradient(180deg, ${BRAND.secondary}, ${BRAND.primary})`,
                    padding: "0.85rem 1rem",
                    boxShadow:
                      "0 12px 24px rgba(94,63,166,.20), 0 0 0 1px rgba(255,255,255,.25) inset",
                  }}
                >
                  📧 Continuar por email
                </button>

                {/* Reply on website button */}
                <button
                  onClick={onReplyOnWebsite}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl font-bold text-sm tracking-wide transition-all hover:bg-gray-50 active:translate-y-px active:scale-[0.99]"
                  style={{
                    background: "white",
                    padding: "0.85rem 1rem",
                    boxShadow: "0 0 0 1px rgba(94,63,166,.22) inset",
                    color: BRAND.primary,
                  }}
                >
                  💬 Responder aquí
                </button>
              </div>
            </div>
          ) : (
            // HR hasn't replied yet - show follow-up option with 3-day lock
            <div
              className="rounded-2xl p-5 shadow-sm"
              style={{
                background:
                  "conic-gradient(from 210deg at 80% -20%, rgba(94,63,166,.10), #fff 45%), #faf9ff",
                border: "1px solid rgba(94,63,166,.22)",
                boxShadow: "0 6px 14px rgba(20,16,45,.06)",
              }}
            >
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mb-2"
                style={{ background: "rgba(94,63,166,.14)", color: "#4b2f9c" }}
              >
                ✨ Asistente IA
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mt-2 mb-1">
                Seguimiento al reclutador
              </h3>
              <p className="text-sm text-gray-700 mb-3">
                {canFollowUp
                  ? "Ya puedes enviar un seguimiento profesional con IA."
                  : `Podrás enviar un seguimiento en ${daysRemaining} día${
                      daysRemaining !== 1 ? "s" : ""
                    }.`}
              </p>

              {!canFollowUp && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-3"
                  style={{
                    background: "rgba(251,191,36,.12)",
                    border: "1px solid rgba(251,191,36,.35)",
                    color: "#78350f",
                  }}
                >
                  <span>⏰</span>
                  <span className="font-medium">
                    Es mejor esperar 3 días antes de hacer seguimiento. Esto
                    muestra profesionalismo y respeto por el tiempo del
                    reclutador.
                  </span>
                </div>
              )}

              <button
                onClick={onStartFollowUp}
                disabled={!canFollowUp}
                className="inline-flex items-center gap-2.5 text-white border-0 rounded-full font-extrabold text-sm tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: canFollowUp
                    ? `radial-gradient(120% 140% at 80% -40%, ${BRAND.secondary} 0%, ${BRAND.primary} 55%, #5a3aa0 100%)`
                    : "rgba(156,163,175,.55)",
                  padding: "0.9rem 1.15rem",
                  boxShadow: canFollowUp
                    ? "0 18px 38px rgba(20,16,45,.10), 0 0 0 1px rgba(255,255,255,.25) inset, 0 12px 30px rgba(94,63,166,.28)"
                    : "none",
                  letterSpacing: "0.2px",
                }}
              >
                {canFollowUp ? (
                  <>🚀 Iniciar seguimiento IA</>
                ) : (
                  <>
                    🔒 Disponible en {daysRemaining} día
                    {daysRemaining !== 1 ? "s" : ""}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function PanelPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const { showSuccess, showError, ToastComponent } = useToast();
  const [activeStage, setActiveStage] = useState("list");
  const [activePopovers, setActivePopovers] = useState({});
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [creditsBalance, setCreditsBalance] = useState(0);
  const [aiAssistantModal, setAiAssistantModal] = useState({
    id: null,
    isOpen: false,
    job: null,
    company: null,
    contact: null,
    presetChips: [],
    draft: null,
    sent: false,
  });
  const [selectedConversation, setSelectedConversation] = useState(null);
  const popoverRefs = useRef({});

  const togglePopover = (id) => {
    setActivePopovers((prev) => ({
      ...Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {}),
      [id]: !prev[id],
    }));
  };

  const handleBuyCredits = () => {
    router.push("/creditos");
  };

  const handleSelectConversation = (id) => {
    const conversation = conversations.find((el) => el.id === id);
    setSelectedConversation(conversation);
    if (conversation?.status === "replied") setActiveStage("live");
    else setActiveStage("pre");
  };

  const handleStartAI = () => {
    const conversation = conversations.find(
      (el) => el.id === selectedConversation?.id,
    );
    setSelectedConversation(conversation);
    setAiAssistantModal({
      id: conversation?.id,
      isOpen: true,
      job: conversation?.job,
      company: conversation?.company,
      contact: conversation?.contact,
      presetChips: conversation?.preset_chips || [],
      draft: conversation?.draft || null,
      sent: conversation?.status === "sent",
    });
  };

  const handleStartFollowUp = () => {
    // Open the AI assistant modal for follow-up
    const conversation = conversations.find(
      (el) => el.id === selectedConversation?.id,
    );
    setSelectedConversation(conversation);
    setAiAssistantModal({
      id: conversation?.id,
      isOpen: true,
      job: conversation?.job,
      company: conversation?.company,
      contact: conversation?.contact,
      presetChips: conversation?.preset_chips || [],
      draft: null, // No draft for follow-up
      sent: false,
    });
  };

  const handleTakeToEmail = () => {
    const hrEmail = selectedConversation?.contact?.email;
    if (hrEmail) {
      // Open user's default email client with mailto link
      window.location.href = `mailto:${hrEmail}`;
      showSuccess("Abriendo tu cliente de email...");
    } else {
      showError("No se encontró el email del reclutador.");
    }
  };

  const handleReplyOnWebsite = () => {
    // Open the AI assistant modal for replying
    const conversation = conversations.find(
      (el) => el.id === selectedConversation?.id,
    );
    setSelectedConversation(conversation);
    setAiAssistantModal({
      id: conversation?.id,
      isOpen: true,
      job: conversation?.job,
      company: conversation?.company,
      contact: conversation?.contact,
      presetChips: conversation?.preset_chips || [],
      draft: null,
      sent: false,
    });
  };

  const closeAiAssistantModal = async (sent = false, drafted = false) => {
    setAiAssistantModal({
      id: null,
      isOpen: false,
      job: null,
      company: null,
      contact: null,
      presetChips: [],
    });
    if (sent || drafted) {
      await loadJobApplications();
      setSelectedConversation({
        ...selectedConversation,
        status: sent
          ? "sent"
          : drafted
          ? "drafted"
          : selectedConversation?.status,
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedInside = Object.keys(popoverRefs.current).some((key) => {
        const ref = popoverRefs.current[key];
        return ref && ref.contains(event.target);
      });
      if (!clickedInside) setActivePopovers({});
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated()) {
      router.push("/");
      return;
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (!loading && isAuthenticated()) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAuthenticated]);

  const loadData = async () => {
    setIsLoading(true);
    await loadCreditsBalance();
    await loadJobApplications();
    setIsLoading(false);
  };

  const loadCreditsBalance = async () => {
    try {
      const response = await creditsService.getBalance();
      setCreditsBalance(response.data.balance);
    } catch (error) {
      console.error("Error loading credits balance:", error);
      setCreditsBalance(0);
    }
  };

  const loadJobApplications = async () => {
    setIsLoading(true);
    try {
      const response = await jobApplicationsService.getUserJobApplications();
      setConversations([...response.data.jobApplications]);
    } catch (error) {
      console.error("Error loading job applications:", error);
      setConversations([]);
      showError(
        error?.response?.data?.error ||
          "Error al cargar las conversaciones. Por favor, intenta nuevamente.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const kpis = [
    {
      label: "💬 Mensajes",
      value: conversations.length,
      isGradient: true,
      button: { label: "Ver", onClick: () => setActiveStage("list") },
    },
    {
      label: "💳 Créditos",
      value: creditsBalance,
      isGradient: true,
      button: { label: "Comprar", onClick: handleBuyCredits },
    },
  ];

  if (isLoading) {
    return <PanelPageSkeleton />;
  }

  return (
    <>
      <div
        className="min-h-screen p-2 md:p-2"
        style={{
          background:
            "conic-gradient(from 210deg at 80% -20%, rgba(94,63,166,.06), #ffffff 45%)",
        }}
      >
        <div className="container max-w-screen-md mx-auto">
          <div
            className="p-2 md:p-2 rounded-2xl"
            style={{
              background: "white",
              border: "1px solid rgba(94,63,166,.18)",
              boxShadow: "0 8px 18px rgba(20,16,45,.06)",
            }}
          >
            {/* Header */}
            <PanelHeader onBuyCredits={handleBuyCredits} kpis={kpis} />

            {/* List View */}
            {activeStage === "list" && (
              <ConversationListView
                conversations={conversations}
                onSelectConversation={handleSelectConversation}
              />
            )}

            {/* Pre-Conversation View */}
            {activeStage === "pre" && (
              <PreConversationView
                conversation={selectedConversation}
                onBack={() => setActiveStage("list")}
                activePopovers={activePopovers}
                onTogglePopover={togglePopover}
                popoverRefs={popoverRefs}
                onStartAI={handleStartAI}
                creditsBalance={creditsBalance}
              />
            )}

            {/* Live Conversation View */}
            {activeStage === "live" && (
              <LiveConversationView
                conversation={selectedConversation}
                onBack={() => setActiveStage("list")}
                activePopovers={activePopovers}
                onTogglePopover={togglePopover}
                popoverRefs={popoverRefs}
                onStartFollowUp={handleStartFollowUp}
                onTakeToEmail={handleTakeToEmail}
                onReplyOnWebsite={handleReplyOnWebsite}
              />
            )}
          </div>

          {/* Wizard Modal */}
          <WizardModal
            id={aiAssistantModal.id}
            isOpen={aiAssistantModal.isOpen}
            onClose={closeAiAssistantModal}
            job={aiAssistantModal.job}
            company={aiAssistantModal.company}
            contact={aiAssistantModal.contact}
            presetChips={aiAssistantModal.presetChips}
            draft={aiAssistantModal.draft}
            sent={aiAssistantModal.sent}
            user={user}
          />
        </div>
      </div>
      {ToastComponent}
    </>
  );
}
