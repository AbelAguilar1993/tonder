"use client";

import { useState } from "react";

export default function FAQSection() {
  const [openFAQ, setOpenFAQ] = useState(null);

  const faqs = [
    {
      question: "¿Cómo recibo los contactos desbloqueados?",
      answer:
        "Tras el pago, verás los datos en tu panel y te enviaremos un correo con el resumen.",
    },
    {
      question: "¿Qué pasa si el contacto está desactualizado?",
      answer:
        'Si hay hard bounce o "ya no labora", solicitas crédito 1:1 en 48 h. Ver /pagos/.',
    },
    {
      question: "¿Siempre incluyen email y teléfono?",
      answer:
        "Email siempre al desbloquear; teléfono solo si está disponible y permitido por políticas locales/empresariales.",
    },
    {
      question: "¿Cómo protegen mis datos?",
      answer:
        "Nada de envíos masivos. Datos personales protegidos. Consulta /privacidad/ y /terminos/.",
    },
  ];

  return (
    <section className="mb-4">
      <h2 className="text-xl md:text-2xl font-black mb-4 bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
        Preguntas frecuentes
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        {faqs.map((faq, index) => (
          <details
            key={index}
            className="h-fit group rounded-2xl border border-[#C7BCE0] bg-gradient-to-b from-[#F7F1FA] to-white p-4 shadow-sm hover:shadow-lg transition-all"
            open={openFAQ === index}
            onClick={(e) => {
              // toggle controlled open state; prevent default <details> toggling race
              e.preventDefault();
              setOpenFAQ(openFAQ === index ? null : index);
            }}
          >
            <summary className="select-none font-semibold text-[#261942] list-none cursor-pointer">
              <div className="flex items-center justify-between">
                {faq.question}
                <span
                  className={`text-[#5E3FA5] transition-transform duration-200 ${
                    openFAQ === index ? "rotate-180" : ""
                  }`}
                >
                  ▼
                </span>
              </div>
            </summary>
            {openFAQ === index && (
              <div className="pt-3 text-gray-700 text-sm animate-in slide-in-from-top-2 duration-200">
                {faq.answer}
              </div>
            )}
          </details>
        ))}
      </div>
    </section>
  );
}
