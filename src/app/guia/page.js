/* eslint-disable react/no-unescaped-entities */
"use client";

import Link from "next/link";
import { useState, useCallback, useLayoutEffect, useMemo } from "react";

import jobsService from "../../services/jobsService";
import JobsList from "../../components/empleos/JobsList";

/* ---------- How it works ---------- */
function HowItWorksSection() {
  const steps = [
    {
      number: "1",
      icon: "🎯",
      title: "Elige tu oportunidad",
      description:
        "Elige una oportunidad activa, pega un enlace o deja que la IA contacte al reclutador primero.",
    },
    {
      number: "2",
      icon: "🔓",
      title: "Accede a un contacto verificado",
      description:
        "Nombre + forma de contacto. Una vez que el reclutador responde, tendrás acceso completo.",
    },
    {
      number: "3",
      icon: "✍️",
      title: "Manda un mensaje corto con nuestra ayuda",
      description:
        "Redactamos una carta de presentación por ti según tus preferencias. Podrás editar todo libremente.",
    },
  ];

  const StepCard = ({ step }) => (
    <div className="relative pl-10">
      {/* node — nu lodret centreret ift. kortets højde */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 grid place-items-center">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-[#B276CA] to-[#5E3FA5] text-white font-black shadow grid place-items-center">
          {step.number}
        </div>
      </div>

      {/* card */}
      <article className="relative overflow-hidden rounded-2xl border border-[#C7BCE0] bg-gradient-to-b from-[#F7F1FA] to-white p-4 pt-5 shadow-md hover:shadow-xl transition-all">
        {/* top stripe */}
        <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-[#B276CA] to-[#5E3FA5]" />

        <h3 className="flex items-center gap-2 font-bold text-[#261942] mb-1">
          <span className="text-lg leading-none">{step.icon}</span>
          <span>{step.title}</span>
        </h3>
        <p className="text-gray-700">{step.description}</p>
      </article>
    </div>
  );

  return (
    <section className="mb-8">
      <h2 className="text-lg md:text-xl font-black mb-4 mt-2 bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
        🚀 Guía rápida: aprovecha tu oportunidad
      </h2>

      {/* vertical timeline */}
      <div className="relative">
        {/* rail (valgfrit: brug left-[15px] for millimeterpræcis center med chippen) */}
        <div className="absolute left-[14px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#C7BCE0] to-[#C7BCE0]/60" />

        <div className="space-y-4">
          {steps.map((s, i) => (
            <StepCard key={i} step={s} />
          ))}
        </div>
      </div>
    </section>
  );
}
/* ---------- Why this works — VS board (centered VS on desktop + unified mobile colors) ---------- */
function WhyThisWorksSection() {
  /* Ikoner (SVG) */
  const CheckIcon = () => (
    <svg
      viewBox="0 0 20 20"
      className="w-3.5 h-3.5 block"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7.629 13.233l-3.12-3.12a.75.75 0 011.061-1.06l2.589 2.589 4.291-4.291a.75.75 0 111.06 1.06l-4.82 4.822a.75.75 0 01-1.061 0z" />
    </svg>
  );
  const CrossIcon = () => (
    <svg
      viewBox="0 0 20 20"
      className="w-3.5 h-3.5 block"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M6.28 6.28a.75.75 0 011.06 0L10 8.94l2.66-2.66a.75.75 0 111.06 1.06L11.06 10l2.66 2.66a.75.75 0 11-1.06 1.06L10 11.06l-2.66 2.66a.75.75 0 11-1.06-1.06L8.94 10 6.28 7.34a.75.75 0 010-1.06z" />
    </svg>
  );

  /* Grøn “kasse” (chip) — genbruges overalt for 1:1 look */
  const CheckBox = ({ children }) => (
    <span
      className="inline-flex items-center justify-center w-5 h-5 shrink-0 rounded-[6px] bg-green-100 text-green-700 ring-1 ring-green-200 leading-none align-middle"
      aria-hidden="true"
    >
      {children}
    </span>
  );

  /* Række i boardet (positiv/negativ) */
  const Row = ({ text, tone = "pos" }) => (
    <li className="flex items-start gap-2 py-2">
      {tone === "pos" ? (
        <CheckBox>
          <CheckIcon />
        </CheckBox>
      ) : (
        <span className="inline-flex items-center justify-center w-5 h-5 shrink-0 rounded-[6px] bg-red-100 text-red-700 ring-1 ring-red-200 leading-none align-middle">
          <CrossIcon />
        </span>
      )}
      <span className="text-sm text-[#261942]">{text}</span>
    </li>
  );

  /* Ribbon-pill med samme CheckBox */
  const CheckPill = ({ children }) => (
    <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full border border-[#C7BCE0] bg-white/90 text-[12px] text-[#261942]">
      <CheckBox>
        <CheckIcon />
      </CheckBox>
      <span className="font-semibold">{children}</span>
    </span>
  );

  return (
    <section className="mb-8" id="por-que-funciona">
      <h2 className="text-lg md:text-xl font-black mb-2 bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
        🔐 Por qué esto sí funciona
      </h2>

      {/* Ydre container */}
      <div className="relative overflow-hidden rounded-2xl border border-[#C7BCE0] bg-white shadow-md">
        {/* Dekorativ glow (skjult på mobil for at undgå farveslagsmål) */}
        <div className="pointer-events-none absolute -top-24 right-[-80px] h-[260px] w-[260px] rounded-full bg-[#B276CA] blur-3xl opacity-20 hidden md:block" />

        {/* --- BOARD WRAPPER (relative) så VS & divider kan centreres korrekt --- */}
        <div className="relative">
          {/* center divider (kun desktop) */}
          <div
            className="hidden md:block absolute inset-y-0 left-1/2 w-px bg-[#E6E0F2]"
            aria-hidden="true"
          />
          {/* VS-chip (kun desktop) — nu centreret ift. boardet, ikke hele boksen */}
          <div className="hidden md:grid absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 place-items-center w-12 h-12 rounded-full bg-white border border-[#C7BCE0] text-[#5E3FA5] font-black shadow">
            VS
          </div>

          {/* Kolonner — samme hvide baggrund på mobile; forskellige farver fra md: */}
          <div className="grid md:grid-cols-2">
            {/* Venstre: Portales */}
            <div className="p-4 md:p-6 bg-white md:bg-[#FBFAFE]">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />
                <h3 className="text-xs tracking-widest font-black uppercase text-gray-500">
                  Portales de empleo
                </h3>
              </div>

              <ul className="divide-y divide-[#F0ECF9]">
                <Row
                  tone="neg"
                  text="Muestran ofertas; ocultan el contacto decisor."
                />
                <Row
                  tone="neg"
                  text="Respuestas lentas y filtradas por múltiples pasos."
                />
                <Row
                  tone="neg"
                  text="Tu perfil se pierde entre cientos de postulaciones."
                />
                <Row
                  tone="neg"
                  text="Anuncios y patrocinios condicionan lo que ves."
                />
              </ul>

              {/* VS-chip (mobile) */}
              <div className="md:hidden my-4 w-full grid place-items-center">
                <span className="inline-grid place-items-center w-10 h-10 rounded-full bg-white border border-[#C7BCE0] text-[#5E3FA5] font-black shadow">
                  VS
                </span>
              </div>
            </div>

            {/* Højre: Acceso directo */}
            <div className="p-4 md:p-6 bg-white md:bg-gradient-to-b md:from-[#F7F1FA] md:to-white">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-block w-2 h-2 rounded-full bg-[#5E3FA5]" />
                <h3 className="text-xs tracking-widest font-black uppercase text-[#5E3FA5]">
                  Acceso directo (lo nuestro)
                </h3>
              </div>

              <ul className="divide-y divide-[#EFE9FB]">
                <Row
                  tone="pos"
                  text="Contacto verificado ≤24h (email siempre; teléfono cuando procede)."
                />
                <Row
                  tone="pos"
                  text="Llegas YA al reclutador: sin portales intermedios."
                />
                <Row
                  tone="pos"
                  text="Mensaje breve y enfocado, listo para enviar."
                />
                <Row
                  tone="pos"
                  text="Crédito 1:1 si el canal rebota permanentemente."
                />
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ROI Callout */}
      <div className="relative mt-4 rounded-2xl border border-[#C7BCE0] bg-[#16122b] text-white p-4 md:p-5 shadow-md">
        <div
          className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F7F1FA] border border-[#C7BCE0] hidden md:block"
          aria-hidden="true"
        />
        <div
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F7F1FA] border border-[#C7BCE0] hidden md:block"
          aria-hidden="true"
        />

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-b from-[#B276CA] to-[#5E3FA5] grid place-items-center font-black">
            💡
          </div>
          <div>
            <h3 className="font-semibold">Vale la pena desde el primer uso</h3>
            <p className="text-white/90 text-sm mt-1">
              Si una respuesta directa te da un trabajo pagado, el contacto ya
              se habrá amortizado.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Pricing (egen boks/sektion) ---------- */
function PricingSection() {
  return (
    <section className="mb-8">
      <h2 className="text-lg md:text-xl font-black mb-2 text-[#261942] bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
        💸 ¿Por qué hay una tarifa?
      </h2>

      <article className="rounded-2xl border border-[#C7BCE0] bg-gradient-to-b from-[#F7F1FA] to-white p-3 md:p-5 shadow-md">
        <p className="text-gray-700 mb-3">
          Cero pagos de empresas, cero anuncios disfrazados. Todo nuestro
          trabajo es solo para <strong>ti</strong>.
        </p>

        <ul className="space-y-1.5">
          <li className="flex items-start gap-2 text-gray-700">
            <span>🔄</span>
            <span>Información exclusiva, actualizada a cada momento</span>
          </li>
          <li className="flex items-start gap-2 text-gray-700">
            <span>🚫</span>
            <span>
              Tu perfil no se pierde entre montones de CVs que nadie lee.
            </span>
          </li>
          <li className="flex items-start gap-2 text-gray-700">
            <span>🎯</span>
            <span>
              Funciona <em>porque</em> no cualquiera accede gratis.
            </span>
          </li>
        </ul>
      </article>
    </section>
  );
}

/* ---------- FAQ (Search + Filter, uden hashtag-kopi) ---------- */
function FAQSection() {
  const faqs = [
    {
      question: "¿Garantizan un empleo?",
      badge: "Transparencia",
      answer:
        "No. Compras acceso a un contacto verificado de Recursos Humanos o Reclutamiento y un mensaje breve adaptado. Aumenta tus probabilidades de ser leído/a, pero no es una garantía de contratación.",
    },
    {
      question: "¿Qué recibo exactamente al desbloquear?",
      badge: "Qué incluye",
      answer: (
        <ul className="space-y-1 list-disc ml-4">
          <li>
            <strong>Email siempre</strong> del responsable de RR.
            HH./Reclutamiento (<em>verificado en las últimas 24 horas</em>).
          </li>
          <li>
            <strong>Teléfono</strong>{" "}
            <em>cuando está disponible y permitido</em> por políticas de
            privacidad del país/empresa.
          </li>
          <li>
            <strong>Mensaje profesional listo</strong> (asunto + cuerpo) para
            enviar de inmediato, destacando tu disponibilidad, cercanía y
            credenciales simples si las tienes.
          </li>
          <li>
            <strong>Garantía de entregabilidad:</strong> crédito{" "}
            <strong>1:1</strong> si el email rebota de forma permanente (
            <em>hard bounce</em>) o si la persona ya no trabaja allí.
          </li>
        </ul>
      ),
    },
    {
      question: "¿Siempre incluyen email y teléfono?",
      badge: "Datos",
      answer:
        "El email viene siempre al desbloquear. El teléfono depende de disponibilidad y de las políticas de privacidad locales/empresariales. Cuando no aparece, ofrecemos alternativas de contacto y puedes solicitar el número con una declaración de uso responsable.",
    },
    {
      question: "¿Puedo solicitar ver el teléfono si no aparece?",
      badge: "Uso responsable",
      answer:
        "Sí. Tras enviar tu primer mensaje, puedes pedir el “desbloqueo” del teléfono u otro dato directo. Te pediremos aceptar una <strong>declaración de uso responsable</strong> (no spam, uso laboral, no compartir ni revender, respeto al uso justo y a la normativa local).",
    },
    {
      question: "¿De dónde salen los contactos?",
      badge: "Fuentes",
      answer:
        "De canales oficiales de la empresa (sitio corporativo, avisos), buzones de RR. HH./Reclutamiento y directorios públicos. Comprobamos que el canal funciona y está activo antes de mostrártelo.",
    },
    {
      question: "¿Qué significa “verificado en las últimas 24 horas”?",
      badge: "Vigencia",
      answer:
        "Que recientemente comprobamos que el canal recibe mensajes y sigue activo (en las últimas 24 h). Si aun así resultara inactivo o rebota permanentemente, te damos crédito 1:1 sin costo.",
    },
    {
      question: "¿Qué pasa si mi email rebota o la persona ya no trabaja?",
      badge: "Reemplazo",
      answer:
        "Si hay rebote permanente (p. ej., “usuario inexistente”) o una auto‑respuesta de “ya no labora”, te damos un <strong>crédito 1:1</strong> para elegir un contacto equivalente (misma empresa/rol/ciudad). <strong>No aplica</strong> por falta de respuesta, “fuera de oficina” o rebotes temporales (buzón lleno).",
    },
    {
      question: "¿Por qué 1 contacto cada 5 días en la misma empresa?",
      badge: "Uso justo",
      answer:
        "Protege tu reputación ante RR. HH. y mantiene altas las tasas de respuesta para todos. Si necesitas más volumen, busca contactos en otras empresas o ciudades.",
    },
    {
      question: "¿Cómo aumentan mis probabilidades de respuesta?",
      badge: "Respuesta",
      answer: (
        <div>
          <p className="mb-2">
            El mensaje inicial resalta lo que RR. HH. mira primero en muchas
            vacantes:
          </p>
          <ul className="space-y-1 ml-4 list-disc">
            <li>
              <strong>Disponibilidad de turnos</strong> (noches/fines/rotativos)
            </li>
            <li>
              <strong>Fecha de inicio</strong> (hoy / esta semana)
            </li>
            <li>
              <strong>Cercanía</strong> (vives cerca del sitio/ruta)
            </li>
            <li>
              <strong>Certificados simples</strong> (montacargas, HSE)
            </li>
          </ul>
          <p className="mt-2">
            Te pedimos 1–3 datos relevantes y los incorporamos de forma clara en
            tu mensaje.
          </p>
        </div>
      ),
    },
    {
      question: "¿Puedo usar WhatsApp?",
      badge: "Canales",
      answer:
        "Sí. Recomendamos empezar con un email corto (mejor trazabilidad). Si no responde, agrega un WhatsApp de seguimiento a las 24–72 h con un mensaje directo y respetuoso.",
    },
    {
      question: "¿Adjuntan archivos? ¿Se va a spam?",
      badge: "Entregabilidad",
      answer:
        "El primer mensaje es ligero: sin adjuntos pesados y, si hace falta, un solo enlace. Cuidamos asunto y vista previa en móvil. Evita mandar varios mensajes seguidos o plantillas muy largas.",
    },
    {
      question: "¿Cuánto cuesta?",
      badge: "Precio",
      answer:
        "Pagas <strong>por cada contacto desbloqueado</strong> (uno a la vez) para mantener tus postulaciones exclusivas. Mostramos precios en <strong>moneda local</strong> cuando es posible. Pagos seguros con dLocalGo. Compras <strong>no reembolsables por regla general</strong> (entrega digital inmediata); excepciones y crédito 1:1 explicados en /pagos.",
    },
    {
      question: "¿Qué pasa después de desbloquear?",
      badge: "Próximos pasos",
      answer: (
        <ul className="space-y-1 list-disc ml-4">
          <li>
            Ves los <strong>datos completos</strong> del contacto (email
            siempre; teléfono cuando esté disponible).
          </li>
          <li>
            Tu <strong>mensaje está listo</strong> para enviar (puedes
            editarlo).
          </li>
          <li>
            Opcional: programa un{" "}
            <strong>recordatorio en 3 días hábiles</strong>.
          </li>
        </ul>
      ),
    },
    {
      question: "¿Para qué roles/sectores sirve?",
      badge: "Ámbito",
      answer:
        "Para <strong>todas las industrias y tipos de puesto</strong>: operativos, administrativos, técnicos y liderazgo. Ajustamos el mensaje según el perfil.",
    },
    {
      question: "Privacidad y respeto a RR. HH.",
      badge: "Privacidad",
      answer:
        "Nada de envíos masivos: un mensaje 1 a 1, respetuoso. Protegemos los <strong>datos personales</strong> (nombre, email, teléfono, cargo) y solo mostramos lo necesario conforme a la normativa local y nuestras políticas. Lee más en <a class='underline' href='/privacidad/'>/privacidad/</a> y <a class='underline' href='/terminos/'>/terminos/</a>.",
    },
  ];

  // ---- UI state ----
  const [q, setQ] = useState("");
  const [badge, setBadge] = useState("Todos");

  // ---- helpers ----
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const highlight = (text, query) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, "ig"));
    return parts.map((p, i) =>
      p.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-100 px-0.5 rounded">
          {p}
        </mark>
      ) : (
        <span key={i}>{p}</span>
      ),
    );
  };

  // badges til chips
  const badges = useMemo(
    () => ["Todos", ...Array.from(new Set(faqs.map((f) => f.badge)))],
    [faqs],
  );

  // filtrering
  const filtered = useMemo(() => {
    const qn = q.trim().toLowerCase();
    return faqs.filter((f) => {
      const badgeOk = badge === "Todos" || f.badge === badge;
      if (!qn) return badgeOk;
      const inQuestion = f.question.toLowerCase().includes(qn);
      const inAnswer =
        typeof f.answer === "string"
          ? f.answer.toLowerCase().includes(qn)
          : false;
      return badgeOk && (inQuestion || inAnswer);
    });
  }, [faqs, q, badge]);

  const expandAll = () => {
    if (typeof document === "undefined") return;
    document
      .querySelectorAll("details[data-faq]")
      .forEach((d) => (d.open = true));
  };
  const collapseAll = () => {
    if (typeof document === "undefined") return;
    document
      .querySelectorAll("details[data-faq]")
      .forEach((d) => (d.open = false));
  };
  const resetFilters = () => {
    setQ("");
    setBadge("Todos");
    collapseAll();
  };

  return (
    <section>
      <h2 className="text-lg md:text-xl font-black mb-2 text-[#261942] bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
        👉 Preguntas frecuentes
      </h2>

      <div className="relative rounded-2xl border border-[#C7BCE0] bg-white shadow-md overflow-hidden text-gray-700">
        {/* top stripe */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#B276CA] to-[#5E3FA5]" />

        {/* header row */}
        <div className="p-3 md:p-4 border-b border-[#C7BCE0] flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-xl font-black text-[#261942]">
            Todo lo que necesitas saber
          </h2>

          {/* tools (desktop) */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={expandAll}
              className="px-2 py-1 rounded-lg border border-[#C7BCE0] text-sm font-semibold text-[#4B3284] hover:bg-[#F7F1FA]"
            >
              Abrir todo
            </button>
            <button
              onClick={collapseAll}
              className="px-2 py-1 rounded-lg border border-[#C7BCE0] text-sm font-semibold text-[#4B3284] hover:bg-[#F7F1FA]"
            >
              Cerrar todo
            </button>
            <button
              onClick={resetFilters}
              className="px-2 py-1 rounded-lg border border-[#C7BCE0] text-sm font-semibold text-[#4B3284] hover:bg-[#F7F1FA]"
            >
              Restablecer
            </button>
          </div>
        </div>

        {/* controls: search + chips */}
        <div className="px-3 md:px-4 pt-3">
          <div className="flex items-center gap-2">
            {/* search */}
            <div className="flex-1 relative">
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Busca por palabra clave…"
                className="w-full rounded-xl border border-[#C7BCE0] bg-white px-3 py-2 pr-9 text-sm text-[#261942] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B276CA]"
                aria-label="Buscar en preguntas frecuentes"
              />
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#5E3FA5]"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M21 21l-4.35-4.35m1.1-4.4a6.75 6.75 0 11-13.5 0 6.75 6.75 0 0113.5 0z" />
              </svg>
            </div>

            {/* result count (desktop) */}
            <span className="hidden md:inline text-xs text-gray-500">
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* chips */}
          <div className="mt-2 -mx-1 overflow-x-auto pb-1">
            <div className="flex items-center gap-2 px-1">
              {badges.map((b) => (
                <button
                  key={b}
                  onClick={() => setBadge(b)}
                  className={
                    "whitespace-nowrap px-2 py-1 rounded-full border text-[11px] font-semibold " +
                    (badge === b
                      ? "border-[#7C55B8] bg-[#F7F1FA] text-[#4B3284]"
                      : "border-[#C7BCE0] bg-white text-[#4B3284] hover:bg-[#F7F1FA]")
                  }
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* list */}
        <ul className="mt-2 divide-y divide-[#E6E0F2]">
          {filtered.length === 0 ? (
            <li className="p-4 text-sm text-gray-500">
              No encontramos resultados. Prueba con otra palabra o{" "}
              <button
                onClick={resetFilters}
                className="underline text-[#5E3FA5] font-semibold"
              >
                limpia los filtros
              </button>
              .
            </li>
          ) : (
            filtered.map((faq, index) => (
              <li key={index} className="bg-white">
                <details className="group" data-faq>
                  <summary className="flex items-center gap-3 p-3 md:p-4 cursor-pointer select-none transition-colors hover:bg-[#F7F1FA]">
                    {/* question (with highlight) */}
                    <span className="flex-1 font-semibold text-[#261942]">
                      {highlight(faq.question, q)}
                    </span>

                    {/* badge */}
                    <span className="inline-block px-2 py-1 rounded-full border border-[#C7BCE0] bg-[#F7F1FA] text-[11px] font-semibold tracking-wide text-[#4B3284]">
                      {faq.badge}
                    </span>

                    {/* chevron */}
                    <svg
                      className="w-4 h-4 text-[#5E3FA5] transition-transform duration-200 group-open:rotate-180"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" />
                    </svg>
                  </summary>

                  {/* answer */}
                  <div className="px-3 md:px-5 pb-3 md:pb-5 leading-relaxed bg-gradient-to-b from-white to-[#F7F1FA]">
                    {typeof faq.answer === "string" ? (
                      <p dangerouslySetInnerHTML={{ __html: faq.answer }} />
                    ) : (
                      faq.answer
                    )}
                  </div>
                </details>
              </li>
            ))
          )}
        </ul>

        {/* footer tools (mobile) */}
        <div className="md:hidden flex items-center gap-2 p-3 border-t border-[#E6E0F2]">
          <button
            onClick={expandAll}
            className="flex-1 px-2 py-1 rounded-lg border border-[#C7BCE0] text-sm font-semibold text-[#4B3284] hover:bg-[#F7F1FA]"
          >
            Abrir todo
          </button>
          <button
            onClick={collapseAll}
            className="flex-1 px-2 py-1 rounded-lg border border-[#C7BCE0] text-sm font-semibold text-[#4B3284] hover:bg-[#F7F1FA]"
          >
            Cerrar todo
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------- Jobs (with skeletons + brand CTA) ---------- */
const JobsSection = () => {
  const [jobs, setJobs] = useState([]);
  const [locationText, setLocationText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 3,
  });

  const loadJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await jobsService.getJobs(pagination);

      if (response.success) {
        const newJobs = response.data?.jobs || [];
        setJobs(newJobs);
        setLocationText(response.data?.locationText || "");
      } else {
        setError(
          "Failed to load jobs: " + (response?.error || "Unknown error"),
        );
        setJobs([]);
      }
    } catch (err) {
      setError("Failed to load jobs: " + (err?.message || "Unknown error"));
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useLayoutEffect(() => {
    loadJobs();
  }, [pagination.limit, loadJobs]);

  return (
    <section className="mb-8">
      <h2 className="text-lg md:text-xl font-black mb-2 bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
        🎯 Seleccionado solo para ti
      </h2>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-[#E6E0F2] bg-white p-3 md:p-4 shadow animate-pulse"
            >
              <div className="h-4 w-2/3 rounded bg-[#F1E9F9] mb-3"></div>
              <div className="h-3 w-5/6 rounded bg-[#F1E9F9] mb-2"></div>
              <div className="h-3 w-1/2 rounded bg-[#F1E9F9]"></div>
              <div className="mt-4 h-8 w-full rounded-lg bg-[#EFE6FA]"></div>
            </div>
          ))}
        </div>
      ) : jobs?.length > 0 ? (
        <JobsList jobs={jobs} isLoading={loading} location={locationText} />
      ) : (
        <div className="rounded-2xl border border-[#C7BCE0] bg-gradient-to-b from-[#F7F1FA] to-white p-3 md:p-5 text-center shadow">
          <div className="mb-2">
            <svg
              className="w-12 h-12 mx-auto text-[#B276CA]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#261942] mb-1">
            No hay oportunidades disponibles
          </h3>
          <p className="text-sm text-gray-600">
            Vuelve más tarde o explora todas las vacantes en tu ciudad.
          </p>
        </div>
      )}

      <div className="flex justify-center mt-5">
        <Link
          href="/empleos"
          className="inline-flex items-center justify-center rounded-xl px-3 md:px-5 py-2.5 font-bold text-white shadow-lg bg-gradient-to-b from-[#7C55B8] to-[#5E3FA5] hover:from-[#5E3FA5] hover:to-[#4B3284] border border-[#7C55B8] transition-all"
        >
          Mostrar todas las oportunidades
        </Link>
      </div>
    </section>
  );
};

/* ---------- Main page ---------- */
export default function GuidePage() {
  return (
    <div className="min-h-screen relative bg-gradient-to-br from-blue-50 to-indigo-100 p-2 md:p-4 text-gray-700 text-sm">
      {/* Radiale highlights (ingen assets) */}

      <div className="relative container max-w-screen-md mx-auto">
        <div className="bg-white rounded-none p-2 md:p-4">
          <HowItWorksSection />
          <JobsSection />
          <WhyThisWorksSection />
          <PricingSection />
          <FAQSection />
        </div>
      </div>
    </div>
  );
}
