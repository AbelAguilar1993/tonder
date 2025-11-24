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
          Política de Pagos y{" "}
          <span className="bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
            Reembolsos
          </span>
        </h1>

        <p className="my-4 text-sm text-gray-600">
          Última actualización:{" "}
          <span className="font-semibold">27 de septiembre de 2025</span>
        </p>

        <p className="text-lg text-gray-700 max-w-2xl mx-auto mb-4">
          Aplica a compras en{" "}
          <strong>Latinoamérica, incluido Puerto Rico</strong>. Pagos en{" "}
          <strong>moneda local</strong> cuando sea posible, vía{" "}
          <strong>dLocalGo</strong>. La entrega de productos/servicios digitales
          es normalmente <strong>inmediata</strong> tras confirmar el pago.
        </p>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl max-w-2xl mx-auto">
          <p className="text-sm text-amber-800">
            <strong>Regla general:</strong> al tratarse de{" "}
            <em>contenido/servicio digital con entrega inmediata</em>, las
            compras <strong>no son reembolsables</strong> (dinero).
            <br />
            <strong>Excepciones monetarias:</strong> falta de acceso o cobro
            erróneo. Además, otorgamos{" "}
            <strong>créditos de reemplazo 1:1</strong> si el email del contacto{" "}
            <em>rebota (hard bounce)</em> o la persona ya no trabaja allí.
          </p>
        </div>
      </div>
    </header>
  );
}

// Quick Summary Component
function QuickSummarySection() {
  const summaryItems = [
    {
      icon: "💱",
      title: "Moneda local",
      description: "cobramos en tu moneda cuando sea posible; si no, en USD.",
      color: "bg-blue-50 border-blue-200",
    },
    {
      icon: "⚡",
      title: "Entrega",
      description:
        "acceso inmediato tras el pago (si se demora, espera 10–15 min y contáctanos).",
      color: "bg-green-50 border-green-200",
    },
    {
      icon: "⛔",
      title: "No reembolsable por regla general",
      description:
        "(digital, entrega inmediata). Excepciones monetarias: sin acceso o cobro erróneo.",
      color: "bg-red-50 border-red-200",
    },
    {
      icon: "✅",
      title: "Crédito 1:1",
      description:
        "si el email rebota (hard bounce) o la persona ya no trabaja. No aplica si simplemente no responde o hay rebote temporal/OOO.",
      color: "bg-emerald-50 border-emerald-200",
    },
    {
      icon: "🧾",
      title: "Impuestos/cargos",
      description:
        "IVA/IGV/ITBIS/IVU (PR) y cargos de medios locales o banco pueden aplicar; se muestran en checkout cuando corresponda.",
      color: "bg-amber-50 border-amber-200",
    },
    {
      icon: "🔐",
      title: "Seguridad",
      description:
        "pagos por dLocalGo; no guardamos la info completa de tu tarjeta. CDN Cloudflare; BD en EE. UU. (Costa Oeste).",
      color: "bg-purple-50 border-purple-200",
    },
  ];

  return (
    <section className="relative rounded-xl border border-[#C7BCE0] bg-gradient-to-b from-[#F7F1FA] to-white shadow-lg mb-4 p-4">
      <h2 className="text-xl font-black mb-4 bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent text-center">
        ⚡ Resumen rápido
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        {summaryItems.map((item, index) => (
          <div key={index} className={`p-3 rounded-xl border ${item.color}`}>
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5 shrink-0">{item.icon}</span>
              <div>
                <div className="font-semibold text-gray-800 text-sm mb-1">
                  {item.title}
                </div>
                <div className="text-xs text-gray-600">{item.description}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Payment Methods Table Component
function PaymentMethodsTable() {
  const paymentMethods = [
    {
      category: "Tarjetas",
      examples: "Visa, MasterCard, American Express",
      notes: "Puede requerir 3‑D Secure o validaciones.",
      color: "bg-blue-50",
    },
    {
      category: "Transferencias",
      examples: "SPEI (MX), PSE (CO), PIX (BR)",
      notes:
        "Acreditación usualmente rápida; puede demorar por validación bancaria.",
      color: "bg-green-50",
    },
    {
      category: "Billeteras",
      examples: "Nequi (CO), Yape/Plin (PE)",
      notes: "Según país y disponibilidad.",
      color: "bg-purple-50",
    },
    {
      category: "Efectivo / Vales",
      examples: "OXXO (MX), Rapipago/Pago Fácil (AR), Efecty (CO)",
      notes:
        "La acreditación puede tardar; las referencias tienen vencimiento.",
      color: "bg-amber-50",
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-[#F7F1FA]">
            <th className="border border-[#C7BCE0] px-3 py-2 text-left text-sm font-semibold text-[#261942]">
              Categoría
            </th>
            <th className="border border-[#C7BCE0] px-3 py-2 text-left text-sm font-semibold text-[#261942]">
              Ejemplos (no exhaustivos)
            </th>
            <th className="border border-[#C7BCE0] px-3 py-2 text-left text-sm font-semibold text-[#261942]">
              Notas
            </th>
          </tr>
        </thead>
        <tbody>
          {paymentMethods.map((method, index) => (
            <tr key={index} className={method.color}>
              <td className="border border-[#C7BCE0] px-3 py-2 text-sm font-medium">
                {method.category}
              </td>
              <td className="border border-[#C7BCE0] px-3 py-2 text-sm">
                {method.examples}
              </td>
              <td className="border border-[#C7BCE0] px-3 py-2 text-sm">
                {method.notes}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-500 mt-2">
        Los proveedores pueden actualizar o pausar métodos sin aviso.
      </p>
    </div>
  );
}

// Refund Matrix Component
function RefundMatrixSection() {
  const refundCases = [
    {
      situation: "No recibiste el acceso / entrega digital",
      timeframe: "Dentro de 48 horas desde el pago",
      requirement: "ID de pedido y correo de la cuenta",
      resolution: "Entrega manual o reembolso",
      type: "monetary",
      icon: "💰",
    },
    {
      situation: "Error de cobro (cargo duplicado, monto incorrecto)",
      timeframe: "Dentro de 7 días",
      requirement: "Comprobantes y detalle del cargo",
      resolution: "Ajuste o reembolso del exceso",
      type: "monetary",
      icon: "💰",
    },
  ];

  const creditCases = [
    {
      situation: "Email rebota (hard bounce)",
      timeframe: "Dentro de 48 horas desde tu primer intento de contacto",
      requirement:
        'Mensaje de rebote del servidor (p. ej., 550 5.1.1, "user unknown", "mailbox disabled")',
      resolution:
        "Crédito de reemplazo 1:1 para elegir otro contacto equivalente",
      type: "credit",
      icon: "🔄",
    },
    {
      situation: "La persona ya no trabaja en la empresa",
      timeframe: "Dentro de 48 horas desde tu primer intento",
      requirement:
        'Auto‑respuesta "no longer employed" / "ya no labora" o rebote de cuenta deshabilitada',
      resolution: "Crédito de reemplazo 1:1 para otro contacto equivalente",
      type: "credit",
      icon: "🔄",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Monetary Exceptions */}
      <div>
        <h3 className="text-lg font-bold text-[#261942] mb-3 flex items-center gap-2">
          💰 Excepciones monetarias (reembolso en dinero)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-green-50">
                <th className="border border-green-200 px-3 py-2 text-left text-sm font-semibold text-green-800">
                  Situación
                </th>
                <th className="border border-green-200 px-3 py-2 text-left text-sm font-semibold text-green-800">
                  Plazo para solicitar
                </th>
                <th className="border border-green-200 px-3 py-2 text-left text-sm font-semibold text-green-800">
                  Qué solicitamos
                </th>
                <th className="border border-green-200 px-3 py-2 text-left text-sm font-semibold text-green-800">
                  Resolución típica
                </th>
              </tr>
            </thead>
            <tbody>
              {refundCases.map((case_, index) => (
                <tr key={index} className="bg-green-25">
                  <td className="border border-green-200 px-3 py-2 text-sm">
                    <strong>{case_.situation}</strong>
                  </td>
                  <td className="border border-green-200 px-3 py-2 text-sm">
                    <strong>{case_.timeframe}</strong>
                  </td>
                  <td className="border border-green-200 px-3 py-2 text-sm">
                    {case_.requirement}
                  </td>
                  <td className="border border-green-200 px-3 py-2 text-sm">
                    <strong>{case_.resolution}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Credit Replacements */}
      <div>
        <h3 className="text-lg font-bold text-[#261942] mb-3 flex items-center gap-2">
          🔄 Créditos de reemplazo (no dinero)
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          Otorgamos <strong>crédito 1:1</strong> en tu cuenta (no convertible a
          efectivo) cuando:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-blue-50">
                <th className="border border-blue-200 px-3 py-2 text-left text-sm font-semibold text-blue-800">
                  Situación
                </th>
                <th className="border border-blue-200 px-3 py-2 text-left text-sm font-semibold text-blue-800">
                  Plazo para solicitar
                </th>
                <th className="border border-blue-200 px-3 py-2 text-left text-sm font-semibold text-blue-800">
                  Evidencia aceptada
                </th>
                <th className="border border-blue-200 px-3 py-2 text-left text-sm font-semibold text-blue-800">
                  Resolución
                </th>
              </tr>
            </thead>
            <tbody>
              {creditCases.map((case_, index) => (
                <tr key={index} className="bg-blue-25">
                  <td className="border border-blue-200 px-3 py-2 text-sm">
                    <strong>{case_.situation}</strong>
                  </td>
                  <td className="border border-blue-200 px-3 py-2 text-sm">
                    <strong>{case_.timeframe}</strong>
                  </td>
                  <td className="border border-blue-200 px-3 py-2 text-sm">
                    {case_.requirement}
                  </td>
                  <td className="border border-blue-200 px-3 py-2 text-sm">
                    <strong>{case_.resolution}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* What doesn't qualify */}
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
        <h4 className="font-semibold text-red-800 mb-2">
          ❌ No dan derecho a crédito o reembolso:
        </h4>
        <ul className="text-sm text-red-700 space-y-1">
          <li>
            • <em>No respuesta</em> del contacto
          </li>
          <li>• Respuestas "fuera de oficina" (OOO)</li>
          <li>
            • Rebotes <em>temporales</em> (p. ej., buzón lleno, "try again
            later")
          </li>
          <li>• Cuando el servicio ya se haya consumido de forma sustancial</li>
        </ul>
      </div>
    </div>
  );
}

// Bounce Types Explanation Component
function BounceTypesSection() {
  const bounceTypes = [
    {
      type: "Hard bounce",
      description: "falla permanente (cuenta inexistente/deshabilitada)",
      result: "Aplica crédito 1:1",
      color: "bg-green-50 border-green-200 text-green-800",
      icon: "✅",
    },
    {
      type: "Soft bounce",
      description: "falla temporal (buzón lleno, servidor ocupado)",
      result: "No aplica crédito ni reembolso",
      color: "bg-red-50 border-red-200 text-red-800",
      icon: "❌",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {bounceTypes.map((bounce, index) => (
        <div key={index} className={`p-4 rounded-xl border ${bounce.color}`}>
          <div className="flex items-start gap-3">
            <span className="text-lg mt-0.5">{bounce.icon}</span>
            <div>
              <div className="font-semibold mb-1">{bounce.type}:</div>
              <div className="text-sm mb-2">{bounce.description}</div>
              <div className="text-xs font-medium italic">{bounce.result}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Regional Payment Methods Component
function RegionalPaymentsSection() {
  const countries = [
    { country: "México", methods: "Tarjetas · SPEI · OXXO", flag: "🇲🇽" },
    {
      country: "Colombia",
      methods: "Tarjetas · PSE · Nequi · Efecty",
      flag: "🇨🇴",
    },
    { country: "Brasil", methods: "Tarjetas · PIX · Boleto", flag: "🇧🇷" },
    {
      country: "Argentina",
      methods: "Tarjetas · Rapipago · Pago Fácil",
      flag: "🇦🇷",
    },
    { country: "Perú", methods: "Tarjetas · Yape · Plin", flag: "🇵🇪" },
    {
      country: "Chile",
      methods: "Tarjetas · Transferencias locales",
      flag: "🇨🇱",
    },
    {
      country: "Puerto Rico",
      methods: "Tarjetas (emitidas localmente o internacionales)",
      flag: "🇵🇷",
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-[#F7F1FA]">
            <th className="border border-[#C7BCE0] px-3 py-2 text-left text-sm font-semibold text-[#261942]">
              País
            </th>
            <th className="border border-[#C7BCE0] px-3 py-2 text-left text-sm font-semibold text-[#261942]">
              Métodos disponibles
            </th>
          </tr>
        </thead>
        <tbody>
          {countries.map((country, index) => (
            <tr
              key={index}
              className={index % 2 === 0 ? "bg-white" : "bg-gray-25"}
            >
              <td className="border border-[#C7BCE0] px-3 py-2 text-sm font-medium">
                <span className="mr-2">{country.flag}</span>
                {country.country}
              </td>
              <td className="border border-[#C7BCE0] px-3 py-2 text-sm">
                {country.methods}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Payment Section Component
function PaymentSection({ id, title, icon, children, defaultOpen = false }) {
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

// Payment Content Component
function PaymentContentSection() {
  return (
    <div className="space-y-0">
      <PaymentSection id="1" title="Ámbito" icon="🌎" defaultOpen={false}>
        <p>
          Complementa{" "}
          <Link
            href="/terminos"
            className="text-[#5E3FA5] hover:underline font-medium"
          >
            Términos y Condiciones
          </Link>{" "}
          y{" "}
          <Link
            href="/privacidad"
            className="text-[#5E3FA5] hover:underline font-medium"
          >
            Privacidad
          </Link>
          . Si alguna norma local irrenunciable aplica en tu país/territorio, la
          respetaremos en lo pertinente.
        </p>
      </PaymentSection>

      <PaymentSection id="2" title="Medios de pago disponibles" icon="💳">
        <p className="mb-4">
          Habilitados vía <strong>dLocalGo</strong>. La disponibilidad varía por
          país/método/monto. Ejemplos:
        </p>
        <PaymentMethodsTable />
      </PaymentSection>

      <PaymentSection id="3" title="Moneda y precios" icon="💱">
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Moneda local:</strong> mostramos y cobramos en la moneda
            local cuando sea posible.
          </li>
          <li>
            <strong>Si no hay método local:</strong> el cobro puede realizarse
            en USD (tu banco podría convertir y cobrar cargos).
          </li>
          <li>
            <strong>Tipos de cambio/redondeos:</strong> el cargo final puede
            variar por el tipo de cambio del banco/red.
          </li>
          <li>
            <strong>Precios dinámicos:</strong> pueden variar por país. Cambios
            futuros no afectan compras ya realizadas.
          </li>
        </ul>
      </PaymentSection>

      <PaymentSection id="4" title="Impuestos y cargos" icon="🧾">
        <ul className="list-disc list-inside space-y-1">
          <li>
            Puede incluir IVA, IGV, ITBIS, <strong>IVU (Puerto Rico)</strong>,
            etc.
          </li>
          <li>Pueden aplicar comisiones de medios locales o del banco.</li>
          <li>Mostramos importes aplicables antes de confirmar el pago.</li>
        </ul>
      </PaymentSection>

      <PaymentSection id="5" title="Proceso de compra y entrega" icon="⚡">
        <ol className="list-decimal list-inside space-y-1">
          <li>Seleccionas plan/paquete y país/ciudad/rol (si aplica).</li>
          <li>Pagas con el método disponible (dLocalGo).</li>
          <li>
            Confirmado el pago, activamos el acceso en tu panel y/o enviamos
            confirmación por email.
          </li>
        </ol>
        <p className="mt-3">
          La entrega suele ser <strong>inmediata</strong>. Puede demorar por
          validaciones antifraude o alta demanda.
        </p>
      </PaymentSection>

      <PaymentSection
        id="6"
        title="Reembolsos y créditos de reemplazo"
        icon="🔄"
      >
        <p className="mb-4">
          <strong>Regla general (no reembolsable en dinero):</strong> al
          tratarse de <em>contenido/servicio digital con entrega inmediata</em>,
          las compras <strong>no son reembolsables</strong>.
        </p>

        <RefundMatrixSection />

        <div className="mt-6">
          <h4 className="font-semibold text-[#261942] mb-3">
            Definiciones rápidas
          </h4>
          <BounceTypesSection />
        </div>

        <div className="mt-6">
          <h4 className="font-semibold text-[#261942] mb-3">
            Cómo solicitar el crédito
          </h4>
          <ol className="list-decimal list-inside space-y-2">
            <li>
              Abre un ticket en{" "}
              <Link
                href="/support"
                className="text-[#5E3FA5] hover:underline font-medium"
              >
                Soporte
              </Link>{" "}
              con tu <strong>ID de pedido</strong> y el{" "}
              <strong>correo que falló</strong>.
            </li>
            <li>
              Adjunta <strong>captura o texto del rebote</strong> o de la
              auto‑respuesta "ya no labora".
            </li>
            <li>
              Verificamos (podemos reintentar con nuestro sistema); si procede,{" "}
              <strong>acreditamos 1:1</strong> en{" "}
              <strong>&lt; 1 día hábil</strong>.
            </li>
          </ol>
          <p className="text-xs text-gray-500 mt-3">
            El crédito se aplica al mismo plan/valor (rol/ciudad equivalentes),
            no es transferible ni convertible a efectivo y tiene{" "}
            <strong>vigencia de 12 meses</strong>.
          </p>
        </div>
      </PaymentSection>

      <PaymentSection
        id="7"
        title="Contracargos (disputas bancarias)"
        icon="⚠️"
      >
        <ul className="list-disc list-inside space-y-1">
          <li>
            Si ves un cobro no reconocido, <strong>contáctanos primero</strong>{" "}
            para resolver más rápido.
          </li>
          <li>
            Si inicias un contracargo sin aviso y el caso se resuelve a nuestro
            favor, podremos suspender tu cuenta y bloquear futuras compras.
          </li>
          <li>
            Conservamos evidencia de transacciones y accesos para la
            investigación.
          </li>
        </ul>
      </PaymentSection>

      <PaymentSection id="8" title="Prevención de fraude" icon="🛡️">
        <ul className="list-disc list-inside space-y-1">
          <li>
            Para pagos de riesgo, podemos solicitar verificación de identidad o
            del método de pago.
          </li>
          <li>
            Podemos rechazar, pausar o revertir transacciones cuando detectemos
            señales de fraude o abuso.
          </li>
        </ul>
      </PaymentSection>

      <PaymentSection id="9" title="Facturación y comprobantes" icon="📄">
        <ul className="list-disc list-inside space-y-1">
          <li>
            Emitimos recibos y, cuando corresponda, facturas/comprobantes con
            datos fiscales.
          </li>
          <li>
            Para facturar, envíanos tus datos (nombre/razón social, documento
            fiscal, dirección, país) en checkout o vía{" "}
            <Link
              href="/contacto"
              className="text-[#5E3FA5] hover:underline font-medium"
            >
              Contacto
            </Link>
            /
            <Link
              href="/support"
              className="text-[#5E3FA5] hover:underline font-medium"
            >
              Soporte
            </Link>
            .
          </li>
        </ul>
      </PaymentSection>

      <PaymentSection id="10" title="Fallos de pago frecuentes" icon="🚨">
        <ul className="list-disc list-inside space-y-1">
          <li>Fondos insuficientes o tarjeta vencida.</li>
          <li>
            Bloqueo por el banco emisor (sospecha internacional) — suele
            resolverse llamando al banco.
          </li>
          <li>Datos incompletos o verificación 3‑D Secure no completada.</li>
          <li>
            <strong>Referencias de efectivo vencidas</strong> (OXXO/Efecty): al
            vencer, el pedido se cancela; genera una nueva referencia.
          </li>
        </ul>
        <p className="mt-3">
          ¿Problemas persistentes? Escríbenos por WhatsApp o email; te ayudamos
          con un método alternativo.
        </p>
      </PaymentSection>

      <PaymentSection id="11" title="Seguridad de pagos" icon="🔐">
        <ul className="list-disc list-inside space-y-1">
          <li>
            Pagos a través de <strong>dLocalGo</strong> y bancos aliados.{" "}
            <strong>No almacenamos</strong> la información completa de tu
            tarjeta.
          </li>
          <li>
            Usamos <strong>Cloudflare</strong> para distribución y protección.
            Base de datos en <strong>Estados Unidos (Costa Oeste)</strong>.
          </li>
        </ul>
        <p className="mt-3">
          Para más detalles sobre datos y cookies (incluidas posibles cookies
          técnicas de dLocalGo), consulta nuestra{" "}
          <Link
            href="/privacidad"
            className="text-[#5E3FA5] hover:underline font-medium"
          >
            Política de Privacidad
          </Link>
          .
        </p>
      </PaymentSection>

      <PaymentSection id="12" title="Cambios a esta Política" icon="📝">
        <p>
          Podemos actualizarla por cambios legales, de métodos de pago o
          procesos. Publicaremos la versión vigente con fecha de actualización.
          El uso continuo implica aceptación.
        </p>
      </PaymentSection>

      <PaymentSection
        id="13"
        title="Anexo — Ejemplos de medios locales (orientativo)"
        icon="🗺️"
      >
        <p className="mb-4 text-xs text-gray-500">
          La disponibilidad exacta depende de dLocalGo y puede cambiar.
        </p>
        <RegionalPaymentsSection />
      </PaymentSection>
    </div>
  );
}

/* ---------- Main page ---------- */
export default function PaymentsPage() {
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
          <QuickSummarySection />
          <PaymentContentSection />
        </div>
      </div>
    </div>
  );
}
