/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState } from "react";
import Link from "next/link";
import { services } from "../../services";
import { useToast } from "../../components/ui/Toast";

// Contact and Tickets Section
function ContactSection() {
  const { showSuccess, showError, ToastComponent } = useToast("top-center");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    topic: "",
    message: "",
    orderId: "",
    whatsapp: "",
    consent: false,
    website: "", // honeypot
    file: null, // file attachment
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? checked : type === "file" ? files[0] : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Honeypot check
    if (formData.website) {
      return; // Bot detected
    }

    setIsSubmitting(true);

    try {
      // Submit the support ticket via API
      await services.support.submitSupportTicket(formData);

      // Show success toast
      showSuccess(
        "¡Ticket enviado correctamente! Te responderemos en menos de 24h (días hábiles).",
      );

      // Reset form after successful submission
      setFormData({
        name: "",
        email: "",
        topic: "",
        message: "",
        orderId: "",
        whatsapp: "",
        consent: false,
        website: "",
        file: null,
      });
    } catch (error) {
      console.error("Error submitting form:", error);
      // Show error toast
      showError(
        error?.response?.data?.error ||
          "Error al enviar el ticket. Por favor, intenta nuevamente o contáctanos directamente a soporte@empleosafari.com",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {ToastComponent}
      <section className="relative rounded-2xl border border-[#C7BCE0] bg-gradient-to-b from-[#F7F1FA] to-white shadow-lg mb-4 p-4 md:p-6">
        <h2 className="text-xl md:text-2xl font-black mb-4 bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
          Soporte y tickets
        </h2>

        {/* Direct contact channels */}
        <div className="mb-6">
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-b from-[#B276CA] to-[#5E3FA5] text-white grid place-items-center text-base shadow">
                📧
              </div>
              <div>
                <div className="font-semibold text-[#261942]">Email:</div>
                <a
                  href="mailto:soporte@empleosafari.com"
                  className="text-[#5E3FA5] hover:underline"
                >
                  soporte@empleosafari.com
                </a>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Horario: Lunes–Viernes, 9:00–16:00 (hora local). Respuesta habitual:
            &lt; 24-48 h.
          </p>
          <div className="mt-3 p-3 rounded-xl bg-white border border-[#C7BCE0] text-sm text-gray-700">
            ¿Tema de pagos/reembolsos? Revisa primero{" "}
            <Link href="/pagos" className="text-[#5E3FA5] hover:underline">
              /pagos/
            </Link>
            . Privacidad:{" "}
            <Link href="/privacidad" className="text-[#5E3FA5] hover:underline">
              /privacidad/
            </Link>
            . Términos:{" "}
            <Link href="/terminos" className="text-[#5E3FA5] hover:underline">
              /terminos/
            </Link>
            .
          </div>
        </div>

        <hr className="border-[#C7BCE0] mb-6" />

        {/* Contact form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-[#261942] mb-2"
              >
                Nombre completo
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-[#C7BCE0] rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#B276CA] focus:border-transparent transition-colors text-gray-700 placeholder:text-gray-300"
                required
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-[#261942] mb-2"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-[#C7BCE0] rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#B276CA] focus:border-transparent transition-colors text-gray-700 placeholder:text-gray-300"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="topic"
              className="block text-sm font-semibold text-[#261942] mb-2"
            >
              Motivo
            </label>
            <select
              id="topic"
              name="topic"
              value={formData.topic}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-[#C7BCE0] rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#B276CA] focus:border-transparent text-gray-700 placeholder:text-gray-300"
              required
            >
              <option value="">Selecciona</option>
              <option value="no_access">No tengo acceso / no se activó</option>
              <option value="wrong_charge">
                Cobro erróneo (duplicado / monto)
              </option>
              <option value="credit_bounce">
                Crédito 1:1 (rebote permanente / ya no labora)
              </option>
              <option value="invoice">Facturación / Comprobante</option>
              <option value="privacy">Datos / Privacidad</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="message"
              className="block text-sm font-semibold text-[#261942] mb-2"
            >
              Mensaje
            </label>
            <textarea
              id="message"
              name="message"
              rows={4}
              value={formData.message}
              onChange={handleInputChange}
              placeholder="Cuéntanos en 3–5 líneas qué ocurre. Si aplica, incluye ciudad/rol."
              className="w-full px-3 py-2 border border-[#C7BCE0] rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#B276CA] focus:border-transparent resize-vertical text-gray-700 placeholder:text-gray-300"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="orderId"
                className="block text-sm font-semibold text-[#261942] mb-2"
              >
                ID de pedido (opcional)
              </label>
              <input
                id="orderId"
                name="orderId"
                type="text"
                value={formData.orderId}
                onChange={handleInputChange}
                placeholder="Ej: ORD‑12345"
                className="w-full px-3 py-2 border border-[#C7BCE0] rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#B276CA] focus:border-transparent transition-colors text-gray-700 placeholder:text-gray-300"
              />
            </div>
            <div>
              <label
                htmlFor="whatsapp"
                className="block text-sm font-semibold text-[#261942] mb-2"
              >
                WhatsApp (opcional)
              </label>
              <input
                id="whatsapp"
                name="whatsapp"
                type="text"
                value={formData.whatsapp}
                onChange={handleInputChange}
                placeholder="+57 300 000 0000"
                className="w-full px-3 py-2 border border-[#C7BCE0] rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#B276CA] focus:border-transparent transition-colors text-gray-700 placeholder:text-gray-300"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="file"
              className="block text-sm font-semibold text-[#261942] mb-2"
            >
              Adjuntar archivo (opcional)
            </label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.eml,.msg,.txt"
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-[#C7BCE0] rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#B276CA] focus:border-transparent transition-colors file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-[#F7F1FA] file:text-[#5E3FA5] file:text-sm file:font-medium hover:file:bg-[#E6E0F2] text-gray-700 placeholder:text-gray-300"
            />
            <p className="mt-1 text-xs text-gray-500">
              Máx. ~10 MB. Para crédito 1:1, adjunta evidencia: rebote 5xx
              "usuario inexistente" o auto‑respuesta "ya no labora". No adjuntes
              datos sensibles.
            </p>
          </div>

          {/* Honeypot */}
          <div style={{ display: "none" }}>
            <label htmlFor="website">Tu sitio web (deja vacío)</label>
            <input
              id="website"
              name="website"
              type="text"
              value={formData.website}
              onChange={handleInputChange}
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="consent"
              checked={formData.consent}
              onChange={handleInputChange}
              className="mt-1 w-5 h-5 text-[#5E3FA5] bg-white border-[#C7BCE0] rounded focus:ring-[#B276CA] focus:ring-2"
              required
            />
            <span className="text-xs text-gray-700 mt-1">
              Acepto los{" "}
              <Link href="/terminos" className="text-[#5E3FA5] hover:underline">
                Términos
              </Link>{" "}
              y la{" "}
              <Link
                href="/privacidad"
                className="text-[#5E3FA5] hover:underline"
              >
                Política de Privacidad
              </Link>
              , y que me contacten por email/WhatsApp con la respuesta.
            </span>
          </label>

          <div className="flex flex-col sm:flex-row items-start gap-3">
            <button
              type="submit"
              disabled={isSubmitting || !formData.consent}
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-[#7C55B8] to-[#5E3FA5] px-6 py-3 font-semibold text-white hover:from-[#5E3FA5] hover:to-[#4B3284] transition-all shadow-lg text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Enviando...
                </>
              ) : (
                "Enviar"
              )}
            </button>
            <Link
              href="/pagos#reembolsos"
              className="text-sm text-[#5E3FA5] hover:underline"
            >
              Ver política de pagos y reembolsos →
            </Link>
          </div>
          <p className="text-xs text-gray-500">
            Tiempo de respuesta habitual: &lt; 24 h (días hábiles).
          </p>
        </form>
      </section>
    </>
  );
}

// Payments and Refunds Summary Section
function PaymentsSection() {
  return (
    <section className="relative rounded-2xl border border-[#C7BCE0] bg-gradient-to-b from-[#F7F1FA] to-white shadow-lg mb-4 p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-black mb-4 bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
        Pagos, reembolsos y créditos 1:1 (resumen)
      </h2>

      <ul className="space-y-3 text-sm text-gray-700">
        <li className="flex gap-3">
          <span className="text-[#5E3FA5] font-semibold mt-0.5">•</span>
          <span>
            <strong>Regla general:</strong> compras digitales con entrega
            inmediata son <strong>no reembolsables</strong>.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#5E3FA5] font-semibold mt-0.5">•</span>
          <span>
            <strong>Excepciones monetarias:</strong> sin acceso (pídelo en{" "}
            <strong>48 h</strong>) o cobro erróneo (dentro de{" "}
            <strong>7 días</strong>).
          </span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#5E3FA5] font-semibold mt-0.5">•</span>
          <span>
            <strong>Crédito 1:1 (no dinero):</strong> si el email{" "}
            <em>rebota permanentemente</em> o la persona <em>ya no trabaja</em>{" "}
            (solicita en <strong>48 h</strong> con evidencia). No aplica por
            falta de respuesta/OOO/rebote temporal.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#5E3FA5] font-semibold mt-0.5">•</span>
          <span>
            Pagos en <strong>moneda local</strong> cuando es posible; procesados
            por <strong>dLocalGo</strong>. Más detalle en{" "}
            <Link href="/pagos" className="text-[#5E3FA5] hover:underline">
              /pagos/
            </Link>
            .
          </span>
        </li>
      </ul>
    </section>
  );
}

// FAQ Section
function FAQSection() {
  const faqs = [
    {
      question: "¿Cómo pido un reembolso?",
      answer:
        "Solo aplica si no recibiste el acceso tras el pago (dentro de 48 h) o hubo cobro erróneo (7 días). Abre un ticket arriba con tu ID de pedido y evidencia. Ver /pagos/#reembolsos.",
    },
    {
      question: "¿Cómo solicito el crédito 1:1?",
      answer:
        'Aplica si el email rebota (hard bounce) o recibes "ya no labora". Abre un ticket dentro de 48 h y adjunta el rebote/auto‑respuesta. No aplica si no te responden o hay rebote temporal (buzón lleno/OOO).',
    },
    {
      question: "¿Cuánto tardan en responder?",
      answer:
        "Normalmente < 24 h (días hábiles). Si es urgente, escribe por WhatsApp en horario.",
    },
    {
      question: "¿Muestran siempre teléfono?",
      answer:
        "El email se muestra siempre al desbloquear; el teléfono solo si está disponible y permitido. Puedes pedir desbloqueo adicional con una breve declaración de uso responsable.",
    },
  ];

  return (
    <section className="relative rounded-2xl border border-[#C7BCE0] bg-gradient-to-b from-[#F7F1FA] to-white shadow-lg mb-4 p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-black mb-4 bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
        Preguntas frecuentes
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Respuestas rápidas a las dudas más comunes.
      </p>

      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <details
            key={index}
            className="group rounded-xl border border-[#C7BCE0] bg-white p-4 shadow-sm hover:shadow-md transition-all"
          >
            <summary className="select-none font-semibold text-[#261942] list-none cursor-pointer">
              <div className="flex items-center justify-between">
                <span className="text-sm">{faq.question}</span>
                <span className="text-[#5E3FA5] transition-transform duration-200 group-open:rotate-180">
                  ▼
                </span>
              </div>
            </summary>
            <div className="pt-3 text-gray-700 text-sm border-t border-gray-100 mt-3">
              {faq.answer}
            </div>
          </details>
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Si tu duda no aparece aquí, envíanos un mensaje arriba.
      </p>
    </section>
  );
}

/* ---------- Main page ---------- */
export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 md:p-4">
      <div className="container max-w-screen-md mx-auto">
        <div className="bg-white rounded-none p-2 md:p-4">
          <ContactSection />
          <PaymentsSection />
          <FAQSection />
        </div>
      </div>
    </div>
  );
}
