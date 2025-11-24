// Ingen "use client" her – server component
// Fjernede ubrugte imports/ESLint-disable

// Hero Section Component
function HeroSection() {
  return (
    <header className="relative overflow-hidden rounded-xl border border-[#C7BCE0] bg-gradient-to-br from-[#F7F1FA] to-white shadow-lg mb-4 p-4 md:p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-16 -left-16 h-[200px] w-[200px] rounded-full blur-3xl opacity-15 bg-[#B276CA]" />
        <div className="absolute -top-20 right-[-40px] h-[180px] w-[180px] rounded-full blur-3xl opacity-10 bg-[#5E3FA5]" />
      </div>

      <div className="relative z-10 grid gap-4 md:grid-cols-2 items-start">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#261942] leading-tight">
            Aceleramos el encuentro entre talento y{" "}
            <span className="bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
              reclutadores verificados
            </span>
          </h1>
          <p className="mt-3 text-base text-gray-700">
            EmpleoSafari conecta candidatos serios con responsables reales en
            minutos. Transparencia, velocidad y seguridad — sin rodeos.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#C7BCE0] bg-white p-4 text-center shadow-sm">
              <div className="text-2xl font-black bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
                5,000+
              </div>
              <div className="text-xs text-gray-500">
                Conexiones candidato–reclutador
              </div>
            </div>
            <div className="rounded-xl border border-[#C7BCE0] bg-white p-4 text-center shadow-sm">
              <div className="text-2xl font-black bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
                24–48h
              </div>
              <div className="text-xs text-gray-500">
                Tiempo medio de respuesta
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#C7BCE0] bg-gradient-to-b from-[#F7F1FA] to-white p-5 shadow-sm">
          <h3 className="text-xl font-semibold text-[#261942]">Nuestra misión</h3>
          <p className="mt-2 text-gray-700">
            Hacer que la búsqueda de empleo en Latinoamérica sea{" "}
            <strong>más humana y efectiva</strong>: acceso directo, expectativas
            claras y cero spam.
          </p>
          <ul className="mt-4 space-y-2 text-gray-700">
            <li className="flex gap-2">
              <span className="text-green-500 font-semibold">✓</span>
              <span>Datos verificados — sin perfiles falsos.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-500 font-semibold">✓</span>
              <span>Políticas claras de pagos y créditos 1:1.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-500 font-semibold">✓</span>
              <span>Privacidad y tratamiento responsable de datos.</span>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}

function HowItWorksSection() {
  const features = [
    {
      icon: "🔍",
      title: "Cómo funciona",
      items: [
        "Filtra por cargo, ciudad o industria.",
        "Desbloquea un contacto a la vez (precio por contacto, exclusivo).",
        "Recibe acceso inmediato en tu panel y por email.",
      ],
      note: "Nota: No somos empleadores. Facilitamos el contacto con responsables verificados.",
    },
    {
      icon: "🛡️",
      title: "Por qué confiar",
      items: [
        "🔒 Pagos procesados por proveedores con certificaciones internacionales.",
        "🛡️ Verificación manual + señales automáticas de fraude.",
        "📄 Políticas públicas: Términos, Privacidad, Pagos y Reembolsos.",
      ],
    },
    {
      icon: "🏢",
      title: "Para empresas",
      description: 'Atrae candidatos motivados y accesibles. Sin “post & pray”.',
      items: [
        "⚡ Publicación rápida por rol/ciudad.",
        "🎯 Herramientas de contacto directo y seguimiento.",
        "🤝 Soporte humano L-V, 9:00–16:00 (hora local).",
      ],
    },
  ];

  const splitLeadingEmoji = (str) => {
    const match = str.match(/^(\p{Extended_Pictographic})\s*(.*)$/u);
    if (match) return { bullet: match[1], text: match[2] };
    return { bullet: null, text: str };
  };

  return (
    <section className="mb-4">
      <div className="grid gap-4 md:grid-cols-3">
        {features.map((feature, fIdx) => (
          <div
            key={fIdx}
            className="group relative rounded-2xl border border-[#C7BCE0] bg-gradient-to-b from-[#F7F1FA] to-white p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{feature.icon}</span>
              <h2 className="text-lg font-bold text-[#261942]">{feature.title}</h2>
            </div>

            {feature.description && (
              <p className="mt-2 text-gray-700 mb-3">{feature.description}</p>
            )}

            <ul className="space-y-2 text-gray-700">
              {feature.items.map((raw, iIdx) => {
                if (feature.title === "Cómo funciona") {
                  return (
                    <li key={iIdx} className="flex gap-2 items-start text-sm">
                      <span className="text-[#5E3FA5] font-semibold">{iIdx + 1}.</span>
                      <span className="flex-1">{raw}</span>
                    </li>
                  );
                } else {
                  const { bullet, text } = splitLeadingEmoji(raw);
                  return (
                    <li key={iIdx} className="flex gap-2 items-start text-sm">
                      {bullet && <span className="text-lg leading-none">{bullet}</span>}
                      <span className="flex-1">{text}</span>
                    </li>
                  );
                }
              })}
            </ul>

            {feature.note && <p className="mt-3 text-xs text-gray-500">{feature.note}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function TimelineSection() {
  const timelineItems = [
    { year: "2024", description: "Idea y validación inicial con responsables de reclutamiento y candidatos." },
    { year: "2025", description: "Lanzamiento en ciudades clave y primeras alianzas de pago." },
    { year: "Hoy",  description: "Enfoque en calidad de datos y expansión responsable en LatAm." },
  ];

  return (
    <section className="mb-4">
      <h2 className="text-xl md:text-2xl font-black mb-4 bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
        Nuestra historia
      </h2>

      <div className="relative mx-auto max-w-3xl pl-10">
        <div className="pointer-events-none absolute left-4 inset-y-0 w-[3px] rounded-full bg-gradient-to-b from-[#5E3FA5] via-[#B276CA] to-[#5E3FA5]" />
        {timelineItems.map((item, index) => (
          <article
            key={index}
            className="relative mb-8 rounded-2xl border border-[#C7BCE0] bg-gradient-to-b from-[#F7F1FA] to-white p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <span className="absolute -left-8 top-6 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white ring-8 ring-[#F7F1FA]">
              <span className="h-3 w-3 rounded-full bg-[#5E3FA5]" />
            </span>
            <div className="text-sm font-semibold text-[#5E3FA5] mb-1">{item.year}</div>
            <p className="text-gray-700">{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const testimonials = [
    { quote: "Conseguí hablar con un responsable el mismo día. Sin vueltas.", author: "María P.", role: "Atención al cliente, Bogotá" },
    { quote: "Me ahorró horas de enviar CVs a ciegas. Contacto directo y claro.", author: "Luis G.", role: "Ventas, CDMX" },
  ];

  return (
    <section className="mb-4">
      <h2 className="text-xl md:text-2xl font-black mb-4 bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
        Lo que dicen los usuarios
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {testimonials.map((t, i) => (
          <figure key={i} className="relative rounded-2xl border border-[#C7BCE0] bg-gradient-to-b from-[#F7F1FA] to-white p-5 shadow-sm">
            <blockquote className="text-[#261942] mb-2">{t.quote}</blockquote>
            <figcaption className="text-sm text-gray-500">{t.author} — {t.role}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function TeamSection() {
  const team = [
    { initials: "JP", name: "Juan Pérez", role: "Fundador — Producto/Operaciones", description: "Experiencia de candidato y escalabilidad responsable." },
    { initials: "AG", name: "Ana Gómez", role: "Ingeniería — Plataforma", description: "Infraestructura segura y entregas rápidas." },
    { initials: "CR", name: "Carlos Ruiz", role: "Soporte — LatAm", description: "Atención humana." },
  ];

  return (
    <section className="mb-4">
      <h2 className="text-xl md:text-2xl font-black mb-4 bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
        Equipo
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {team.map((m, i) => (
          <article key={i} className="relative rounded-2xl border border-[#C7BCE0] bg-gradient-to-b from-[#F7F1FA] to-white p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all">
            <div className="flex items-start gap-3 md:flex-col">
              <div className="h-16 w-16 rounded-full bg-gradient-to-b from-[#B276CA] to-[#5E3FA5] text-white grid place-items-center text-lg font-bold shadow-lg shrink-0">
                {m.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[#261942]">{m.name}</div>
                <div className="text-xs text-gray-500 mb-1">{m.role}</div>
                <p className="text-xs text-gray-700">{m.description}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

import FAQSection from "./FAQSection.client";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 md:p-4">
      <div className="container max-w-screen-md mx-auto">
        <div className="bg-white rounded-none p-2 md:p-4">
          <HeroSection />
          <HowItWorksSection />
          <TimelineSection />
          <TestimonialsSection />
          <TeamSection />
          <FAQSection />
        </div>
      </div>
    </div>
  );
}
