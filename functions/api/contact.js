/**
 * Contact API Handler
 * Handles general contact form submissions and sends emails
 */

import { createResponse } from "../utils/cors.js";
import { sendEmail } from "../utils/email.js";

/**
 * Main handler for contact requests
 */
export async function handleContactRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // POST /api/contact - Submit a contact form
  if (path === "/api/contact" && request.method === "POST") {
    return await submitContactForm(request, env);
  }

  return createResponse({ error: "Contact endpoint not found" }, 404);
}

/**
 * Submit a contact form
 */
async function submitContactForm(request, env) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.email || !data.message) {
      return createResponse(
        { error: "Missing required fields: name, email, message" },
        400,
      );
    }

    // Honeypot check
    if (data.website) {
      // Bot detected - pretend success but don't send email
      return createResponse({
        success: true,
        message: "Contact form submitted successfully",
      });
    }

    // Validate consent
    if (!data.consent) {
      return createResponse(
        { error: "You must accept the terms and privacy policy" },
        400,
      );
    }

    // Generate email content
    const subject = `[CONTACTO] ${
      data.reason ? getReasonLabel(data.reason) : "Consulta General"
    } - ${data.name}`;
    const html = generateContactEmailHTML(data);
    const text = generateContactEmailText(data);

    // Send email to hola@empleosafari.com
    const result = await sendEmail(env, {
      to: "hola@empleosafari.com",
      subject,
      html,
      text,
    });

    if (!result.success) {
      console.error("Failed to send contact email:", result.error);
      return createResponse(
        {
          error:
            "Failed to send contact form. Please try again or contact us directly at hola@empleosafari.com",
          details: result.error,
        },
        500,
      );
    }

    // Send confirmation email to user
    try {
      await sendEmail(env, {
        to: data.email,
        subject: "Mensaje recibido - Empleo Safari",
        html: generateConfirmationEmailHTML(data),
        text: generateConfirmationEmailText(data),
      });
    } catch (error) {
      // Don't fail the request if confirmation email fails
      console.error("Failed to send confirmation email:", error);
    }

    return createResponse({
      success: true,
      message: "Contact form submitted successfully",
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Error submitting contact form:", error);
    return createResponse(
      {
        error: "Failed to submit contact form",
        details: error.message,
      },
      500,
    );
  }
}

/**
 * Get human-readable reason label
 */
function getReasonLabel(reason) {
  const labels = {
    job_search: "Búsqueda de empleo",
    career_advice: "Asesoría de carrera",
    platform_help: "Ayuda con la plataforma",
    business: "Oportunidades de negocio",
    other: "Otro",
  };
  return labels[reason] || reason;
}

/**
 * Get urgency label
 */
function getUrgencyLabel(urgency) {
  const labels = {
    low: "Baja - Tengo tiempo",
    normal: "Normal - Esta semana",
    high: "Alta - Urgente",
  };
  return labels[urgency] || urgency;
}

/**
 * Generate HTML email for contact team
 */
function generateContactEmailHTML(data) {
  const {
    name,
    email,
    phone,
    company,
    position,
    reason,
    message,
    urgency,
    newsletter,
  } = data;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nuevo Mensaje de Contacto</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9fafb;
            }
            .container {
                background-color: white;
                border-radius: 8px;
                padding: 40px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            .header {
                border-bottom: 3px solid #5E3FA5;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                background: linear-gradient(135deg, #5E3FA5, #B276CA);
                background-clip: text;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            .field {
                margin: 15px 0;
                padding: 10px;
                background-color: #f3f4f6;
                border-radius: 6px;
            }
            .field-label {
                font-weight: bold;
                color: #5E3FA5;
                margin-bottom: 5px;
            }
            .field-value {
                color: #374151;
            }
            .message-box {
                background-color: #f9fafb;
                border-left: 4px solid #5E3FA5;
                padding: 20px;
                margin: 20px 0;
                white-space: pre-wrap;
            }
            .urgency-high {
                background-color: #fee2e2;
                border-left-color: #dc2626;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                font-size: 14px;
                color: #6b7280;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">💬 Empleo Safari - Contacto</div>
                <h2 style="margin: 10px 0 0 0; color: #261942;">Nuevo Mensaje de Contacto</h2>
            </div>

            ${
              urgency === "high"
                ? `
            <div style="background-color: #fee2e2; border: 2px solid #dc2626; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
                <strong style="color: #dc2626;">⚠️ URGENCIA ALTA - Responder pronto</strong>
            </div>
            `
                : ""
            }

            <div class="field">
                <div class="field-label">👤 Nombre:</div>
                <div class="field-value">${name}</div>
            </div>

            <div class="field">
                <div class="field-label">📧 Email:</div>
                <div class="field-value"><a href="mailto:${email}">${email}</a></div>
            </div>

            ${
              phone
                ? `
            <div class="field">
                <div class="field-label">📱 Teléfono:</div>
                <div class="field-value"><a href="tel:${phone}">${phone}</a></div>
            </div>
            `
                : ""
            }

            ${
              company
                ? `
            <div class="field">
                <div class="field-label">🏢 Empresa:</div>
                <div class="field-value">${company}</div>
            </div>
            `
                : ""
            }

            ${
              position
                ? `
            <div class="field">
                <div class="field-label">💼 Cargo buscado:</div>
                <div class="field-value">${position}</div>
            </div>
            `
                : ""
            }

            ${
              reason
                ? `
            <div class="field">
                <div class="field-label">📋 Motivo:</div>
                <div class="field-value">${getReasonLabel(reason)}</div>
            </div>
            `
                : ""
            }

            <div class="field">
                <div class="field-label">⚡ Urgencia:</div>
                <div class="field-value">${getUrgencyLabel(
                  urgency || "normal",
                )}</div>
            </div>

            ${
              newsletter
                ? `
            <div class="field">
                <div class="field-label">📬 Newsletter:</div>
                <div class="field-value">✅ Sí, quiere recibir ofertas exclusivas</div>
            </div>
            `
                : ""
            }

            <div style="margin: 30px 0;">
                <div class="field-label" style="margin-bottom: 10px;">💬 Mensaje:</div>
                <div class="message-box ${
                  urgency === "high" ? "urgency-high" : ""
                }">${message}</div>
            </div>

            <div class="footer">
                <p><strong>⏰ Tiempo de respuesta esperado:</strong> &lt; 24 horas</p>
                <p><em>Este mensaje fue enviado desde el formulario de contacto en empleosafari.com</em></p>
            </div>
        </div>
    </body>
    </html>
  `;
}

/**
 * Generate plain text email for contact team
 */
function generateContactEmailText(data) {
  const {
    name,
    email,
    phone,
    company,
    position,
    reason,
    message,
    urgency,
    newsletter,
  } = data;

  return `
💬 NUEVO MENSAJE DE CONTACTO - Empleo Safari

${urgency === "high" ? "⚠️ URGENCIA ALTA - Responder pronto\n" : ""}
👤 NOMBRE: ${name}
📧 EMAIL: ${email}
${phone ? `📱 TELÉFONO: ${phone}` : ""}
${company ? `🏢 EMPRESA: ${company}` : ""}
${position ? `💼 CARGO BUSCADO: ${position}` : ""}
${reason ? `📋 MOTIVO: ${getReasonLabel(reason)}` : ""}
⚡ URGENCIA: ${getUrgencyLabel(urgency || "normal")}
${newsletter ? "📬 NEWSLETTER: ✅ Sí, quiere recibir ofertas" : ""}

💬 MENSAJE:
────────────────────────────────────────
${message}
────────────────────────────────────────

⏰ Tiempo de respuesta esperado: < 24 horas

Este mensaje fue enviado desde el formulario de contacto en empleosafari.com
  `;
}

/**
 * Generate confirmation email HTML for user
 */
function generateConfirmationEmailHTML(data) {
  const { name } = data;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mensaje Recibido - Empleo Safari</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9fafb;
            }
            .container {
                background-color: white;
                border-radius: 8px;
                padding: 40px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                background: linear-gradient(135deg, #5E3FA5, #B276CA);
                background-clip: text;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin-bottom: 10px;
            }
            .success-box {
                background-color: #dcfce7;
                border: 2px solid #22c55e;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                text-align: center;
            }
            .info-box {
                background-color: #f3f4f6;
                border-radius: 6px;
                padding: 15px;
                margin: 20px 0;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                font-size: 14px;
                color: #6b7280;
                text-align: center;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">✅ Empleo Safari</div>
                <h1 style="color: #261942;">¡Mensaje Recibido!</h1>
            </div>

            <div class="success-box">
                <span style="font-size: 48px;">✅</span>
                <h2 style="color: #22c55e; margin: 10px 0;">Tu mensaje ha sido enviado</h2>
            </div>

            <p>Hola <strong>${name}</strong>,</p>
            
            <p>Hemos recibido tu mensaje y te agradecemos por contactarnos.</p>

            <div class="info-box">
                <p style="margin: 5px 0;"><strong>⏰ Tiempo de respuesta habitual:</strong> &lt; 24 horas</p>
                <p style="margin: 5px 0;"><strong>📧 Te responderemos a:</strong> ${
                  data.email
                }</p>
                ${
                  data.phone
                    ? `<p style="margin: 5px 0;"><strong>📱 O te llamaremos al:</strong> ${data.phone}</p>`
                    : ""
                }
            </div>

            <p>Nuestro equipo revisará tu solicitud y te contactará lo antes posible para ayudarte a encontrar las mejores oportunidades laborales.</p>

            <p><strong>Mientras tanto:</strong></p>
            <ul>
                <li>Explora nuestras <a href="https://www.empleosafari.com/empleos" style="color: #5E3FA5;">ofertas de empleo</a></li>
                <li>Descubre las <a href="https://www.empleosafari.com/empresas" style="color: #5E3FA5;">empresas que están contratando</a></li>
                <li>Lee nuestra <a href="https://www.empleosafari.com/guia" style="color: #5E3FA5;">guía de búsqueda de empleo</a></li>
                <li>Para urgencias, escríbenos por WhatsApp: <a href="https://wa.me/13001234567" style="color: #5E3FA5;">+1 300 123 4567</a></li>
            </ul>

            <div class="footer">
                <p>¿Necesitas ayuda adicional? Contáctanos:</p>
                <p>
                    📧 <a href="mailto:hola@empleosafari.com">hola@empleosafari.com</a><br>
                    💬 <a href="https://wa.me/13001234567">WhatsApp: +1 300 123 4567</a><br>
                    🌐 <a href="https://www.empleosafari.com">www.empleosafari.com</a>
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
}

/**
 * Generate confirmation email text for user
 */
function generateConfirmationEmailText(data) {
  const { name } = data;

  return `
✅ Empleo Safari - Mensaje Recibido

Hola ${name},

Hemos recibido tu mensaje y te agradecemos por contactarnos.

⏰ TIEMPO DE RESPUESTA: < 24 horas
📧 TE RESPONDEREMOS A: ${data.email}
${data.phone ? `📱 O TE LLAMAREMOS AL: ${data.phone}` : ""}

Nuestro equipo revisará tu solicitud y te contactará lo antes posible para ayudarte a encontrar las mejores oportunidades laborales.

MIENTRAS TANTO:
- Explora nuestras ofertas de empleo: https://www.empleosafari.com/empleos
- Descubre las empresas que están contratando: https://www.empleosafari.com/empresas
- Lee nuestra guía de búsqueda de empleo: https://www.empleosafari.com/guia
- Para urgencias, escríbenos por WhatsApp: +1 300 123 4567

¿Necesitas ayuda adicional?
📧 hola@empleosafari.com
💬 WhatsApp: +1 300 123 4567
🌐 www.empleosafari.com

--
Empleo Safari
  `;
}
