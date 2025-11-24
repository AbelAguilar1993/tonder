/* eslint-disable react/no-unescaped-entities */
// SERVER COMPONENT (static export-friendly; no "use client")

import Link from "next/link";

// --- Hero Section (placeholders -> middleware injects real values) ---
function HeroSection() {
  const Feature = ({ children }) => (
    <div className="group relative overflow-hidden rounded-xl border border-[#C7BCE0] bg-white/80 backdrop-blur-sm p-3 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all">
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#B276CA] to-[#5E3FA5]" />
      <div className="pointer-events-none absolute -left-10 -top-6 h-16 w-24 rotate-12 bg-white/40 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="pl-3 font-bold text-[#261942]">{children}</div>
    </div>
  );

  return (
    <header className="relative overflow-hidden rounded-none border border-[#C7BCE0] bg-white shadow-2xl mb-4 px-3 py-5">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[100px] bg-gradient-to-b from-[#5E3FA5] via-[#B276CA] to-[#F7F1FA] border-b border-[#C7BCE0]" />
        <div className="absolute -top-24 -left-24 h-[280px] w-[280px] rounded-full blur-3xl opacity-25 bg-[#B276CA]" />
        <div className="absolute -top-28 right-[-60px] h-[260px] w-[260px] rounded-full blur-3xl opacity-20 bg-[#5E3FA5]" />
        <div className="absolute inset-0 bg-[radial-gradient(1200px_300px_at_50%_-120px,rgba(255,255,255,0.18),transparent)]" />
      </div>

      <div className="relative z-10">
        <h1 className="text-2xl font-black text-white drop-shadow-[0_1px_0_rgba(0,0,0,0.25)]">
          <span className="inline-block align-middle mr-1 -translate-y-[5px]">🎯</span>
          Desbloquea ahora y obtén
        </h1>

        <p className="text-white/90 font-semibold mt-1 mb-8">
          Accede ya al <span className="relative inline-block"><span className="relative z-[1]">contacto directo</span></span> con RRHH
        </p>

        <div className="space-y-2 mb-5">
          <Feature>🔓 Accede a <strong>contactos verificados</strong></Feature>
          <Feature>✍️ Mensaje profesional <strong>listo para enviar</strong></Feature>
          <Feature>📬 Contacta al reclutador <strong>directamente</strong></Feature>
          <Feature>🚀 <strong>91%</strong> responde en <strong>menos de 5 días</strong></Feature>

          {/* Dynamic by middleware: count + city */}
          <div className="group relative overflow-hidden rounded-xl border border-[#C7BCE0] bg-white/80 backdrop-blur-sm p-3 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#B276CA] to-[#5E3FA5]" />
            <div className="pointer-events-none absolute -left-10 -top-6 h-16 w-24 rotate-12 bg-white/40 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="pl-3 font-bold text-[#261942]">
              📍 <strong className="inline-flex items-center gap-1">
                <span className="ml-1 inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse align-middle" />
              </strong>{" "}
              [[CONTACTS_COUNT]] contactos en <strong>[[GEO_CITY]]</strong> esta semana
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Link
            href="/empleos"
            className="w-full bg-gradient-to-b from-[#7C55B8] to-[#5E3FA5] border border-[#7C55B8] text-white font-black px-3 py-3 rounded-xl shadow-lg hover:from-[#5E3FA5] hover:to-[#4B3284] transition-all text-center"
          >
            Ver oportunidades en [[GEO_CITY]]
          </Link>
          <Link
            href="/guia"
            className="w-full border border-[#C7BCE0] bg-white px-3 py-3 rounded-xl text-[#261942] font-semibold hover:bg-gray-50 transition-colors text-center"
          >
            Cómo funciona
          </Link>
        </div>
      </div>
    </header>
  );
}

// --- Testimonials (static server markup) ---
function TestimonialsSection() {
  const testimonials = [
    { initials: "LG", name: "Laura G.", city: "Bogotá", flag: "🇨🇴", emoji: "⏱️", quote: "Recibí respuesta en solo 3 días — ofrecer turnos nocturnos me abrió la puerta.", highlight: "Respuesta en 3 días" },
    { initials: "AM", name: "Andrés M.", city: "Ciudad de México", flag: "🇲🇽", emoji: "📧", quote: "RRHH pidió mi CV de inmediato. Un correo breve fue suficiente.", highlight: "Pedido de CV al instante" },
    { initials: "SR", name: "Sofía R.", city: "Buenos Aires", flag: "🇦🇷", emoji: "👩‍💼", quote: "Por fin encontré un contacto directo en lugar de esos portales de empleo.", highlight: "Contacto directo con RR. HH." },
  ];

  const HeaderBadge = () => (
    <span className="hidden md:inline-flex items-center gap-1 px-2 py-1 rounded-full border border-[#C7BCE0] bg-[#F7F1FA] text-[11px] font-semibold text-[#4B3284]">
      <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
        <path d="M7.629 13.233l-3.12-3.12a.75.75 0 011.061-1.06l2.589 2.589 4.291-4.291a.75.75 0 111.06 1.06l-4.82 4.822a.75.75 0 01-1.061 0z" />
      </svg>
      Verificado ≤24h
    </span>
  );

  const BadgeVerifiedMobile = () => (
    <span className="md:hidden inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#C7BCE0] bg-[#F7F1FA] text-[11px] font-semibold tracking-wide text-[#4B3284]">
      <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
        <path d="M7.629 13.233l-3.12-3.12a.75.75 0 011.061-1.06l2.589 2.589 4.291-4.291a.75.75 0 111.06 1.06l-4.82 4.822a.75.75 0 01-1.061 0z" />
      </svg>
      Verificado
    </span>
  );

  const Card = ({ t, classes = "" }) => (
    <figure className={"group relative overflow-hidden rounded-2xl border border-[#C7BCE0] bg-gradient-to-b from-[#F7F1FA] to-white shadow-md p-3 hover:shadow-xl transition-all h-full " + classes}>
      <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-[#B276CA] to-[#5E3FA5]" />
      <div className="grid grid-rows-[auto_1fr_auto] h-full">
        <div className="flex items-center gap-3 mb-2 mt-1">
          <div className="rounded-full p-[2px] bg-gradient-to-b from-[#B276CA] to-[#5E3FA5]">
            <div className="h-10 w-10 rounded-full bg-white grid place-items-center text-[#261942] font-bold">{t.initials}</div>
          </div>
          <figcaption className="flex-1">
            <div className="font-semibold text-[#261942] leading-tight">{t.name}</div>
            <div className="text-xs text-gray-500">{t.city} {t.flag}</div>
          </figcaption>
          <BadgeVerifiedMobile />
        </div>
        <blockquote className="relative text-gray-700">
          <span className="absolute -left-2 -top-3 text-4xl leading-none text-[#E6E0F2]" aria-hidden="true">“</span>
          <p className="italic pl-3"><span className="not-italic mr-1">{t.emoji}</span>“{t.quote}”</p>
        </blockquote>
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 font-semibold text-[#5E3FA5]">
            <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm.75 4.75a.75.75 0 00-1.5 0V10c0 .199.079.39.22.53l2.5 2.5a.75.75 0 101.06-1.06l-2.28-2.28V6.75z" />
            </svg>
            {t.highlight}
          </span>
        </div>
      </div>
    </figure>
  );

  return (
    <section className="mb-3">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-lg md:text-xl font-black mb-1 mt-3 bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
          🤝 Ya confiaron en nosotros
        </h2>
        <HeaderBadge />
      </div>

      <div className="md:hidden overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" aria-label="Testimonios de usuarios">
        <div className="flex gap-3">
          {testimonials.map((t, i) => (<Card key={`m-${i}`} t={t} classes="min-w-[85%] snap-start" />))}
          <div className="shrink-0 w-[1x]" aria-hidden="true" />
        </div>
      </div>

      <div className="hidden md:grid grid-cols-3 gap-3">
        {testimonials.map((t, i) => (<Card key={`d-${i}`} t={t} />))}
      </div>
    </section>
  );
}

// --- Static stats (no client animation) ---
function StatsSection() {
  const stats = [
    { icon: "🗂️", value: "1.323+", label: "Ofertas activas" },
    { icon: "🏢", value: "304+",  label: "Empresas" },
    { icon: "👥", value: "2.134+", label: "Contactos" },
    { icon: "⚡", value: "91%",    label: "Tasa de respuesta" },
  ];

  const Card = ({ s }) => (
    <article className="group relative overflow-hidden rounded-2xl border border-[#C7BCE0] bg-gradient-to-b from-[#F7F1FA] to-white p-3 md:p-4 text-center shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all">
      <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-[#B276CA] to-[#5E3FA5]" />
      <div className="pointer-events-none absolute -right-2 -top-2 opacity-40 group-hover:opacity-80 transition-opacity hidden md:block">
        <span className="text-sm select-none">✦</span>
      </div>
      <div className="mx-auto mb-2 h-10 w-10 rounded-xl bg-gradient-to-b from-[#B276CA] to-[#5E3FA5] text-white grid place-items-center text-base shadow">
        {s.icon}
      </div>
      <div className="text-2xl font-black bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent leading-none">
        {s.value}
      </div>
      <div className="mt-1 text-xs text-gray-600">{s.label}</div>
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute -top-6 left-0 right-0 h-16 bg-[radial-gradient(50%_50%_at_50%_50%,rgba(255,255,255,0.7),transparent)]" />
      </div>
    </article>
  );

  return (
    <section className="mb-5">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-lg md:text-xl font-black mb-1 mt-2 bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
          ⭐ Por qué nos prefieren los candidatos
        </h2>
        <span className="hidden md:inline-flex items-center gap-1 px-2 py-1 rounded-full border border-[#C7BCE0] bg-[#F7F1FA] text-[11px] font-semibold text-[#4B3284]">
          Actualizado ≤24h
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s, i) => (<Card key={i} s={s} />))}
      </div>
    </section>
  );
}

function SupportSection() {
  return (
    <section className="mb-4">
      <h2 className="text-lg md:text-xl font-black mb-2 mt-6 bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
        ❓ ¿Necesitas ayuda?
      </h2>

      <div className="relative rounded-2xl border border-[#C7BCE0] bg-gradient-to-b from-[#F7F1FA] to-white shadow-md p-3 md:p-5 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-[#B276CA] to-[#5E3FA5]" />
        <p className="text-gray-700 mb-4 mt-2">Respondemos rápido — tú decides cómo contactarnos:</p>

        <div className="grid gap-2 md:gap-3 md:grid-cols-2 mb-4">
          <a href="/soporte/" className="group relative rounded-xl border border-[#C7BCE0] bg-white p-3 md:p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B276CA]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-b from-[#B276CA] to-[#5E3FA5] text-white grid place-items-center text-base shadow">📧</div>
              <div className="flex-1">
                <div className="font-semibold text-[#261942] leading-tight">Soporte</div>
                <div className="text-xs text-gray-500">Respuestas a dudas técnicas, pagos y acceso al panel.</div>
              </div>
              <span className="hidden md:inline text-[#5E3FA5] font-bold transform transition-transform group-hover:translate-x-0.5" aria-hidden="true">→</span>
            </div>
          </a>

          <a href="/contacto/" className="group relative rounded-xl border border-[#C7BCE0] bg-white p-3 md:p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B276CA]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-b from-[#B276CA] to-[#5E3FA5] text-white grid place-items-center text-base shadow">💬</div>
              <div className="flex-1">
                <div className="font-semibold text-[#261942] leading-tight">Contacto</div>
                <div className="text-xs text-gray-500">Preguntas generales sobre el uso de la plataforma.</div>
              </div>
              <span className="hidden md:inline text-[#5E3FA5] font-bold transform transition-transform group-hover:translate-x-0.5" aria-hidden="true">→</span>
            </div>
          </a>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">Atención: Lunes a Viernes, 9:00–17:00 (hora local)</p>
          <div className="mt-2">
            <Link href="/guia" className="inline-flex items-center gap-1 text-[#5E3FA5] font-semibold hover:underline">
              Ver FAQ
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor" aria-hidden="true">
                <path d="M12.293 5.293a1 1 0 011.414 0l3 3a.999.999 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L13.586 10H5a1 1 0 110-2h8.586l-1.293-1.293a1 1 0 010-1.414z" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-2 md:px-4 text-gray-600 text-sm">
      <div className="container max-w-screen-md mx-auto py-2 md:py-4">
        <div className="bg-white shadow-lg overflow-hidden p-2 md:p-4">
          <HeroSection />
          <TestimonialsSection />
          <StatsSection />
          <SupportSection />
        </div>
      </div>
    </div>
  );
}
