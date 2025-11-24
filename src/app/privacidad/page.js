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
          Política de{" "}
          <span className="bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
            Privacidad
          </span>
        </h1>

        <p className="mt-4 text-sm text-gray-600">
          Última actualización:{" "}
          <span className="font-semibold">27 de septiembre de 2025</span>
        </p>

        <p className="text-lg text-gray-700 max-w-2xl mx-auto mt-6">
          Esta Política explica cómo <strong>EmpleoSafari</strong> recopila,
          usa, comparte y protege tus datos personales en{" "}
          <strong>Latinoamérica (incluido Puerto Rico)</strong>. Al usar la
          Plataforma, aceptas estas prácticas.
        </p>
      </div>
    </header>
  );
}

// Quick Navigation Component
function QuickNavigationSection() {
  const [activeSection, setActiveSection] = useState("1");

  const navItems = [
    { id: "1", title: "Quiénes somos", icon: "🏢", priority: true },
    { id: "2", title: "Alcance", icon: "🌎" },
    { id: "3", title: "Datos que recopilamos", icon: "📊", priority: true },
    { id: "4", title: "Para qué usamos tus datos", icon: "🎯", priority: true },
    { id: "5", title: "Fundamentos del tratamiento", icon: "⚖️" },
    { id: "6", title: "Cookies y tecnologías", icon: "🍪", priority: true },
    { id: "7", title: "Con quién compartimos", icon: "🤝" },
    { id: "8", title: "Transferencias y ubicación", icon: "🌐" },
    { id: "9", title: "Conservación", icon: "📅" },
    { id: "10", title: "Tus derechos", icon: "⭐", priority: true },
    { id: "11", title: "Seguridad", icon: "🔐", priority: true },
    { id: "12", title: "Menores de edad", icon: "👶" },
    { id: "13", title: "Enlaces de terceros", icon: "🔗" },
    { id: "14", title: "Cambios a esta Política", icon: "📝" },
    { id: "15", title: "Contacto de privacidad", icon: "📞", priority: true },
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

    navItems.forEach((item) => {
      const element = document.getElementById(`section-${item.id}`);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative rounded-xl border border-[#C7BCE0] bg-gradient-to-b from-[#F7F1FA] to-white shadow-lg mb-4 p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[#261942] mb-2">
          Secciones clave:
        </h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {navItems
            .filter((item) => item.priority)
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
                {item.icon} {item.id}. {item.title}
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
          {navItems.map((item) => (
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
              {item.icon} {item.id}. {item.title}
              {item.priority && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1 rounded">
                  Clave
                </span>
              )}
            </button>
          ))}
        </div>
      </details>
    </section>
  );
}

// Privacy Section Component
function PrivacySection({ id, title, icon, children, defaultOpen = false }) {
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
              <span>{icon}</span> {id}. {title}
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

// Cookies Table Component
function CookiesTable() {
  const cookieTypes = [
    {
      type: "Necesarias",
      purpose: "Autenticación y seguridad del sitio.",
      examples:
        "Cookie de sesión JWT (HttpOnly); cookies técnicas de Cloudflare (balanceo y protección).",
      color: "bg-green-50 border-green-200",
    },
    {
      type: "Analíticas",
      purpose: "Medición agregada de uso para mejorar el servicio.",
      examples: "Clicky (identificadores propios del servicio).",
      color: "bg-blue-50 border-blue-200",
    },
    {
      type: "Marketing",
      purpose: "Medición/optimización de campañas y anuncios.",
      examples: "Meta Pixel; Google Ads (etiquetas/gtag).",
      color: "bg-purple-50 border-purple-200",
    },
    {
      type: "Pagos",
      purpose: "Completar/validar transacciones y prevenir fraude.",
      examples:
        "dLocalGo puede establecer cookies o identificadores propios según método/país.",
      color: "bg-amber-50 border-amber-200",
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-[#F7F1FA]">
            <th className="border border-[#C7BCE0] px-3 py-2 text-left text-sm font-semibold text-[#261942]">
              Tipo
            </th>
            <th className="border border-[#C7BCE0] px-3 py-2 text-left text-sm font-semibold text-[#261942]">
              Para qué se usa
            </th>
            <th className="border border-[#C7BCE0] px-3 py-2 text-left text-sm font-semibold text-[#261942]">
              Ejemplos
            </th>
          </tr>
        </thead>
        <tbody>
          {cookieTypes.map((cookie, index) => (
            <tr key={index} className={cookie.color}>
              <td className="border border-[#C7BCE0] px-3 py-2 text-sm font-medium">
                {cookie.type}
              </td>
              <td className="border border-[#C7BCE0] px-3 py-2 text-sm">
                {cookie.purpose}
              </td>
              <td className="border border-[#C7BCE0] px-3 py-2 text-sm">
                <strong>{cookie.examples}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Data Rights Section
function DataRightsSection() {
  const rights = [
    {
      icon: "👁️",
      title: "Acceso",
      description: "Ver qué datos tenemos sobre ti",
      action: "Solicitar copia de tus datos",
    },
    {
      icon: "✏️",
      title: "Rectificación",
      description: "Corregir información incorrecta",
      action: "Actualizar datos erróneos",
    },
    {
      icon: "🗑️",
      title: "Eliminación",
      description: "Eliminar tus datos personales",
      action: "Solicitar eliminación",
    },
    {
      icon: "⛔",
      title: "Oposición/Limitación",
      description: "Limitar el uso de tus datos",
      action: "Restringir procesamiento",
    },
    {
      icon: "📦",
      title: "Portabilidad",
      description: "Transferir datos a otro servicio",
      action: "Descargar datos estructurados",
    },
    {
      icon: "🚫",
      title: "Revocación",
      description: "Retirar consentimiento",
      action: "Cancelar permisos dados",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rights.map((right, index) => (
        <div
          key={index}
          className="p-4 rounded-xl bg-white border border-[#C7BCE0] hover:shadow-md transition-all"
        >
          <div className="text-2xl mb-2">{right.icon}</div>
          <h4 className="font-semibold text-[#261942] mb-1">{right.title}</h4>
          <p className="text-sm text-gray-600 mb-2">{right.description}</p>
          <div className="text-xs bg-[#F7F1FA] text-[#5E3FA5] px-2 py-1 rounded font-medium">
            {right.action}
          </div>
        </div>
      ))}
    </div>
  );
}

// Privacy Content Component
function PrivacyContentSection() {
  return (
    <div className="space-y-0">
      <PrivacySection
        id="1"
        title="Quiénes somos y cómo contactarnos"
        icon="🏢"
        defaultOpen={false}
      >
        <p>
          <strong>Responsable:</strong> EmpleoSafari, Inc. ("EmpleoSafari").
        </p>
        <p>
          <strong>Dirección registrada (sin atención presencial):</strong> 131
          Continental Dr, Suite 305, Newark, DE 19713, USA.
        </p>
        <p>
          <strong>Soporte:</strong>{" "}
          <Link
            href="mailto:soporte@empleosafari.com"
            className="text-[#5E3FA5] hover:underline font-medium"
          >
            soporte@empleosafari.com
          </Link>{" "}
          · WhatsApp: +57 300 123 4567
        </p>
        <p>
          <strong>Privacidad:</strong>{" "}
          <Link
            href="mailto:legal@empleosafari.com"
            className="text-[#5E3FA5] hover:underline font-medium"
          >
            legal@empleosafari.com
          </Link>{" "}
          (asunto "Privacidad").
        </p>
      </PrivacySection>

      <PrivacySection id="2" title="Alcance" icon="🌎">
        <p>
          Aplica a usuarios de{" "}
          <strong>Latinoamérica, incluido Puerto Rico</strong>, que usan nuestro
          sitio, panel y servicios asociados (la "Plataforma"). No hace
          referencia a marcos regulatorios de la Unión Europea.
        </p>
      </PrivacySection>

      <PrivacySection id="3" title="Datos que recopilamos" icon="📊">
        <h4 className="font-semibold text-[#261942] mt-4 mb-2">
          3.1. Datos que nos proporcionas
        </h4>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Cuenta:</strong> nombre, email, teléfono, contraseña (hash),
            país/ciudad.
          </li>
          <li>
            <strong>Compras:</strong> datos necesarios para pagos y
            comprobantes.{" "}
            <em>No almacenamos la información completa de tu tarjeta</em>.
          </li>
          <li>
            <strong>Soporte:</strong> mensajes, adjuntos, ID de pedido, notas de
            atención.
          </li>
          <li>
            <strong>Contenido:</strong> vacantes, descripciones, reseñas,
            comentarios.
          </li>
        </ul>

        <h4 className="font-semibold text-[#261942] mt-4 mb-2">
          3.2. Datos que se generan automáticamente
        </h4>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Sesión:</strong> identificadores de sesión/autenticación
            (por ejemplo, <strong>JWT</strong> en cookie), fecha/hora de acceso.
          </li>
          <li>
            <strong>Uso y dispositivo:</strong> páginas vistas, acciones en el
            panel, navegador, sistema operativo, IP aproximada, idioma.
          </li>
          <li>
            <strong>Registros técnicos:</strong> eventos de error, latencia,
            verificaciones antifraude.
          </li>
        </ul>

        <h4 className="font-semibold text-[#261942] mt-4 mb-2">
          3.3. Datos de terceros / fuentes públicas
        </h4>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Pagos (dLocalGo):</strong> confirmaciones, tokens, últimos 4
            dígitos, estado de transacción, señales antifraude. El uso de
            cookies propias puede variar por país y método.
          </li>
          <li>
            <strong>Publicidad:</strong> eventos de <strong>Meta</strong>{" "}
            (Pixel) y <strong>Google Ads</strong>
            (etiquetas/gtag) para medición y anuncios.
          </li>
          <li>
            <strong>Analítica:</strong> métricas agregadas de{" "}
            <strong>Clicky</strong>.
          </li>
          <li>
            <strong>Infraestructura:</strong> registros de red/seguridad de{" "}
            <strong>Cloudflare</strong>
            (CDN y cortafuegos).
          </li>
        </ul>

        <h4 className="font-semibold text-[#261942] mt-4 mb-2">
          3.4. Datos sensibles
        </h4>
        <p>
          No solicitamos datos sensibles (salud, origen étnico, biométricos,
          etc.). Si nos los envías por error, los eliminaremos cuando sea
          razonable.
        </p>
      </PrivacySection>

      <PrivacySection id="4" title="Para qué usamos tus datos" icon="🎯">
        <ul className="list-disc list-inside space-y-2">
          <li>
            <strong>Operar la Plataforma:</strong> crear/gestionar tu cuenta,
            iniciar sesión con <strong>JWT</strong>, habilitar funciones.
          </li>
          <li>
            <strong>Pagos y comprobantes:</strong> procesar pagos en{" "}
            <strong>moneda local</strong> a través de <em>dLocalGo</em>, emitir
            recibos/facturas.
          </li>
          <li>
            <strong>Prevención de fraude:</strong> validaciones técnicas y
            revisiones humanas.
          </li>
          <li>
            <strong>Soporte:</strong> responder por email/WhatsApp y gestionar
            tickets.
          </li>
          <li>
            <strong>Analítica:</strong> medir uso con <strong>Clicky</strong>{" "}
            para mejorar rendimiento y contenidos.
          </li>
          <li>
            <strong>Publicidad:</strong> medir y optimizar campañas con{" "}
            <strong>Meta</strong> y <strong>Google Ads</strong>. Puedes limitar
            anuncios personalizados (ver §6.4).
          </li>
          <li>
            <strong>Cumplimiento legal:</strong> atender requerimientos de
            autoridades y obligaciones fiscales/contables.
          </li>
        </ul>
      </PrivacySection>

      <PrivacySection id="5" title="Fundamentos del tratamiento" icon="⚖️">
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Tu consentimiento</strong> (por ejemplo, comunicaciones
            promocionales o publicidad personalizada donde aplique).
          </li>
          <li>
            <strong>Ejecución de contrato</strong> (crear tu cuenta, procesar
            pagos, entregar accesos).
          </li>
          <li>
            <strong>Obligación legal</strong> (requisitos fiscales/contables).
          </li>
          <li>
            <strong>Interés legítimo</strong> (seguridad, prevención de fraude y
            mejora del servicio).
          </li>
        </ul>
      </PrivacySection>

      <PrivacySection id="6" title="Cookies y tecnologías similares" icon="🍪">
        <p className="mb-4">
          Usamos cookies y tecnologías similares para que el sitio funcione,
          para analítica y para publicidad. Puedes controlar o borrar cookies
          desde tu navegador. Si bloqueas algunas, ciertas funciones podrían
          verse afectadas.
        </p>

        <CookiesTable />

        <h4 className="font-semibold text-[#261942] mt-4 mb-2">
          6.1. Control desde tu navegador
        </h4>
        <p>
          Puedes borrar o bloquear cookies en la configuración de tu navegador.
          También puedes usar la navegación privada si lo prefieres.
        </p>

        <h4 className="font-semibold text-[#261942] mt-4 mb-2">
          6.2. Analítica (Clicky)
        </h4>
        <p>
          Usamos <strong>Clicky</strong> para métricas agregadas de uso del
          sitio.
        </p>

        <h4 className="font-semibold text-[#261942] mt-4 mb-2">
          6.3. Publicidad (Meta y Google Ads)
        </h4>
        <p>
          Usamos <strong>Meta Pixel</strong> y <strong>Google Ads</strong> para
          medir resultados de campañas y, en algunos casos, mostrar anuncios más
          relevantes.
        </p>

        <h4 className="font-semibold text-[#261942] mt-4 mb-2">
          6.4. Cómo limitar anuncios personalizados
        </h4>
        <ul className="list-disc list-inside space-y-1">
          <li>
            Ajusta tus preferencias en tu cuenta de <strong>Google</strong>{" "}
            (Configuración de anuncios).
          </li>
          <li>
            Ajusta tus preferencias en tu cuenta de <strong>Meta</strong>{" "}
            (Preferencias de anuncios).
          </li>
          <li>
            También puedes usar herramientas del navegador para limitar
            seguimiento entre sitios.
          </li>
        </ul>
      </PrivacySection>

      <PrivacySection id="7" title="Con quién compartimos datos" icon="🤝">
        <ul className="list-disc list-inside space-y-2">
          <li>
            <strong>dLocal Go (pagos):</strong> procesan pagos y previenen
            fraude. EmpleoSafari{" "}
            <strong>no almacena la información completa de tu tarjeta</strong>;
            recibimos metadatos (token, últimos 4 dígitos, resultado).
          </li>
          <li>
            <strong>Cloudflare (CDN/seguridad):</strong> entrega de contenido,
            protección contra ataques y registro técnico.
          </li>
          <li>
            <strong>Clicky (analítica):</strong> medición agregada de uso.
          </li>
          <li>
            <strong>Meta y Google Ads (marketing):</strong> medición y
            optimización de campañas publicitarias.
          </li>
          <li>
            <strong>Proveedores de correo/soporte/cloud:</strong> envío de
            emails, hosting y gestión de tickets.
          </li>
          <li>
            <strong>Autoridades:</strong> cuando la ley lo exige o para proteger
            derechos y seguridad.
          </li>
        </ul>
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="font-semibold text-green-800">
            🚫 <strong>No vendemos</strong> tus datos personales.
          </p>
        </div>
      </PrivacySection>

      <PrivacySection id="8" title="Transferencias y ubicación" icon="🌐">
        <p>
          Usamos la red global de <strong>Cloudflare</strong> para distribución
          y seguridad. Nuestra{" "}
          <strong>
            base de datos está alojada en Estados Unidos (Costa Oeste)
          </strong>
          . Algunos proveedores (p. ej., dLocalGo, Meta, Google) pueden procesar
          datos en distintos países según su infraestructura.
        </p>
        <p>
          Adoptamos medidas razonables de seguridad y compromisos contractuales
          con los proveedores para proteger tus datos.
        </p>
      </PrivacySection>

      <PrivacySection id="9" title="Conservación" icon="📅">
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Cuenta:</strong> mientras esté activa y por un periodo
            razonable después del cierre.
          </li>
          <li>
            <strong>Transacciones:</strong> según plazos fiscales/contables
            aplicables (suele ser 5–10 años, según país/territorio).
          </li>
          <li>
            <strong>Soporte:</strong> normalmente hasta 24 meses desde el último
            contacto.
          </li>
          <li>
            <strong>Analítica:</strong> métricas agregadas/anonimizadas cuando
            sea posible.
          </li>
          <li>
            <strong>Marketing:</strong> hasta que te des de baja o revoques tu
            consentimiento.
          </li>
        </ul>
      </PrivacySection>

      <PrivacySection id="10" title="Tus derechos" icon="⭐">
        <p className="mb-4">
          Según tu país/territorio en LatAm (incluido Puerto Rico), puedes
          ejercer derechos como acceso, rectificación, eliminación,
          oposición/limitación, portabilidad y revocación de consentimiento.
        </p>

        <DataRightsSection />

        <p className="mt-4">
          Para ejercerlos, escríbenos a{" "}
          <Link
            href="mailto:legal@empleosafari.com"
            className="text-[#5E3FA5] hover:underline font-medium"
          >
            legal@empleosafari.com
          </Link>{" "}
          o{" "}
          <Link
            href="mailto:soporte@empleosafari.com"
            className="text-[#5E3FA5] hover:underline font-medium"
          >
            soporte@empleosafari.com
          </Link>
          . Intentamos responder en plazos razonables (habitualmente 10–30 días
          hábiles, según normativa local).
        </p>
        <p>
          Si consideras que tus derechos no fueron atendidos, puedes acudir a la
          autoridad local de protección de datos.
        </p>
      </PrivacySection>

      <PrivacySection id="11" title="Seguridad" icon="🔐">
        <p>
          Aplicamos medidas administrativas, técnicas y físicas (cifrado en
          tránsito, controles de acceso, registros y revisiones). Nuestros{" "}
          <strong>JWT</strong> están firmados y las cookies de sesión se
          configuran con atributos seguros cuando es posible. Ningún sistema es
          100% infalible; si detectas una vulnerabilidad, avísanos de inmediato.
        </p>
      </PrivacySection>

      <PrivacySection id="12" title="Menores de edad" icon="👶">
        <p>
          La Plataforma no está dirigida a menores de 18 años. Si eres menor de
          edad, usa la Plataforma solo con autorización de tus padres o
          responsables. Eliminaremos datos de menores si los detectamos sin
          autorización.
        </p>
      </PrivacySection>

      <PrivacySection id="13" title="Enlaces de terceros" icon="🔗">
        <p>
          Podemos enlazar a sitios o servicios de terceros (por ejemplo,
          campañas publicitarias). No somos responsables por sus prácticas;
          revisa sus políticas antes de proporcionarles datos.
        </p>
      </PrivacySection>

      <PrivacySection id="14" title="Cambios a esta Política" icon="📝">
        <p>
          Podemos actualizar esta Política para reflejar cambios legales o del
          servicio. Publicaremos la versión vigente con fecha de actualización.
          El uso continuo implica aceptación.
        </p>
      </PrivacySection>

      <PrivacySection id="15" title="Contacto de privacidad" icon="📞">
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Email (privacidad):</strong>{" "}
            <Link
              href="mailto:legal@empleosafari.com"
              className="text-[#5E3FA5] hover:underline font-medium"
            >
              legal@empleosafari.com
            </Link>
          </li>
          <li>
            <strong>Soporte general:</strong>{" "}
            <Link
              href="mailto:soporte@empleosafari.com"
              className="text-[#5E3FA5] hover:underline font-medium"
            >
              soporte@empleosafari.com
            </Link>{" "}
            · WhatsApp: +57 300 123 4567
          </li>
          <li>
            <strong>Dirección registrada (sin atención presencial):</strong> 131
            Continental Dr, Suite 305, Newark, DE 19713, USA
          </li>
        </ul>
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="font-semibold text-blue-800">
            🛡️ No vendemos tus datos personales.
          </p>
        </div>
      </PrivacySection>
    </div>
  );
}

/* ---------- Main page ---------- */
export default function PrivacyPage() {
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
          <QuickNavigationSection />
          <PrivacyContentSection />
        </div>
      </div>
    </div>
  );
}
