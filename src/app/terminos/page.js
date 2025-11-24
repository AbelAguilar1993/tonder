/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// Hero Section Component
function HeroSection() {
  return (
    <header className="relative overflow-hidden rounded-xl border border-[#C7BCE0] bg-gradient-to-br from-[#F7F1FA] to-white shadow-lg mb-4 p-2 md:p-4">
      {/* Background gradients */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-16 -left-16 h-[200px] w-[200px] rounded-full blur-3xl opacity-15 bg-[#B276CA]" />
        <div className="absolute -top-20 right-[-40px] h-[180px] w-[180px] rounded-full blur-3xl opacity-10 bg-[#5E3FA5]" />
        <div className="absolute inset-0 bg-[radial-gradient(600px_300px_at_50%_-100px,rgba(255,255,255,0.1),transparent)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center">
        <h1 className="text-3xl md:text-4xl font-black text-[#261942] leading-tight mb-4">
          Términos y{" "}
          <span className="bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
            Condiciones
          </span>
        </h1>

        <p className="my-4 text-sm text-gray-600">
          Última actualización:{" "}
          <span className="font-semibold">27 de septiembre de 2025</span>
        </p>

        <p className="text-lg text-gray-700 max-w-2xl mx-auto mb-6">
          Este documento rige el acceso y uso de <strong>EmpleoSafari</strong>{" "}
          en Latinoamérica, incluido <strong>Puerto Rico</strong>. Al utilizar
          nuestros servicios, aceptas íntegramente estos Términos.
        </p>
      </div>
    </header>
  );
}

// Table of Contents Component
function TableOfContentsSection() {
  const [activeSection, setActiveSection] = useState("1");

  const tocItems = [
    { id: "1", title: "Definiciones", essential: true },
    { id: "2", title: "Aceptación y elegibilidad" },
    { id: "3", title: "Objeto del servicio" },
    { id: "4", title: "Cuentas y seguridad" },
    { id: "5", title: "Uso permitido y prohibiciones" },
    { id: "6", title: "Pagos & Reembolsos", essential: true },
    { id: "7", title: "Entrega de productos/servicios digitales" },
    { id: "8", title: "Contenido del usuario y licencia" },
    { id: "9", title: "Propiedad intelectual" },
    { id: "10", title: "dLocalGo", essential: true },
    { id: "11", title: "Responsabilidad", essential: true },
    { id: "12", title: "Indemnidad" },
    { id: "13", title: "Suspensión y terminación" },
    { id: "14", title: "Cumplimiento legal regional" },
    { id: "15", title: "Impuestos, moneda local y conversión" },
    { id: "16", title: "Fuerza mayor" },
    { id: "17", title: "Modificaciones a los Términos" },
    { id: "18", title: "Ley aplicable", essential: true },
    { id: "19", title: "Notificaciones y contacto" },
    { id: "20", title: "Generales", essential: true },
  ];

  const scrollToSection = (id) => {
    const element = document.getElementById(`section-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setActiveSection(id);
    }
  };

  useEffect(() => {
    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id.replace("section-", "");
          setActiveSection(id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      rootMargin: "0px 0px -65% 0px",
      threshold: 0.2,
    });

    tocItems.forEach((item) => {
      const element = document.getElementById(`section-${item.id}`);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative rounded-xl border border-[#C7BCE0] bg-gradient-to-b from-[#F7F1FA] to-white shadow-lg mb-4 p-4">
      <h2 className="text-xl font-black mb-4 bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent text-center">
        📚 Navegación rápida
      </h2>

      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[#261942] mb-2">
          Secciones esenciales:
        </h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {tocItems
            .filter((item) => item.essential)
            .map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#B276CA] ${
                  activeSection === item.id
                    ? "bg-[#5E3FA5] text-white"
                    : "bg-white border border-[#C7BCE0] text-[#4B3284] hover:bg-[#F7F1FA]"
                }`}
                aria-label={`Navegar a sección ${item.id}: ${item.title}`}
              >
                {item.id}. {item.title}
              </button>
            ))}
        </div>
      </div>

      <details className="group">
        <summary className="flex items-center justify-between cursor-pointer font-semibold text-[#261942] p-2 rounded hover:bg-[#F7F1FA]">
          <span>Ver todas las secciones</span>
          <span className="text-[#5E3FA5] transition-transform duration-200 group-open:rotate-180">
            ▼
          </span>
        </summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {tocItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={`px-3 py-2 rounded-lg text-sm text-left transition-all focus:outline-none focus:ring-2 focus:ring-[#B276CA] ${
                activeSection === item.id
                  ? "bg-[#5E3FA5] text-white"
                  : "bg-white border border-[#C7BCE0] text-[#4B3284] hover:bg-[#F7F1FA]"
              }`}
              aria-label={`Navegar a sección ${item.id}: ${item.title}`}
            >
              {item.id}. {item.title}
              {item.essential && (
                <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1 rounded">
                  Esencial
                </span>
              )}
            </button>
          ))}
        </div>
      </details>
    </section>
  );
}

// Terms Section Component
function TermsSection({ id, title, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section id={`section-${id}`} className="mb-4 scroll-mt-20">
      <details
        className="group rounded-xl border border-[#C7BCE0] bg-white p-4 shadow-sm hover:shadow-md transition-all"
        open={isOpen}
        onToggle={(e) => setIsOpen(e.target.open)}
      >
        <summary className="select-none font-semibold text-[#261942] list-none cursor-pointer">
          <div className="flex items-center justify-between">
            <span className="text-sm">
              {id}. {title}
            </span>
            <span className="text-[#5E3FA5] transition-transform duration-200 group-open:rotate-180">
              ▼
            </span>
          </div>
        </summary>
        <div className="mt-4">
          <div className="text-sm text-gray-700 space-y-2">{children}</div>
        </div>
      </details>
    </section>
  );
}

// Terms Content Component
function TermsContentSection() {
  return (
    <div className="space-y-0">
      <TermsSection id="1" title="Definiciones" defaultOpen={false}>
        <p>
          <strong>"EmpleoSafari", "nosotros", "nuestro"</strong>:
          EmpleoSafari.com, Inc.
        </p>
        <p>
          <strong>"Plataforma"</strong>: Sitio web, panel y servicios asociados.
        </p>
        <p>
          <strong>"Usuario(s)"</strong>: Personas o empresas que acceden a la
          Plataforma, incluyendo <em>Candidatos</em> y <em>Reclutadores</em>.
        </p>
        <p>
          <strong>"Contenido"</strong>: Información publicada o entregada por
          EmpleoSafari o por los Usuarios.
        </p>
        <p>
          <strong>"Productos/Servicios"</strong>: Acceso a datos de contacto
          verificados, publicaciones de vacantes y herramientas relacionadas.
        </p>
        <p>
          <strong>"Medios de pago locales"</strong>: Métodos habilitados en cada
          país (ej.: tarjetas, transferencias, billeteras, pagos en ventanilla),
          provistos a través de <em>dLocalGo</em>.
        </p>
      </TermsSection>

      <TermsSection id="2" title="Aceptación y elegibilidad">
        <p>
          2.1. Al registrarte o usar la Plataforma, declaras que tienes
          capacidad legal para contratar según las leyes de tu país y que eres
          mayor de edad.
        </p>
        <p>
          2.2. Si representas a una empresa, garantizas que tienes autoridad
          para aceptar estos Términos en su nombre.
        </p>
        <p>
          2.3. El uso está condicionado al cumplimiento de estos Términos y de
          las leyes aplicables en tu país o territorio.
        </p>
      </TermsSection>

      <TermsSection id="3" title="Objeto del servicio">
        <p>
          3.1. EmpleoSafari <strong>no es empleador</strong> ni agencia de
          contratación; facilitamos la conexión entre Candidatos y Reclutadores
          verificados.
        </p>
        <p>
          3.2. No garantizamos contratación, entrevistas ni resultados
          específicos. Proveemos herramientas y datos destinados a agilizar el
          contacto directo.
        </p>
        <p>
          3.3. La Plataforma está disponible para{" "}
          <strong>Latinoamérica, incluido Puerto Rico</strong>. La
          disponibilidad de funciones y medios de pago puede variar por país.
        </p>
        <p>
          3.4. Podemos actualizar funciones, interfaces y procesos sin aviso
          previo, siempre buscando mejorar la experiencia.
        </p>
      </TermsSection>

      <TermsSection id="4" title="Cuentas y seguridad">
        <p>
          4.1. Eres responsable de la exactitud de los datos de tu cuenta y de
          mantener la confidencialidad de tus credenciales.
        </p>
        <p>
          4.2. Debes notificarnos de inmediato sobre accesos no autorizados.
          Podemos solicitar verificaciones de identidad para prevenir fraude.
        </p>
        <p>
          4.3. Podemos suspender cuentas por actividad sospechosa o
          incumplimiento de estos Términos.
        </p>
      </TermsSection>

      <TermsSection id="5" title="Uso permitido y prohibiciones">
        <p>
          5.1. Está permitido usar la Plataforma para fines legítimos de
          reclutamiento y búsqueda de empleo.
        </p>
        <p>
          5.2. Está prohibido: (a) publicar vacantes inexistentes o engañosas;
          (b) cobrar a Candidatos tarifas prohibidas por la ley; (c) acosar,
          discriminar o difamar; (d) extraer, raspar o revender datos sin
          autorización; (e) violar derechos de propiedad intelectual; (f)
          vulnerar seguridad o estabilidad del sistema; (g) usar información de
          contacto para spam o fines ajenos a una posible relación laboral.
        </p>
        <p>
          5.3. Podemos eliminar contenido o limitar funciones si detectamos
          incumplimientos.
        </p>
      </TermsSection>

      <TermsSection id="6" title="Planes, precios, pagos y reembolsos">
        <p>
          6.1. Los precios y características de los planes se muestran en la
          Plataforma y pueden cambiar. Los cambios no afectan compras ya
          realizadas.
        </p>
        <p>
          6.2. <strong>Moneda mostrada:</strong> siempre que sea posible, los
          precios se muestran y cobran en{" "}
          <strong>moneda local del país del Usuario</strong>. Si un medio local
          no está disponible, el cobro puede procesarse en USD y tu banco podría
          aplicar conversión.
        </p>
        <p>
          6.3. <strong>Pagos:</strong> se procesan a través de <em>dLocalGo</em>{" "}
          y proveedores bancarios asociados. Pueden aplicar comisiones
          bancarias, conversión de moneda o retenciones locales según el país.
        </p>
        <p>
          6.4. <strong>Reembolsos:</strong> aplican según nuestra{" "}
          <Link
            href="/pagos"
            className="text-[#5E3FA5] hover:underline font-medium"
          >
            Política de Pagos y Reembolsos
          </Link>
          . Algunos productos digitales se entregan de forma inmediata; los
          reembolsos pueden estar sujetos a plazos, verificación y a la no
          utilización indebida del servicio.
        </p>
        <p>
          6.5. <strong>Contracargos:</strong> te pedimos contactarnos antes de
          iniciar un contracargo. Disputas infundadas pueden resultar en
          suspensión de la cuenta.
        </p>
        <p>
          6.6. <strong>Créditos de reemplazo:</strong> cuando un contacto
          resulte inválido (email con hard bounce o persona ya no labora),
          podremos otorgar <strong>crédito 1:1</strong> para reemplazo, no
          convertible a efectivo y con vigencia de 12 meses, conforme a la{" "}
          <Link
            href="/pagos#reembolsos"
            className="text-[#5E3FA5] hover:underline font-medium"
          >
            Política de Pagos y Reembolsos
          </Link>
          .
        </p>
      </TermsSection>

      <TermsSection id="7" title="Entrega de productos/servicios digitales">
        <p>
          7.1. La entrega suele ser inmediata al confirmar el pago (panel y/o
          correo). En ocasiones puede tardar por validaciones antifraude o alta
          demanda.
        </p>
        <p>
          7.2. Es tu responsabilidad revisar el acceso y notificarnos
          incidencias dentro de los plazos indicados en la{" "}
          <Link
            href="/pagos"
            className="text-[#5E3FA5] hover:underline font-medium"
          >
            Política de Pagos y Reembolsos
          </Link>
          .
        </p>
      </TermsSection>

      <TermsSection id="8" title="Contenido del usuario y licencia">
        <p>
          8.1. Eres responsable del contenido que publiques. Debe ser legal,
          veraz y no infringir derechos de terceros.
        </p>
        <p>
          8.2. Nos otorgas una licencia no exclusiva, mundial y libre de
          regalías para alojar, reproducir y mostrar dicho contenido con fines
          de prestación del servicio.
        </p>
        <p>
          8.3. Podemos moderar o retirar contenido que viole estos Términos.
        </p>
      </TermsSection>

      <TermsSection id="9" title="Propiedad intelectual">
        <p>
          9.1. La Plataforma, marcas, logos, software y contenidos de
          EmpleoSafari están protegidos por leyes de propiedad intelectual.
        </p>
        <p>
          9.2. No adquieres derechos sobre nuestra propiedad intelectual salvo
          autorización expresa y por escrito.
        </p>
        <p>
          9.3. Si consideras que algún contenido vulnera derechos, envía un
          aviso conforme a la sección{" "}
          <button
            onClick={() => {
              const element = document.getElementById("section-19");
              element?.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-[#5E3FA5] hover:underline font-medium"
          >
            19. Notificaciones
          </button>
          .
        </p>
      </TermsSection>

      <TermsSection id="10" title="Terceros y pasarelas de pago (dLocalGo)">
        <p>
          10.1. Utilizamos <strong>dLocalGo</strong> como pasarela para
          habilitar <em>medios de pago locales</em> en diversos países (por
          ejemplo, tarjetas, transferencias y billeteras). La disponibilidad
          específica varía por país y puede actualizarse.
        </p>
        <p>
          10.2. dLocalGo y sus bancos aliados operan con sus propios términos y
          políticas. No controlamos sus prácticas ni somos responsables por
          fallas ajenas o por decisiones de aprobación/retención.
        </p>
        <p>
          10.3. Para prevenir fraude, puede requerirse verificación adicional de
          identidad y/o método de pago, lo cual puede demorar la entrega.
        </p>
      </TermsSection>

      <TermsSection id="11" title="Limitación de responsabilidad y garantías">
        <p>
          11.1. La Plataforma se proporciona "tal cual" y "según
          disponibilidad". No garantizamos resultados específicos (entrevistas,
          contratación, etc.).
        </p>
        <p>
          11.2. En la máxima medida permitida por la ley aplicable, EmpleoSafari
          no será responsable por daños indirectos, incidentales, punitivos o
          pérdida de datos, ingresos o reputación.
        </p>
        <p>
          11.3. Nada de lo aquí expuesto limita derechos que por ley no puedan
          renunciarse en tu país o territorio.
        </p>
      </TermsSection>

      <TermsSection id="12" title="Indemnidad">
        <p>
          Te comprometes a mantener indemne a EmpleoSafari frente a
          reclamaciones de terceros derivadas de (a) tu uso indebido de la
          Plataforma; (b) contenido que publiques; (c) violación de estos
          Términos o de derechos de terceros, en la medida permitida por la ley
          aplicable.
        </p>
      </TermsSection>

      <TermsSection id="13" title="Suspensión y terminación">
        <p>
          Podemos suspender o cerrar tu cuenta, con o sin aviso, si incumples
          estos Términos o si hay riesgo de fraude, abuso o daño a terceros o a
          EmpleoSafari.
        </p>
      </TermsSection>

      <TermsSection
        id="14"
        title="Cumplimiento legal regional (LatAm + Puerto Rico)"
      >
        <p>
          14.1. Operamos para{" "}
          <strong>Latinoamérica, incluido Puerto Rico</strong>. Respetamos las
          normas locales de protección al consumidor y de datos personales
          aplicables en cada país o territorio donde se encuentre el Usuario.
        </p>
        <p>
          14.2. En caso de conflicto entre estos Términos y normas locales
          irrenunciables, prevalecerán tales normas en lo que corresponda.
        </p>
        <p>
          14.3. No se hace referencia ni se aplican marcos regulatorios de la
          Unión Europea.
        </p>
      </TermsSection>

      <TermsSection id="15" title="Impuestos, moneda local y conversión">
        <p>
          15.1. Siempre que sea posible, mostramos y cobramos en{" "}
          <strong>moneda local</strong>. Si no hay medio local disponible, el
          cobro puede realizarse en USD. Tu banco o proveedor de pago puede
          aplicar conversión y/o cargos internacionales.
        </p>
        <p>
          15.2. El importe final puede incluir impuestos indirectos vigentes en
          tu país/territorio (por ejemplo, IVA, IGV, ITBIS,{" "}
          <strong>IVU en Puerto Rico</strong>) y/o cargos de los medios de pago
          locales. Dichos importes se informarán durante el proceso de compra
          cuando corresponda.
        </p>
        <p>
          15.3. Para comprobantes o facturas, proporciona tus datos de
          facturación al momento de la compra o mediante nuestro canal de
          soporte.
        </p>
      </TermsSection>

      <TermsSection id="16" title="Fuerza mayor">
        <p>
          No seremos responsables por demoras o incumplimientos causados por
          eventos fuera de nuestro control razonable (por ejemplo, fallas de
          proveedores, interrupciones de internet, desastres, cambios
          regulatorios inesperados).
        </p>
      </TermsSection>

      <TermsSection id="17" title="Modificaciones a los Términos">
        <p>
          Podemos actualizar estos Términos para reflejar cambios en la ley o en
          el servicio. Publicaremos la versión vigente con fecha de
          actualización. El uso continuo implica aceptación.
        </p>
      </TermsSection>

      <TermsSection id="18" title="Ley aplicable y jurisdicción">
        <p>
          18.1. Salvo disposición legal irrenunciable en tu país o territorio,
          estos Términos se rigen por las leyes del Estado de Delaware, Estados
          Unidos.
        </p>
        <p>
          18.2. Salvo disposición legal en contrario, cualquier controversia se
          someterá a los tribunales estatales o federales con sede en Delaware,
          EE. UU.
        </p>
        <p>
          18.3. Si la ley local exige competencia jurisdiccional en tu
          país/territorio (incluido Puerto Rico), esta cláusula aplicará en la
          medida permitida.
        </p>
      </TermsSection>

      <TermsSection id="19" title="Notificaciones y contacto">
        <p>
          19.1. Notificaciones legales:{" "}
          <code className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
            legal@empleosafari.com
          </code>
        </p>
        <p>
          19.2. Dirección registrada (no atención presencial):
          <br />
          EmpleoSafari.com, Inc. — Registro No. 10350440
          <br />
          131 Continental Dr, Suite 305, Newark, DE 19713, USA
        </p>
        <p>
          19.3. Soporte general:{" "}
          <Link
            href="mailto:soporte@empleosafari.com"
            className="text-[#5E3FA5] hover:underline font-medium"
          >
            soporte@empleosafari.com
          </Link>{" "}
          · WhatsApp: +57 300 123 4567
        </p>
      </TermsSection>

      <TermsSection id="20" title="Disposiciones generales">
        <p>
          20.1. Integridad: Estos Términos, junto con la{" "}
          <Link
            href="/privacidad"
            className="text-[#5E3FA5] hover:underline font-medium"
          >
            Política de Privacidad
          </Link>{" "}
          y la{" "}
          <Link
            href="/pagos"
            className="text-[#5E3FA5] hover:underline font-medium"
          >
            Política de Pagos y Reembolsos
          </Link>
          , constituyen el acuerdo completo entre tú y EmpleoSafari.
        </p>
        <p>
          20.2. Cesión: No puedes ceder tus derechos u obligaciones sin nuestro
          consentimiento. Podemos ceder este acuerdo en el marco de una
          reestructuración o venta.
        </p>
        <p>
          20.3. Independencia de cláusulas: Si alguna disposición se declara
          inválida, el resto seguirá vigente.
        </p>
        <p>
          20.4. Renuncia: La falta de ejercicio de un derecho no implica
          renuncia a ese derecho.
        </p>
        <p>
          20.5. Idioma: En caso de versiones en otros idiomas, prevalece la
          versión en español.
        </p>
      </TermsSection>
    </div>
  );
}

/* ---------- Main page ---------- */
export default function TermsPage() {
  useEffect(() => {
    // Add smooth scrolling behavior
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "auto";
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 md:p-4">
      <div className="container max-w-screen-md mx-auto">
        <div className="bg-white rounded-none p-2 md:p-4">
          <HeroSection />
          <TableOfContentsSection />
          <TermsContentSection />
        </div>
      </div>
    </div>
  );
}
