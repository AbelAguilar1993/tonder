/**
 * Support API Handler
 * Handles support ticket submissions and sends emails
 */

import { createResponse } from "../utils/cors.js";
import { sendEmail } from "../utils/email.js";

/**
 * Main handler for support requests
 */
export async function handleSupportRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // POST /api/support/ticket - Submit a support ticket
  if (path === "/api/support/ticket" && request.method === "POST") {
    return await submitSupportTicket(request, env);
  }

  return createResponse({ error: "Support endpoint not found" }, 404);
}

/**
 * Submit a support ticket
 */
async function submitSupportTicket(request, env) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.email || !data.topic || !data.message) {
      return createResponse(
        { error: "Missing required fields: name, email, topic, message" },
        400,
      );
    }

    // Honeypot check
    if (data.website) {
      // Bot detected - pretend success but don't send email
      return createResponse({
        success: true,
        message: "Support ticket submitted successfully",
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
    const subject = `[SOPORTE] ${getTopicLabel(data.topic)} - ${data.name}`;
    const html = generateSupportEmailHTML(data);
    const text = generateSupportEmailText(data);

    // Send email to support
    const result = await sendEmail(env, {
      to: "soporte@empleosafari.com",
      subject,
      html,
      text,
    });

    if (!result.success) {
      console.error("Failed to send support email:", result.error);
      return createResponse(
        {
          error:
            "Failed to send support ticket. Please try again or contact us directly at soporte@empleosafari.com",
          details: result.error,
        },
        500,
      );
    }

    // Send confirmation email to user
    try {
      await sendEmail(env, {
        to: data.email,
        subject: "Ticket de soporte recibido - Empleo Safari",
        html: generateConfirmationEmailHTML(data),
        text: generateConfirmationEmailText(data),
      });
    } catch (error) {
      // Don't fail the request if confirmation email fails
      console.error("Failed to send confirmation email:", error);
    }

    return createResponse({
      success: true,
      message: "Support ticket submitted successfully",
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Error submitting support ticket:", error);
    return createResponse(
      {
        error: "Failed to submit support ticket",
        details: error.message,
      },
      500,
    );
  }
}

/**
 * Get human-readable topic label
 */
function getTopicLabel(topic) {
  const labels = {
    no_access: "Sin acceso / No se activó",
    wrong_charge: "Cobro erróneo",
    credit_bounce: "Crédito 1:1 (rebote/no labora)",
    invoice: "Facturación / Comprobante",
    privacy: "Datos / Privacidad",
    other: "Otro",
  };
  return labels[topic] || topic;
}

/**
 * Generate HTML email for support team
 */
function generateSupportEmailHTML(data) {
  const { name, email, topic, message, orderId, whatsapp } = data;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nuevo Ticket de Soporte</title>
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
                <div class="logo">🎫 Empleo Safari - Soporte</div>
                <h2 style="margin: 10px 0 0 0; color: #261942;">Nuevo Ticket de Soporte</h2>
            </div>

            <div class="field">
                <div class="field-label">👤 Nombre:</div>
                <div class="field-value">${name}</div>
            </div>

            <div class="field">
                <div class="field-label">📧 Email:</div>
                <div class="field-value"><a href="mailto:${email}">${email}</a></div>
            </div>

            <div class="field">
                <div class="field-label">📋 Motivo:</div>
                <div class="field-value">${getTopicLabel(topic)}</div>
            </div>

            ${
              orderId
                ? `
            <div class="field">
                <div class="field-label">🔖 ID de Pedido:</div>
                <div class="field-value">${orderId}</div>
            </div>
            `
                : ""
            }

            ${
              whatsapp
                ? `
            <div class="field">
                <div class="field-label">💬 WhatsApp:</div>
                <div class="field-value"><a href="https://wa.me/${whatsapp.replace(
                  /\D/g,
                  "",
                )}">${whatsapp}</a></div>
            </div>
            `
                : ""
            }

            <div style="margin: 30px 0;">
                <div class="field-label" style="margin-bottom: 10px;">💬 Mensaje:</div>
                <div class="message-box">${message}</div>
            </div>

            <div class="footer">
                <p><strong>⏰ Tiempo de respuesta esperado:</strong> &lt; 24-48h (días hábiles)</p>
                <p><em>Este ticket fue enviado desde el formulario de soporte en empleosafari.com</em></p>
            </div>
        </div>
    </body>
    </html>
  `;
}

/**
 * Generate plain text email for support team
 */
function generateSupportEmailText(data) {
  const { name, email, topic, message, orderId, whatsapp } = data;

  return `
🎫 NUEVO TICKET DE SOPORTE - Empleo Safari

👤 NOMBRE: ${name}
📧 EMAIL: ${email}
📋 MOTIVO: ${getTopicLabel(topic)}
${orderId ? `🔖 ID DE PEDIDO: ${orderId}` : ""}
${whatsapp ? `💬 WHATSAPP: ${whatsapp}` : ""}

💬 MENSAJE:
────────────────────────────────────────
${message}
────────────────────────────────────────

⏰ Tiempo de respuesta esperado: < 24-48h (días hábiles)

Este ticket fue enviado desde el formulario de soporte en empleosafari.com
  `;
}

/**
 * Generate confirmation email HTML for user
 */
function generateConfirmationEmailHTML(data) {
  const { name, topic } = data;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ticket Recibido - Empleo Safari</title>
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
                <h1 style="color: #261942;">¡Ticket Recibido!</h1>
            </div>

            <div class="success-box">
                <span style="font-size: 48px;">✅</span>
                <h2 style="color: #22c55e; margin: 10px 0;">Tu ticket ha sido enviado</h2>
            </div>

            <p>Hola <strong>${name}</strong>,</p>
            
            <p>Hemos recibido tu solicitud de soporte sobre: <strong>${getTopicLabel(
              topic,
            )}</strong></p>

            <div class="info-box">
                <p style="margin: 5px 0;"><strong>⏰ Tiempo de respuesta habitual:</strong> &lt; 24-48 horas (días hábiles)</p>
                <p style="margin: 5px 0;"><strong>📧 Te responderemos a:</strong> ${
                  data.email
                }</p>
                ${
                  data.whatsapp
                    ? `<p style="margin: 5px 0;"><strong>💬 O por WhatsApp:</strong> ${data.whatsapp}</p>`
                    : ""
                }
            </div>

            <p>Nuestro equipo de soporte revisará tu solicitud y te contactará lo antes posible.</p>

            <p><strong>Mientras tanto:</strong></p>
            <ul>
                <li>Revisa nuestra <a href="https://www.empleosafari.com/pagos" style="color: #5E3FA5;">página de pagos</a> si tu consulta es sobre reembolsos</li>
                <li>Lee nuestras <a href="https://www.empleosafari.com/soporte" style="color: #5E3FA5;">preguntas frecuentes</a></li>
                <li>Para urgencias, escríbenos por WhatsApp: <a href="https://wa.me/13001234567" style="color: #5E3FA5;">+1 300 123 4567</a></li>
            </ul>

            <div class="footer">
                <p>¿Necesitas ayuda adicional? Contáctanos:</p>
                <p>
                    📧 <a href="mailto:soporte@empleosafari.com">soporte@empleosafari.com</a><br>
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
  const { name, topic } = data;

  return `
✅ Empleo Safari - Ticket Recibido

Hola ${name},

Hemos recibido tu solicitud de soporte sobre: ${getTopicLabel(topic)}

⏰ TIEMPO DE RESPUESTA: < 24-48 horas (días hábiles)
📧 TE RESPONDEREMOS A: ${data.email}
${data.whatsapp ? `💬 O POR WHATSAPP: ${data.whatsapp}` : ""}

Nuestro equipo de soporte revisará tu solicitud y te contactará lo antes posible.

MIENTRAS TANTO:
- Revisa nuestra página de pagos si tu consulta es sobre reembolsos: https://www.empleosafari.com/pagos
- Lee nuestras preguntas frecuentes: https://www.empleosafari.com/soporte
- Para urgencias, escríbenos por WhatsApp: +1 300 123 4567

¿Necesitas ayuda adicional?
📧 soporte@empleosafari.com
💬 WhatsApp: +1 300 123 4567
🌐 www.empleosafari.com

--
Empleo Safari
  `;
}
