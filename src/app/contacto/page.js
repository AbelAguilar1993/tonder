/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { services } from "../../services";
import { useToast } from "../../components/ui/Toast";

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
        <span className="inline-flex items-center gap-2 rounded-full border border-[#C7BCE0] bg-white px-4 py-2 text-sm font-semibold text-[#4B3284] shadow-sm mb-4">
          💬 Estamos aquí para ayudarte
        </span>
        <h1 className="text-3xl md:text-4xl font-black text-[#261942] leading-tight mb-4">
          Hablemos de tu{" "}
          <span className="bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
            próxima oportunidad
          </span>
        </h1>
        <p className="text-lg text-gray-700 max-w-2xl mx-auto mb-6">
          Nuestro equipo está listo para conectarte con las mejores
          oportunidades laborales. Respuesta garantizada en menos de 24 horas.
        </p>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="text-2xl font-black bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
              &lt; 24h
            </div>
            <div className="text-xs text-gray-500">Tiempo de respuesta</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
              5,000+
            </div>
            <div className="text-xs text-gray-500">Candidatos ayudados</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
              24/7
            </div>
            <div className="text-xs text-gray-500">Disponibilidad</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
              95%
            </div>
            <div className="text-xs text-gray-500">Satisfacción</div>
          </div>
        </div>
      </div>
    </header>
  );
}

// Contact Methods Section
function ContactMethodsSection() {
  const contactMethods = [
    {
      icon: "📧",
      title: "Email Directo",
      subtitle: "Respuesta en 2-4 horas",
      contact: "hola@empleosafari.com",
      href: "mailto:hola@empleosafari.com",
      description: "Ideal para consultas detalladas y documentación",
      badge: "Popular",
      badgeColor: "bg-green-100 text-green-700",
    },
    {
      icon: "🎧",
      title: "Soporte Técnico",
      subtitle: "L-V 9:00-18:00",
      contact: "soporte@empleosafari.com",
      href: "mailto:soporte@empleosafari.com",
      description: "Ayuda con la plataforma y accesos",
      badge: "Especializado",
      badgeColor: "bg-orange-100 text-orange-700",
    },
  ];

  return (
    <section className="mb-4">
      <h2 className="text-xl md:text-2xl font-black mb-6 bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent text-center">
        🚀 Elige cómo prefieres contactarnos
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        {contactMethods.map((method, index) => (
          <div
            key={index}
            className="group relative rounded-2xl border border-[#C7BCE0] bg-gradient-to-b from-[#F7F1FA] to-white p-6 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#B276CA] focus:ring-offset-2"
            onClick={() => {
              if (method.href.startsWith("#")) {
                document
                  .getElementById(method.href.slice(1))
                  ?.scrollIntoView({ behavior: "smooth" });
              } else {
                window.open(method.href, "_blank");
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (method.href.startsWith("#")) {
                  document
                    .getElementById(method.href.slice(1))
                    ?.scrollIntoView({ behavior: "smooth" });
                } else {
                  window.open(method.href, "_blank");
                }
              }
            }}
            tabIndex={0}
            role="button"
            aria-label={`Contactar por ${method.title}: ${method.contact}`}
          >
            {/* Shine effect on hover */}
            <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </div>

            {/* Badge */}
            <div className="flex items-start justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-b from-[#B276CA] to-[#5E3FA5] text-white grid place-items-center text-lg shadow-lg">
                {method.icon}
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-semibold ${method.badgeColor}`}
              >
                {method.badge}
              </span>
            </div>

            <div className="mb-3">
              <h3 className="text-lg font-bold text-[#261942] mb-1">
                {method.title}
              </h3>
              <p className="text-sm font-medium text-[#5E3FA5]">
                {method.subtitle}
              </p>
            </div>

            <div className="mb-3">
              <div className="font-semibold text-[#261942] text-sm">
                {method.contact}
              </div>
              <p className="text-xs text-gray-600 mt-1">{method.description}</p>
            </div>

            {/* Arrow indicator */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Clic para contactar</span>
              <span className="text-[#5E3FA5] font-bold transform transition-transform group-hover:translate-x-1">
                →
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Enhanced Contact Form Section
function ContactFormSection() {
  const { showSuccess, showError, ToastComponent } = useToast("top-center");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    position: "",
    reason: "",
    message: "",
    urgency: "normal",
    consent: false,
    newsletter: false,
    website: "", // honeypot
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = (name, value) => {
    switch (name) {
      case "name":
        return value.length < 2
          ? "El nombre debe tener al menos 2 caracteres"
          : "";
      case "email":
        return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
          ? "Email inválido"
          : "";
      case "message":
        return value.length < 10
          ? "El mensaje debe tener al menos 10 caracteres"
          : "";
      case "consent":
        return !value ? "Debes aceptar los términos" : "";
      default:
        return "";
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    // Real-time validation
    if (touched[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: validateField(name, newValue),
      }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Honeypot check
    if (formData.website) {
      return;
    }

    // Validate all fields
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTouched(
        Object.keys(formData).reduce(
          (acc, key) => ({ ...acc, [key]: true }),
          {},
        ),
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Send to API
      await services.contact.submitContactForm(formData);

      // Show success toast
      showSuccess("¡Mensaje enviado exitosamente!", 6000);

      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        company: "",
        position: "",
        reason: "",
        message: "",
        urgency: "normal",
        consent: false,
        newsletter: false,
        website: "",
      });
      setTouched({});
      setErrors({});
    } catch (error) {
      console.error("Error:", error);
      showError(
        error.message ||
          "Hubo un error al enviar el formulario. Por favor intenta de nuevo.",
        7000,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {ToastComponent}
      <section
        id="contact-form"
        className="relative rounded-2xl border border-[#C7BCE0] bg-gradient-to-b from-[#F7F1FA] to-white shadow-lg mb-4 p-4 md:p-6"
      >
        <div className="text-center mb-6">
          <h2 className="text-xl md:text-2xl font-black mb-2 bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
            📝 Cuéntanos sobre ti
          </h2>
          <p className="text-gray-600">
            Completa el formulario y te contactaremos con las mejores
            oportunidades
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#261942] border-b border-[#C7BCE0] pb-2">
              Información Personal
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-semibold text-[#261942] mb-2"
                >
                  Nombre completo *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={`w-full px-4 py-3 border rounded-xl bg-white text-gray-700 placeholder:text-gray-500 text-sm transition-all duration-200 ${
                    errors.name
                      ? "border-red-300 focus:ring-red-500"
                      : "border-[#C7BCE0] focus:ring-[#B276CA]"
                  } focus:outline-none focus:ring-2 focus:border-transparent`}
                  placeholder="Tu nombre completo"
                  required
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-[#261942] mb-2"
                >
                  Correo electrónico *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={`w-full px-4 py-3 border rounded-xl bg-white text-gray-700 placeholder:text-gray-500 text-sm transition-all duration-200 ${
                    errors.email
                      ? "border-red-300 focus:ring-red-500"
                      : "border-[#C7BCE0] focus:ring-[#B276CA]"
                  } focus:outline-none focus:ring-2 focus:border-transparent`}
                  placeholder="tu@email.com"
                  required
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-semibold text-[#261942] mb-2"
                >
                  Teléfono (opcional)
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-[#C7BCE0] rounded-xl bg-white text-gray-700 placeholder:text-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#B276CA] focus:border-transparent transition-all duration-200"
                  placeholder="+57 300 000 0000"
                />
              </div>

              <div>
                <label
                  htmlFor="urgency"
                  className="block text-sm font-semibold text-[#261942] mb-2"
                >
                  Urgencia
                </label>
                <select
                  id="urgency"
                  name="urgency"
                  value={formData.urgency}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-[#C7BCE0] rounded-xl bg-white text-gray-700 placeholder:text-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#B276CA] focus:border-transparent transition-all duration-200"
                >
                  <option value="low">Baja - Tengo tiempo</option>
                  <option value="normal">Normal - Esta semana</option>
                  <option value="high">Alta - Urgente</option>
                </select>
              </div>
            </div>
          </div>

          {/* Professional Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#261942] border-b border-[#C7BCE0] pb-2">
              Información Profesional
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="company"
                  className="block text-sm font-semibold text-[#261942] mb-2"
                >
                  Empresa actual (opcional)
                </label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  value={formData.company}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-[#C7BCE0] rounded-xl bg-white text-gray-700 placeholder:text-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#B276CA] focus:border-transparent transition-all duration-200"
                  placeholder="Nombre de la empresa"
                />
              </div>

              <div>
                <label
                  htmlFor="position"
                  className="block text-sm font-semibold text-[#261942] mb-2"
                >
                  Cargo que buscas
                </label>
                <input
                  id="position"
                  name="position"
                  type="text"
                  value={formData.position}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-[#C7BCE0] rounded-xl bg-white text-gray-700 placeholder:text-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#B276CA] focus:border-transparent transition-all duration-200"
                  placeholder="Ej: Desarrollador Senior"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reason"
                className="block text-sm font-semibold text-[#261942] mb-2"
              >
                ¿Cómo podemos ayudarte?
              </label>
              <select
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-[#C7BCE0] rounded-xl bg-white text-gray-700 placeholder:text-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#B276CA] focus:border-transparent transition-all duration-200"
              >
                <option value="">Selecciona una opción</option>
                <option value="job_search">Búsqueda de empleo</option>
                <option value="career_advice">Asesoría de carrera</option>
                <option value="platform_help">Ayuda con la plataforma</option>
                <option value="business">Oportunidades de negocio</option>
                <option value="other">Otro</option>
              </select>
            </div>
          </div>

          {/* Message */}
          <div>
            <label
              htmlFor="message"
              className="block text-sm font-semibold text-[#261942] mb-2"
            >
              Mensaje *
            </label>
            <textarea
              id="message"
              name="message"
              rows={4}
              value={formData.message}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={`w-full px-4 py-3 border rounded-xl bg-white text-gray-700 placeholder:text-gray-500 text-sm transition-all duration-200 resize-vertical ${
                errors.message
                  ? "border-red-300 focus:ring-red-500"
                  : "border-[#C7BCE0] focus:ring-[#B276CA]"
              } focus:outline-none focus:ring-2 focus:border-transparent`}
              placeholder="Cuéntanos en detalle cómo podemos ayudarte. Incluye tu experiencia, objetivos y cualquier información relevante..."
              required
            />
            {errors.message && (
              <p className="mt-1 text-xs text-red-600">{errors.message}</p>
            )}
          </div>

          {/* Honeypot */}
          <div style={{ display: "none" }}>
            <input
              name="website"
              type="text"
              value={formData.website}
              onChange={handleInputChange}
            />
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="consent"
                checked={formData.consent}
                onChange={handleInputChange}
                className="mt-1 w-5 h-5 text-[#5E3FA5] bg-white border-[#C7BCE0] rounded focus:ring-[#B276CA] focus:ring-2"
                required
              />
              <span className="text-sm text-gray-700">
                Acepto los{" "}
                <Link
                  href="/terminos"
                  className="text-[#5E3FA5] hover:underline font-medium"
                >
                  Términos y Condiciones
                </Link>{" "}
                y la{" "}
                <Link
                  href="/privacidad"
                  className="text-[#5E3FA5] hover:underline font-medium"
                >
                  Política de Privacidad
                </Link>
                . Autorizo el contacto por email, WhatsApp y llamadas. *
              </span>
            </label>
            {errors.consent && (
              <p className="text-xs text-red-600 ml-8">{errors.consent}</p>
            )}

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="newsletter"
                checked={formData.newsletter}
                onChange={handleInputChange}
                className="mt-1 w-5 h-5 text-[#5E3FA5] bg-white border-[#C7BCE0] rounded focus:ring-[#B276CA] focus:ring-2"
              />
              <span className="text-sm text-gray-700">
                Quiero recibir ofertas de empleo exclusivas y consejos de
                carrera por email.
              </span>
            </label>
          </div>

          {/* Submit */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-4">
            <button
              type="submit"
              disabled={isSubmitting || !formData.consent}
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-[#7C55B8] to-[#5E3FA5] px-8 py-4 font-bold text-white hover:from-[#5E3FA5] hover:to-[#4B3284] transition-all shadow-lg text-center disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                  Enviando mensaje...
                </>
              ) : (
                <>
                  <span className="mr-2">🚀</span>
                  Enviar mensaje
                </>
              )}
            </button>

            <div className="text-sm text-gray-600">
              <div className="font-medium text-[#5E3FA5]">
                ⏱️ Respuesta garantizada en &lt; 24h
              </div>
              <div>Nuestro equipo te contactará pronto</div>
            </div>
          </div>
        </form>
      </section>
    </>
  );
}

// FAQ Section
function FAQSection() {
  const faqs = [
    {
      question: "¿Cuánto tiempo tardan en responder?",
      answer:
        "Garantizamos respuesta en menos de 24 horas durante días hábiles. Para consultas urgentes, usa WhatsApp para respuesta inmediata.",
    },
    {
      question: "¿Es gratuito el servicio de consultoría?",
      answer:
        "La consulta inicial de 30 minutos es completamente gratuita. Te ayudamos a entender tus opciones sin compromiso.",
    },
    {
      question: "¿En qué países tienen presencia?",
      answer:
        "Operamos principalmente en Colombia, México, Argentina, Chile y Perú, con expansión continua en toda Latinoamérica.",
    },
    {
      question: "¿Qué información necesitan para ayudarme?",
      answer:
        "Solo necesitamos conocer tu experiencia, objetivos profesionales y preferencias. Toda la información se mantiene confidencial.",
    },
    {
      question: "¿Pueden ayudarme si estoy empleado actualmente?",
      answer:
        "Absolutamente. Manejamos todo con total discreción y confidencialidad. Muchos de nuestros candidatos están empleados.",
    },
  ];

  return (
    <section className="relative rounded-2xl border border-[#C7BCE0] bg-gradient-to-b from-[#F7F1FA] to-white shadow-lg mb-4 p-4 md:p-6">
      <div className="text-center mb-6">
        <h2 className="text-xl md:text-2xl font-black mb-2 bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
          ❓ Preguntas Frecuentes
        </h2>
        <p className="text-gray-600">
          Resolvemos las dudas más comunes de nuestros candidatos
        </p>
      </div>

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
    </section>
  );
}

/* ---------- Main page ---------- */
export default function ContactPage() {
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
          <ContactMethodsSection />
          <ContactFormSection />
          <FAQSection />
        </div>
      </div>
    </div>
  );
}
