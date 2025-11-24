/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useEffect, useRef } from "react";
import { services } from "../services";
import { useToast } from "./ui/Toast";

// === Brand tokens (match panel: #5E3FA5 → #B276CA) ==========================
const BRAND = {
  primary: "#5E3FA5",
  secondary: "#B276CA",
};

// Helpers
const hexToRgb = (hex) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
  if (!m) return { r: 94, g: 63, b: 165 }; // fallback til lilla
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
};

// Initialer fra fornavn + efternavn (fallback til de første to bogstaver)
const getAvatarInitials = (fullName, fallback = "HR") => {
  const s = (fullName || "").trim().replace(/\s+/g, " ");
  if (!s) return fallback;

  // Split på mellemrum (bevar bindestreger som del af navne)
  const parts = s.split(" ").filter(Boolean);

  if (parts.length === 1) {
    // Kun ét navn: tag de første to bogstaver
    return parts[0].slice(0, 2).toUpperCase();
  }

  // Første bogstav i fornavn + første bogstav i EFTERNAVN (sidste token)
  const first = parts[0][0] || "";
  const last = parts[parts.length - 1][0] || "";
  const out = first + last || fallback.slice(0, 2);
  return out.toUpperCase();
};

const WizardModal = ({
  id,
  isOpen,
  onClose,
  job,
  company,
  contact,
  presetChips = [],
  draft,
  sent,
  user,
}) => {
  console.log("contact", contact);
  const { showSuccess, showError, ToastComponent } = useToast();
  const [currentStep, setCurrentStep] = useState(sent ? 3 : draft ? 2 : 1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [selectedChips, setSelectedChips] = useState([]);
  const [customChip, setCustomChip] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [showMoreChips, setShowMoreChips] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState(0);
  const [lessPresetChips, setLessPresetChips] = useState([]);
  const [moreChips, setMoreChips] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccessfully, setSentSuccessfully] = useState(false);
  const [draftedStatus, setDraftedStatus] = useState(false);

  // NEW: kontrolleret åben/luk for Tips (lukket som default)
  const [showTips, setShowTips] = useState(false);

  const carouselTimer = useRef(null);
  const generationTimer = useRef(null);

  // Tips (ES) – kort og brugbare
  const tips = [
    {
      question: "¿Cuándo puedes empezar? (hoy/esta semana)",
      suggestion: "Puedo empezar hoy",
    },
    {
      question: "¿Disponibilidad de turnos (mañana/tarde/noche)?",
      suggestion: "Disponible turnos rotativos",
    },
    {
      question: "¿Fines de semana y festivos?",
      suggestion: "Disponible fines de semana y festivos",
    },
    {
      question: "¿Vives cerca o cuentas con transporte?",
      suggestion: "Vivo cerca / tengo transporte",
    },
    {
      question: "¿Experiencia básica relacionada?",
      suggestion: "6+ meses de experiencia",
    },
    {
      question: "¿Atención al cliente / trato con público?",
      suggestion: "Buena atención al cliente",
    },
    {
      question: "¿Puedes realizar labores físicas?",
      suggestion: "Puedo cargar hasta 25 kg",
    },
    {
      question: "¿Manejo de caja/POS o inventarios?",
      suggestion: "Manejo básico de caja y POS",
    },
    {
      question: "¿Uso de apps/WhatsApp para el trabajo?",
      suggestion: "Manejo básico de apps y WhatsApp",
    },
    { question: "¿Documentación al día?", suggestion: "Documentación al día" },
    {
      question: "¿Disponibilidad para entrevista?",
      suggestion: "Disponible hoy/mañana",
    },
    {
      question: "¿Tiempo de desplazamiento?",
      suggestion: "A 15–30 min del lugar",
    },
  ];

  // Progress tekster (ES)
  const generationSteps = [
    "Reuniendo tus puntos…",
    "Definiendo apertura y tono…",
    "Preparando el asunto…",
    "Asegurando una petición clara…",
    "Añadiendo 'si no eres la persona indicada'…",
  ];

  // Brand vars
  const brandRGB = hexToRgb(BRAND.primary);
  const dynamicStyles = {
    "--brand": BRAND.primary,
    "--brand2": BRAND.secondary,
    "--brand-rgb": `${brandRGB.r}, ${brandRGB.g}, ${brandRGB.b}`,
  };

  // Auto-advance carousel (KUN når tips er åbnet)
  useEffect(() => {
    clearInterval(carouselTimer.current);
    if (isOpen && currentStep === 1 && showTips) {
      carouselTimer.current = setInterval(() => {
        setCarouselIndex((prev) => (prev + 1) % tips.length);
      }, 7000);
    }
    return () => clearInterval(carouselTimer.current);
  }, [isOpen, currentStep, showTips, tips.length]);

  const stopCarousel = () => clearInterval(carouselTimer.current);
  const startCarousel = () => {
    if (currentStep === 1 && showTips) {
      carouselTimer.current = setInterval(() => {
        setCarouselIndex((prev) => (prev + 1) % tips.length);
      }, 7000);
    }
  };

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(sent ? 3 : draft ? 2 : 1);
      setCarouselIndex(0);
      setSelectedChips([]);
      setCustomChip("");
      // Auto-inject LinkedIn URL from user profile if available
      setLinkedinUrl(user?.linkedin || "");
      setSubject(draft?.subject || "");
      setMessage(draft?.message || "");
      setShowMoreChips(false);
      setIsGenerating(false);
      setGenerationProgress(0);
      setGenerationStep(0);
      setIsSending(false);
      setSentSuccessfully(false);
      setShowTips(false); // NEW: start lukket

      if (presetChips.length > 8) {
        setLessPresetChips(presetChips.slice(0, 8));
        setMoreChips(presetChips.slice(8));
      } else {
        setLessPresetChips(presetChips);
        setMoreChips([]);
      }
    }
  }, [isOpen, presetChips, draft, sent, user]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => (document.body.style.overflow = "unset");
  }, [isOpen]);

  // Chips
  const toggleChip = (chipText) => {
    setSelectedChips((prev) =>
      prev.includes(chipText)
        ? prev.filter((c) => c !== chipText)
        : [...prev, chipText],
    );
  };
  const addCustomChip = () => {
    const trimmed = customChip.trim();
    if (trimmed && !selectedChips.includes(trimmed)) {
      setSelectedChips((prev) => [...prev, trimmed]);
      setCustomChip("");
    }
  };
  const handleCustomChipKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomChip();
    }
  };
  const addSuggestionChip = () => {
    const s = tips[carouselIndex].suggestion;
    if (!selectedChips.includes(s)) setSelectedChips((prev) => [...prev, s]);
  };

  // Step nav
  const goToStep = (step) => {
    if (step === currentStep) return;
    setIsAnimating(true);
    setCurrentStep(step);
    setTimeout(() => setIsAnimating(false), 280);
  };

  const canProceedFromStep1 = () => {
    const words = selectedChips.join(" ").split(/\s+/).filter(Boolean).length;
    return selectedChips.length >= 3 || words >= 3;
  };

  // Draft generator (local) — venlig/tú tone (ingen stilvalg)
  const generateDraft = () => {
    const role = job?.title || "la posición";
    const hrName = contact?.name || "Estimado/a";
    const city = job?.city || contact?.city || "la ciudad";
    const companyName = company?.name || "la empresa";

    const subjectLine = `Consulta — ${role} (${city})`;
    const offer = selectedChips.length
      ? selectedChips.join(", ")
      : "soy puntual y aprendo rápido";

    const body = [
      `Hola ${hrName},`,
      `Soy **{TU NOMBRE}** y me interesa la posición de **${role}** en **${companyName}**. Puedo aportar: ${offer}.`,
      linkedinUrl ? `Dejo mi enlace: ${linkedinUrl}` : null,
      `¿Podemos coordinar una entrevista corta esta semana?`,
      `Si no eres la persona indicada, ¿podrías por favor reenviar mi mensaje al responsable? ¡Muchas gracias!`,
    ]
      .filter(Boolean)
      .join("\n\n")
      .replace("{TU NOMBRE}", "Tu nombre");

    return { subject: subjectLine, body };
  };

  // AI message via backend — venlig/tú tone (ingen stilvalg)
  const generateAIMessage = async () => {
    const role = job?.title || "la posición";
    const hrName = contact?.name || "";
    const city = job?.city || contact?.city || "la ciudad";
    const companyName = company?.name || "la empresa";

    // Build user's full name for signature
    const userName =
      user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}`.trim()
        : null;

    const userContent = {
      company: companyName,
      role,
      recruiter: hrName || null,
      formality: "tú",
      styleVariant: 1,
      linkedin: linkedinUrl || null,
      optOutSeed: Math.floor(Math.random() * 1000),
      candidateData: selectedChips.length
        ? selectedChips
        : ["soy puntual y aprendo rápido"],
      userName: userName, // Include user's name for signature
    };

    const response = await services.gpt.generateCoverLetter(userContent);
    if (!response?.success) throw response;

    const generated = response.coverLetter;
    const aiGeneratedSubject = response.subject;

    // Use AI-generated subject if available, otherwise fall back to static format
    const subjectLine =
      aiGeneratedSubject || `Solicitud: ${role} en ${companyName}`;

    return { subject: subjectLine, body: generated };
  };

  // Next handler
  const handleNext = async () => {
    if (currentStep === 1) {
      if (!canProceedFromStep1()) return;

      // Animation/progress
      setIsGenerating(true);
      setGenerationProgress(0);
      setGenerationStep(0);
      generationTimer.current = setInterval(() => {
        setGenerationProgress((p) => (p >= 95 ? 95 : p + 3));
      }, 1000 / 12);
      const msgInterval = setInterval(() => {
        setGenerationStep((s) => (s + 1) % generationSteps.length);
      }, 1100);

      try {
        const draftMsg = await generateAIMessage();
        setSubject(draftMsg.subject);
        setMessage(draftMsg.body);

        try {
          await services.jobApplications.saveDraft(
            id,
            draftMsg.subject,
            draftMsg.body,
          );
          setDraftedStatus(true);
        } catch (e) {
          console.error("Failed to save draft:", e);
        }

        setTimeout(() => {
          setGenerationProgress(100);
          goToStep(2);
        }, 500);
      } catch (error) {
        showError(
          error?.error || error?.message || "Error al generar el borrador.",
        );
        setSubject("");
        setMessage("");
      } finally {
        clearInterval(generationTimer.current);
        clearInterval(msgInterval);
        setIsGenerating(false);
      }
      return;
    }

    if (currentStep === 2) {
      const wc = message.trim().split(/\s+/).filter(Boolean).length;
      if (wc < 40) return;

      try {
        setIsSending(true);
        const res = await services.jobApplications.sendEmailToContactor(
          id,
          contact.id,
          subject,
          message,
        );
        if (!res?.success) throw res;
        setSentSuccessfully(true);
        goToStep(3);
      } catch (error) {
        showError(
          error?.error || error?.message || "No se pudo enviar el mensaje.",
        );
      } finally {
        setIsSending(false);
      }
      return;
    }

    if (currentStep === 3) {
      onClose(sentSuccessfully, draftedStatus);
    }
  };

  const handleBack = () => {
    if (isGenerating) return;
    if (currentStep === 2) goToStep(1);
    else if (currentStep === 3) goToStep(2);
  };

  const cancelGeneration = () => {
    if (generationTimer.current) clearInterval(generationTimer.current);
    setIsGenerating(false);
    setGenerationProgress(0);
    setGenerationStep(0);
  };

  const polishMessage = () => {
    let polished = message.replace(/\s+\n/g, "\n").replace(/\n\s+/g, "\n");
    if (!/Si no eres la persona indicada/i.test(polished)) {
      polished += `\n\nSi no eres la persona indicada, ¿podrías por favor reenviar mi mensaje al responsable? ¡Gracias!`;
    }
    if (!/¿.*\?/i.test(polished)) {
      polished =
        polished.replace(/\n\n?$/, "") +
        `\n\n¿Podemos coordinar una entrevista corta esta semana?`;
    }
    setMessage(polished.trim());
  };

  const copyMessage = () => {
    navigator.clipboard.writeText(`${subject}\n\n${message}`);
    showSuccess("Mensaje copiado al portapapeles");
  };

  const getWordCount = (text) =>
    text.trim().split(/\s+/).filter(Boolean).length;

  if (!isOpen) return null;

  // ======= UI =================================================================

  return (
    <>
      {/* Backdrop (lilac tint) */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background:
            "radial-gradient(120% 140% at 80% -40%, rgba(94,63,165,.30), rgba(0,0,0,.55))",
          backdropFilter: "blur(2px)",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget)
            onClose(sentSuccessfully, draftedStatus);
        }}
      />

      {/* Generation Overlay (glass + brand) */}
      {isGenerating && (
        <div className="fixed inset-0 z-[150] grid place-items-center p-4">
          <div
            className="max-w-md w-full rounded-2xl shadow-2xl border"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,.95), rgba(255,255,255,.92))",
              borderColor: "rgba(94,63,165,.18)",
              boxShadow:
                "0 18px 38px rgba(20,16,45,.18), 0 0 0 1px rgba(255,255,255,.5) inset",
            }}
          >
            <div className="p-6 text-center">
              <div className="w-10 h-10 mx-auto mb-4 rounded-full grid place-items-center bg-white shadow-sm">
                <div
                  className="w-6 h-6 rounded-full animate-spin border-2 border-transparent"
                  style={{
                    borderTopColor: BRAND.secondary,
                    borderRightColor: BRAND.primary,
                  }}
                />
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-1">
                Generando tu mensaje…
              </h3>
              <p className="text-sm text-gray-600 mb-5">
                La IA está creando un borrador en español para{" "}
                <span className="font-semibold">
                  {company?.name || "la empresa"}
                </span>
              </p>

              <p className="text-sm text-gray-700 mb-3 font-medium">
                {generationSteps[generationStep]}
              </p>

              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${generationProgress}%`,
                    background: `linear-gradient(90deg, ${BRAND.secondary}, ${BRAND.primary})`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mb-4">
                <span>{Math.round(generationProgress)}% completado</span>
                <span>unos segundos…</span>
              </div>

              <button
                onClick={cancelGeneration}
                className="w-full py-3 rounded-xl font-semibold border transition-colors"
                style={{
                  borderColor: "rgba(94,63,165,.25)",
                  background: "white",
                }}
              >
                Cancelar y editar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal (bottom sheet) */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 max-h-[96vh] flex flex-col rounded-t-2xl shadow-[0_-18px_38px_rgba(20,16,45,.18)] transition-transform duration-500 ease-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          background:
            "conic-gradient(from 210deg at 80% -20%, rgba(94,63,166,.08), #fff 45%), #ffffff",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent stripe */}
        <div
          className="h-1 rounded-t-2xl"
          style={{
            background: `linear-gradient(90deg, ${BRAND.secondary}, ${BRAND.primary})`,
          }}
        />

        {/* Close */}
        <button
          type="button"
          onClick={() => onClose(sentSuccessfully, draftedStatus)}
          className="absolute top-3 right-3 w-10 h-10 grid place-items-center rounded-full hover:brightness-105 transition"
          aria-label="Cerrar"
          style={{
            background: "rgba(94,63,166,.08)",
            boxShadow: "0 0 0 1px rgba(94,63,166,.18) inset",
            color: BRAND.primary,
          }}
        >
          ×
        </button>

        {/* Header */}
        <div
          className="sticky top-0 z-10 px-4 py-3 border-b backdrop-blur-sm"
          style={{
            borderColor: "rgba(94,63,166,.18)",
            background: "rgba(255,255,255,.95)",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black tracking-tight text-gray-900">
                Contactar reclutador
              </h2>
              <p className="text-sm text-gray-600">
                Escribe a {contact?.name || contact?.initials || "RR. HH."}
              </p>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((step, i) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full grid place-items-center text-sm font-extrabold`}
                    style={{
                      background:
                        currentStep >= step
                          ? `linear-gradient(180deg, ${BRAND.secondary}, ${BRAND.primary})`
                          : "transparent",
                      color: currentStep >= step ? "white" : "#9CA3AF",
                      boxShadow:
                        currentStep >= step
                          ? "0 8px 18px rgba(94,63,166,.28)"
                          : "0 0 0 1px rgba(156,163,175,.55) inset",
                    }}
                  >
                    {step}
                  </div>
                  {i < 2 && (
                    <div
                      className="w-6 h-0.5 mx-1 rounded-full"
                      style={{
                        background:
                          currentStep > step
                            ? `linear-gradient(90deg, ${BRAND.secondary}, ${BRAND.primary})`
                            : "rgba(156,163,175,.55)",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-4 py-4">
          {/* Contact card */}
          <div
            className="rounded-2xl p-4 mb-4 shadow-sm border"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,1), rgba(250,249,255,.85))",
              borderColor: "rgba(94,63,166,.18)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full grid place-items-center text-white font-black"
                style={{
                  background: `linear-gradient(180deg, ${BRAND.secondary}, ${BRAND.primary})`,
                  boxShadow: "0 8px 18px rgba(94,63,166,.28)",
                }}
              >
                {getAvatarInitials(contact?.name || contact?.initials || "HR")}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 truncate">
                  {contact?.name || `${contact?.initials || "Reclutador"}`}
                </h3>
                <p className="text-sm text-gray-600 truncate">
                  {contact?.role || "Reclutador"} — {company?.name || "Empresa"}{" "}
                  · 📍 {contact?.city || job?.city || "Ciudad"}
                </p>
              </div>
            </div>
          </div>

          {/* Step 1 */}
          {currentStep === 1 && (
            <div className={`space-y-4 ${isAnimating ? "animate-pulse" : ""}`}>
              {/* NEW: Tips teaser (lukket som default) */}
              <div
                className="rounded-2xl p-4 shadow-sm border bg-white"
                style={{ borderColor: "rgba(94,63,166,.18)" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">✨</span>
                    <div>
                      <div className="text-sm font-bold text-gray-900">
                        Consejos (opcional)
                      </div>
                      <div className="text-xs text-gray-600">
                        Añade 2–4 puntos rápidos para destacar.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowTips((v) => !v)}
                    aria-expanded={showTips}
                    className="px-3 py-1.5 rounded-lg text-sm font-bold text-white transition-colors"
                    style={{
                      background: `linear-gradient(90deg, ${BRAND.secondary}, ${BRAND.primary})`,
                      boxShadow: "0 6px 14px rgba(94,63,166,.20)",
                    }}
                  >
                    {showTips ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>

              {/* Tips (kun når åbnet) */}
              {showTips && (
                <div
                  className="rounded-2xl p-4 shadow-sm border"
                  style={{
                    borderColor: "rgba(94,63,166,.18)",
                    background: "white",
                  }}
                  onMouseEnter={stopCarousel}
                  onMouseLeave={startCarousel}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => {
                        stopCarousel();
                        setCarouselIndex(
                          (prev) => (prev - 1 + tips.length) % tips.length,
                        );
                        startCarousel();
                      }}
                      className="w-8 h-8 rounded-lg grid place-items-center border bg-white hover:bg-gray-50"
                      style={{
                        borderColor: "rgba(94,63,166,.18)",
                        color: BRAND.primary,
                      }}
                    >
                      ◀
                    </button>

                    <div className="flex-1 min-w-0">
                      <div
                        className="text-xs font-bold"
                        style={{ color: BRAND.primary }}
                      >
                        Consejo
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed">
                        {tips[carouselIndex].question}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        stopCarousel();
                        setCarouselIndex((prev) => (prev + 1) % tips.length);
                        startCarousel();
                      }}
                      className="w-8 h-8 rounded-lg grid place-items-center border bg-white hover:bg-gray-50"
                      style={{
                        borderColor: "rgba(94,63,166,.18)",
                        color: BRAND.primary,
                      }}
                    >
                      ▶
                    </button>
                  </div>

                  <div
                    className="flex items-center gap-2 mt-3 pt-3 border-t"
                    style={{ borderColor: "rgba(94,63,166,.12)" }}
                  >
                    <span className="text-xs text-gray-500">Añadir:</span>
                    <span
                      className="px-2 py-1 rounded-full text-xs"
                      style={{
                        background: "rgba(94,63,166,.06)",
                        border: "1px dashed rgba(94,63,166,.28)",
                        color: "#374151",
                      }}
                    >
                      {tips[carouselIndex].suggestion}
                    </span>
                    <button
                      onClick={addSuggestionChip}
                      className="px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                      style={{
                        color: "white",
                        background: `linear-gradient(90deg, ${BRAND.secondary}, ${BRAND.primary})`,
                        boxShadow: "0 6px 14px rgba(94,63,166,.20)",
                      }}
                    >
                      Añadir chip
                    </button>
                  </div>

                  {/* Dots */}
                  <div className="flex justify-center gap-1 mt-3">
                    {tips.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          stopCarousel();
                          setCarouselIndex(i);
                          startCarousel();
                        }}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background:
                            i === carouselIndex
                              ? `linear-gradient(90deg, ${BRAND.secondary}, ${BRAND.primary})`
                              : "rgba(156,163,175,.65)",
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Points */}
              <div>
                <h4 className="text-base font-bold text-gray-900 mb-1">
                  ¿Qué puedes aportar?
                </h4>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Escribe algo y pulsa Enter (ej.: 'Puedo empezar hoy')"
                    value={customChip}
                    onChange={(e) => setCustomChip(e.target.value)}
                    onKeyDown={handleCustomChipKeyDown}
                    className="flex-1 text-gray-700 px-3 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 bg-white"
                    style={{
                      borderColor: "rgba(94,63,166,.20)",
                      boxShadow: "0 0 0 0 rgba(0,0,0,0)",
                      "--tw-ring-color": BRAND.primary,
                    }}
                  />
                </div>

                {/* Selected chips */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedChips.map((chip, i) => (
                    <button
                      key={`${chip}-${i}`}
                      onClick={() => toggleChip(chip)}
                      className="px-3 py-2 rounded-full text-sm font-medium text-white hover:brightness-110 transition"
                      style={{
                        background: `linear-gradient(90deg, ${BRAND.secondary}, ${BRAND.primary})`,
                        boxShadow: "0 6px 14px rgba(94,63,166,.20)",
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <p className="text-xs text-gray-500">
                  Consejo: 2–4 puntos cortos es ideal.
                </p>
              </div>

              {/* Preset chips */}
              <div>
                <h4 className="text-base font-bold text-gray-900 mb-1">
                  Puntos sugeridos
                </h4>
                <div className="flex flex-wrap gap-2">
                  {lessPresetChips.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => toggleChip(chip)}
                      className="px-3 py-2 rounded-full text-sm font-medium transition-all"
                      style={
                        selectedChips.includes(chip)
                          ? {
                              color: "white",
                              background: `linear-gradient(90deg, ${BRAND.secondary}, ${BRAND.primary})`,
                              boxShadow: "0 6px 14px rgba(94,63,166,.20)",
                            }
                          : {
                              background: "rgba(94,63,166,.06)",
                              border: "1px solid rgba(94,63,166,.22)",
                              color: "#374151",
                            }
                      }
                    >
                      {chip}
                    </button>
                  ))}

                  {showMoreChips &&
                    moreChips.map((chip) => (
                      <button
                        key={chip}
                        onClick={() => toggleChip(chip)}
                        className="px-3 py-2 rounded-full text-sm font-medium transition-all"
                        style={
                          selectedChips.includes(chip)
                            ? {
                                color: "white",
                                background: `linear-gradient(90deg, ${BRAND.secondary}, ${BRAND.primary})`,
                                boxShadow: "0 6px 14px rgba(94,63,166,.20)",
                              }
                            : {
                                background: "rgba(94,63,166,.06)",
                                border: "1px solid rgba(94,63,166,.22)",
                                color: "#374151",
                              }
                        }
                      >
                        {chip}
                      </button>
                    ))}

                  {presetChips.length > 8 && (
                    <button
                      onClick={() => setShowMoreChips(!showMoreChips)}
                      className="px-3 py-2 bg-white rounded-full text-sm font-semibold hover:bg-gray-50 transition"
                      style={{
                        boxShadow: "0 0 0 1px rgba(94,63,166,.22) inset",
                        color: BRAND.primary,
                      }}
                    >
                      {showMoreChips ? "Ocultar" : "Ver más"}
                    </button>
                  )}
                </div>
              </div>

              {/* LinkedIn/CV */}
              <div>
                <h4 className="text-base font-bold text-gray-900 mb-1">
                  LinkedIn / CV (opcional)
                </h4>
                <input
                  type="url"
                  placeholder="Pega tu enlace"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="w-full text-gray-700 px-3 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 bg-white"
                  style={{
                    borderColor: "rgba(94,63,166,.20)",
                    "--tw-ring-color": BRAND.primary,
                  }}
                />
              </div>

              {!canProceedFromStep1() && (
                <div
                  className="text-sm font-medium"
                  style={{ color: BRAND.primary }}
                >
                  Selecciona al menos <strong>3 puntos</strong> para continuar.
                </div>
              )}
            </div>
          )}

          {/* Step 2 (renset — ingen "Elige estilo") */}
          {currentStep === 2 && (
            <div className={`space-y-4 ${isAnimating ? "animate-pulse" : ""}`}>
              {/* Asunto */}
              <div>
                <h4 className="text-base font-bold text-gray-900 mb-1">
                  Asunto
                </h4>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full text-gray-700 px-3 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 bg-white"
                  style={{
                    borderColor: "rgba(94,63,166,.20)",
                    "--tw-ring-color": BRAND.primary,
                  }}
                />
              </div>

              {/* Mensaje */}
              <div>
                <h4 className="text-base font-bold text-gray-900 mb-1">
                  Mensaje
                </h4>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  className="w-full text-gray-700 px-3 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 resize-vertical bg-white"
                  style={{
                    borderColor: "rgba(94,63,166,.20)",
                    "--tw-ring-color": BRAND.primary,
                  }}
                />
                {getWordCount(message) < 40 && (
                  <p className="text-sm text-orange-600 font-medium mt-2">
                    El mensaje es muy corto. Añade 1–2 frases (mín. ~40
                    palabras).
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={polishMessage}
                  className="flex-1 py-2 rounded-xl font-semibold bg-white hover:bg-gray-50 transition"
                  style={{
                    boxShadow: "0 0 0 1px rgba(94,63,166,.22) inset",
                    color: BRAND.primary,
                  }}
                >
                  Mejorar
                </button>
                <button
                  onClick={copyMessage}
                  className="flex-1 py-2 rounded-xl font-semibold bg-white hover:bg-gray-50 transition"
                  style={{
                    boxShadow: "0 0 0 1px rgba(94,63,166,.22) inset",
                    color: BRAND.primary,
                  }}
                >
                  Copiar
                </button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {currentStep === 3 && (
            <div className={`space-y-4 ${isAnimating ? "animate-pulse" : ""}`}>
              <div className="text-center">
                <div className="text-xl text-gray-900 font-black mb-2">
                  ✅ Mensaje enviado
                </div>
                <p className="text-sm text-gray-600">
                  El comprobante queda guardado aquí.
                </p>
              </div>

              <div
                className="rounded-2xl p-4"
                style={{
                  background: "rgba(94,63,166,.06)",
                  border: "1px solid rgba(94,63,166,.18)",
                }}
              >
                <div className="space-y-2 text-gray-800">
                  <div>
                    <strong>Para:</strong>{" "}
                    {contact?.name || contact?.initials || "Reclutador"}
                  </div>
                  <div>
                    <strong>Asunto:</strong> {subject}
                  </div>
                  <div>
                    <strong>Vista previa:</strong>{" "}
                    <span>
                      {message.replace(/\n/g, " ").slice(0, 160)}
                      {message.length > 160 ? "…" : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div
          className="sticky bottom-0 px-4 py-2 border-t"
          style={{
            borderColor: "rgba(94,63,166,.18)",
            background: "rgba(255,255,255,.95)",
          }}
        >
          <div className="flex gap-2">
            {currentStep !== 3 && (
              <button
                onClick={handleBack}
                disabled={currentStep === 1 || isGenerating}
                className="flex-1 py-2 rounded-xl font-semibold bg-white hover:bg-gray-50 transition disabled:opacity-50"
                style={{
                  boxShadow: "0 0 0 1px rgba(94,63,166,.22) inset",
                  color: BRAND.primary,
                }}
              >
                Atrás
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={
                (currentStep === 1 && !canProceedFromStep1()) ||
                (currentStep === 2 &&
                  (getWordCount(message) < 40 || isSending)) ||
                isGenerating
              }
              className="flex-1 text-white font-extrabold py-2 rounded-xl transition disabled:opacity-50"
              style={{
                background: `radial-gradient(120% 140% at 80% -40%, ${BRAND.secondary} 0%, ${BRAND.primary} 55%, #4c2f96 100%)`,
                boxShadow:
                  "0 18px 38px rgba(20,16,45,.10), 0 0 0 1px rgba(255,255,255,.25) inset, 0 12px 30px rgba(94,63,166,.28)",
                letterSpacing: "0.2px",
              }}
            >
              {currentStep === 1 && "Siguiente"}
              {currentStep === 2 &&
                (isSending ? "Enviando…" : "Enviar de forma segura")}
              {currentStep === 3 && "Comprar más contactos"}
            </button>
          </div>
        </div>
      </div>

      {ToastComponent}
    </>
  );
};

export default WizardModal;
