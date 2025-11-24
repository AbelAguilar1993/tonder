/**
 * Email Service for Cloudflare Workers
 *
 * This module provides email sending functionality using external SMTP services
 * optimized for Cloudflare Workers environment.
 *
 * Features:
 * - SMTP email sending via external providers
 * - HTML email templates
 * - Error handling and logging
 * - Environment-based configuration
 *
 * @author Empleo Safari Platform
 * @version 1.0.0
 */

/**
 * Send email using external SMTP service
 * For Cloudflare Workers, we'll use a service like Mailgun, SendGrid, or similar
 * that provides HTTP API endpoints since Workers don't support SMTP directly
 *
 * @param {Object} env - Environment variables
 * @param {Object} emailData - Email data
 * @param {string} emailData.to - Recipient email address
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.html - HTML email content
 * @param {string} emailData.text - Plain text email content (optional)
 * @param {string} emailData.from - Custom from address (optional)
 * @param {string} emailData.fromName - Custom from name (optional)
 * @param {string} emailData.replyTo - Reply-to address (optional)
 * @returns {Promise<Object>} Result object with success status
 */
export async function sendEmail(env, emailData) {
  try {
    const { to, subject, html, text, from, fromName, replyTo } = emailData;

    // Validate required fields
    if (!to || !subject || !html) {
      throw new Error("Missing required email fields: to, subject, html");
    }

    // For this implementation, we'll use Mailgun API as an example
    // You can replace this with SendGrid, Postmark, or any other email service

    // Check if email configuration is available
    if (!env.MAILGUN_API_KEY || !env.MAILGUN_DOMAIN) {
      console.warn("Email configuration not found. Email sending is disabled.");
      return {
        success: false,
        error: "Email service not configured",
      };
    }

    // Prepare form data for Mailgun API
    const formData = new FormData();

    // Use custom from address if provided, otherwise use default
    let fromAddress;
    if (from && fromName) {
      fromAddress = `${fromName} <${from}>`;
    } else if (from) {
      fromAddress = from;
    } else {
      fromAddress =
        env.EMAIL_FROM || `Empleo Safari <noreply@${env.MAILGUN_DOMAIN}>`;
    }

    formData.append("from", fromAddress);
    formData.append("to", to);
    formData.append("subject", subject);
    formData.append("html", html);
    if (text) {
      formData.append("text", text);
    }
    if (replyTo) {
      formData.append("h:Reply-To", replyTo);
    }

    // Send email via Mailgun API
    const response = await fetch(
      `https://api.mailgun.net/v3/${env.MAILGUN_DOMAIN}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`api:${env.MAILGUN_API_KEY}`)}`,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Email sending failed:", errorData);
      throw new Error(
        `Email service returned ${response.status}: ${errorData}`,
      );
    }

    const result = await response.json();
    console.log("Email sent successfully:", result.id);

    return {
      success: true,
      messageId: result.id,
    };
  } catch (error) {
    console.error("Email sending error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send password reset email with reset token
 *
 * @param {Object} env - Environment variables
 * @param {Object} resetData - Reset data
 * @param {string} resetData.email - User email
 * @param {string} resetData.first_name - User first name
 * @param {string} resetData.last_name - User last name
 * @param {string} resetData.reset_token - Password reset token
 * @returns {Promise<Object>} Result object with success status
 */
export async function sendPasswordResetEmail(env, resetData) {
  const { email, first_name, last_name, reset_token } = resetData;

  const subject = "Restablece tu contraseña - Empleo Safari";

  const resetUrl = `${
    env.NEXT_PUBLIC_APP_URL || "https://www.empleosafari.com"
  }/reset-password?token=${reset_token}`;

  const html = generatePasswordResetEmailHTML({
    first_name,
    last_name,
    email,
    reset_token,
    resetUrl,
    appUrl: env.NEXT_PUBLIC_APP_URL || "https://www.empleosafari.com",
  });

  const text = generatePasswordResetEmailText({
    first_name,
    last_name,
    email,
    reset_token,
    resetUrl,
    appUrl: env.NEXT_PUBLIC_APP_URL || "https://www.empleosafari.com",
  });

  return await sendEmail(env, {
    to: email,
    subject,
    html,
    text,
  });
}

/**
 * Send password reset confirmation email
 *
 * @param {Object} env - Environment variables
 * @param {Object} userData - User data
 * @param {string} userData.email - User email
 * @param {string} userData.first_name - User first name
 * @param {string} userData.last_name - User last name
 * @returns {Promise<Object>} Result object with success status
 */
export async function sendPasswordResetConfirmationEmail(env, userData) {
  const { email, first_name, last_name } = userData;

  const subject = "Contraseña restablecida exitosamente - Empleo Safari";

  const html = generatePasswordResetConfirmationEmailHTML({
    first_name,
    last_name,
    email,
    loginUrl: env.NEXT_PUBLIC_APP_URL || "https://www.empleosafari.com",
  });

  const text = generatePasswordResetConfirmationEmailText({
    first_name,
    last_name,
    email,
    loginUrl: env.NEXT_PUBLIC_APP_URL || "https://www.empleosafari.com",
  });

  return await sendEmail(env, {
    to: email,
    subject,
    html,
    text,
  });
}

/**
 * Send welcome email with password to new user
 *
 * @param {Object} env - Environment variables
 * @param {Object} userData - User data
 * @param {string} userData.email - User email
 * @param {string} userData.first_name - User first name
 * @param {string} userData.last_name - User last name
 * @param {string} userData.password - User password (plain text)
 * @param {string} userData.role - User role
 * @param {string} userData.company_name - Company name (optional)
 * @returns {Promise<Object>} Result object with success status
 */
export async function sendWelcomeEmail(env, userData) {
  const { email, first_name, last_name, password, role, company_name } =
    userData;

  const subject = "Welcome to Empleo Safari - Your Account Details";

  const html = generateWelcomeEmailHTML({
    first_name,
    last_name,
    email,
    password,
    role,
    company_name,
    loginUrl: env.NEXT_PUBLIC_APP_URL || "https://www.empleosafari.com/",
  });

  const text = generateWelcomeEmailText({
    first_name,
    last_name,
    email,
    password,
    role,
    company_name,
    loginUrl: env.NEXT_PUBLIC_APP_URL || "https://www.empleosafari.com",
  });

  return await sendEmail(env, {
    to: email,
    subject,
    html,
    text,
  });
}

/**
 * Generate HTML email template for welcome email
 */
function generateWelcomeEmailHTML(data) {
  const {
    first_name,
    last_name,
    email,
    password,
    role,
    company_name,
    loginUrl,
  } = data;

  const roleDisplay =
    role === "super_admin"
      ? "Super Administrator"
      : role === "company_admin"
      ? "Company Administrator"
      : "User";

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Empleo Safari</title>
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
                color: #6366f1;
                margin-bottom: 10px;
            }
            .welcome-text {
                font-size: 18px;
                color: #4b5563;
                margin-bottom: 30px;
            }
            .credentials-box {
                background-color: #f3f4f6;
                border-radius: 6px;
                padding: 20px;
                margin: 20px 0;
                border-left: 4px solid #6366f1;
            }
            .credential-item {
                margin: 10px 0;
            }
            .credential-label {
                font-weight: bold;
                color: #374151;
            }
            .credential-value {
                font-family: monospace;
                background-color: #e5e7eb;
                padding: 2px 6px;
                border-radius: 4px;
                margin-left: 10px;
            }
            .login-button {
                display: inline-block;
                background-color: #6366f1;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                margin: 20px 0;
            }
            .security-notice {
                background-color: #fef3c7;
                border: 1px solid #f59e0b;
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
                <div class="logo">🚀 Empleo Safari</div>
                <h1>¡Bienvenido a la plataforma!</h1>
            </div>

            <div class="welcome-text">
                Hola <strong>${first_name} ${last_name}</strong>,
                <br><br>
                Tu cuenta ha sido creada exitosamente en Empleo Safari. A continuación encontrarás los detalles para acceder a tu cuenta.
            </div>

            <div class="credentials-box">
                <h3 style="margin-top: 0; color: #374151;">Datos de acceso:</h3>
                <div class="credential-item">
                    <span class="credential-label">Email:</span>
                    <span class="credential-value">${email}</span>
                </div>
                <div class="credential-item">
                    <span class="credential-label">Contraseña:</span>
                    <span class="credential-value">${password}</span>
                </div>
                <div class="credential-item">
                    <span class="credential-label">Rol:</span>
                    <span class="credential-value">${roleDisplay}</span>
                </div>
                ${
                  company_name
                    ? `
                <div class="credential-item">
                    <span class="credential-label">Empresa:</span>
                    <span class="credential-value">${company_name}</span>
                </div>
                `
                    : ""
                }
            </div>

            <div style="text-align: center;">
                <a href="${loginUrl}" class="login-button">Iniciar Sesión</a>
            </div>

            <div class="security-notice">
                <strong>⚠️ Importante:</strong> Por seguridad, te recomendamos cambiar tu contraseña después del primer inicio de sesión. Puedes hacerlo desde tu perfil una vez que accedas a la plataforma.
            </div>

            <div style="margin-top: 20px;">
                <h3>¿Qué puedes hacer ahora?</h3>
                <ul>
                    <li>Accede a la plataforma con tus credenciales</li>
                    <li>Completa tu perfil profesional</li>
                    <li>Explora las oportunidades laborales disponibles</li>
                    ${
                      role !== "user"
                        ? "<li>Accede al panel de administración</li>"
                        : ""
                    }
                </ul>
            </div>

            <div class="footer">
                <p>Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.</p>
                <p>
                    <a href="mailto:support@empleosafari.com">support@empleosafari.com</a>
                    <br>
                    <a href="${loginUrl}">www.empleosafari.com</a>
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
}

/**
 * Generate plain text email template for welcome email
 */
function generateWelcomeEmailText(data) {
  const {
    first_name,
    last_name,
    email,
    password,
    role,
    company_name,
    loginUrl,
  } = data;

  const roleDisplay =
    role === "super_admin"
      ? "Super Administrator"
      : role === "company_admin"
      ? "Company Administrator"
      : "User";

  return `
¡Bienvenido a Empleo Safari!

Hola ${first_name} ${last_name},

Tu cuenta ha sido creada exitosamente en Empleo Safari. A continuación encontrarás los detalles para acceder a tu cuenta.

DATOS DE ACCESO:
- Email: ${email}
- Contraseña: ${password}
- Rol: ${roleDisplay}
${company_name ? `- Empresa: ${company_name}` : ""}

Para iniciar sesión, visita: ${loginUrl}

IMPORTANTE: Por seguridad, te recomendamos cambiar tu contraseña después del primer inicio de sesión.

¿Qué puedes hacer ahora?
- Accede a la plataforma con tus credenciales
- Completa tu perfil profesional
- Explora las oportunidades laborales disponibles
${role !== "user" ? "- Accede al panel de administración" : ""}

Si tienes alguna pregunta o necesitas ayuda, contáctanos en:
support@empleosafari.com

¡Bienvenido al equipo!

--
Empleo Safari
${loginUrl}
  `;
}

/**
 * Generate HTML email template for password reset
 */
function generatePasswordResetEmailHTML(data) {
  const { first_name, last_name, email, reset_token, resetUrl, appUrl } = data;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Restablece tu contraseña - Empleo Safari</title>
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
                background: linear-gradient(135deg, #5E3FA6, #B276CA);
                background-clip: text;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin-bottom: 10px;
            }
            .reset-text {
                font-size: 16px;
                color: #4b5563;
                margin-bottom: 30px;
            }
            .reset-button {
                display: inline-block;
                background: linear-gradient(135deg, #5E3FA6, #B276CA);
                color: white;
                padding: 16px 32px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                margin: 20px 0;
                transition: all 0.3s ease;
            }
            .reset-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(94, 63, 166, 0.3);
            }
            .security-notice {
                background-color: #fef3c7;
                border: 1px solid #f59e0b;
                border-radius: 6px;
                padding: 15px;
                margin: 20px 0;
            }
            .warning-notice {
                background-color: #fee2e2;
                border: 1px solid #ef4444;
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
            .alternative-link {
                font-family: monospace;
                font-size: 12px;
                background-color: #f3f4f6;
                padding: 10px;
                border-radius: 4px;
                word-break: break-all;
                margin: 10px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🔐 Empleo Safari</div>
                <h1>Restablece tu contraseña</h1>
            </div>

            <div class="reset-text">
                Hola <strong>${first_name} ${last_name}</strong>,
                <br><br>
                Recibimos una solicitud para restablecer la contraseña de tu cuenta asociada a <strong>${email}</strong>.
                <br><br>
                Haz clic en el botón de abajo para crear una nueva contraseña:
            </div>

            <div style="text-align: center;">
                <a href="${resetUrl}" class="reset-button">🔑 Restablecer Contraseña</a>
            </div>

            <div class="alternative-link">
                Si el botón no funciona, copia y pega este enlace en tu navegador:
                <br>
                ${resetUrl}
            </div>

            <div class="security-notice">
                <strong>⏰ Importante:</strong> Este enlace de restablecimiento expirará en 1 hora por razones de seguridad.
            </div>

            <div class="warning-notice">
                <strong>🚨 ¿No solicitaste este cambio?</strong> 
                <br>
                Si no solicitaste restablecer tu contraseña, puedes ignorar este email de forma segura. Tu contraseña actual permanecerá sin cambios.
            </div>

            <div style="margin-top: 20px;">
                <h3>Consejos de seguridad:</h3>
                <ul>
                    <li>Usa una contraseña segura con al menos 8 caracteres</li>
                    <li>Combina letras mayúsculas, minúsculas, números y símbolos</li>
                    <li>No reutilices contraseñas de otras cuentas</li>
                    <li>Mantén tu información de acceso en privado</li>
                </ul>
            </div>

            <div class="footer">
                <p>Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.</p>
                <p>
                    <a href="mailto:support@empleosafari.com">support@empleosafari.com</a>
                    <br>
                    <a href="${appUrl}">${appUrl}</a>
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
}

/**
 * Generate plain text email template for password reset
 */
function generatePasswordResetEmailText(data) {
  const { first_name, last_name, email, reset_token, resetUrl, appUrl } = data;

  return `
🔐 Empleo Safari - Restablece tu contraseña

Hola ${first_name} ${last_name},

Recibimos una solicitud para restablecer la contraseña de tu cuenta asociada a ${email}.

Para crear una nueva contraseña, visita el siguiente enlace:
${resetUrl}

IMPORTANTE: Este enlace expirará en 1 hora por razones de seguridad.

🚨 ¿No solicitaste este cambio?
Si no solicitaste restablecer tu contraseña, puedes ignorar este email de forma segura. Tu contraseña actual permanecerá sin cambios.

CONSEJOS DE SEGURIDAD:
- Usa una contraseña segura con al menos 8 caracteres
- Combina letras mayúsculas, minúsculas, números y símbolos
- No reutilices contraseñas de otras cuentas
- Mantén tu información de acceso en privado

Si tienes alguna pregunta o necesitas ayuda, contáctanos en:
support@empleosafari.com

--
Empleo Safari
${appUrl}
  `;
}

/**
 * Generate HTML email template for password reset confirmation
 */
function generatePasswordResetConfirmationEmailHTML(data) {
  const { first_name, last_name, email, loginUrl } = data;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contraseña restablecida - Empleo Safari</title>
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
                background: linear-gradient(135deg, #5E3FA6, #B276CA);
                background-clip: text;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin-bottom: 10px;
            }
            .success-text {
                font-size: 16px;
                color: #4b5563;
                margin-bottom: 30px;
            }
            .login-button {
                display: inline-block;
                background: linear-gradient(135deg, #5E3FA6, #B276CA);
                color: white;
                padding: 16px 32px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                margin: 20px 0;
                transition: all 0.3s ease;
            }
            .login-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(94, 63, 166, 0.3);
            }
            .success-notice {
                background-color: #dcfce7;
                border: 1px solid #22c55e;
                border-radius: 6px;
                padding: 15px;
                margin: 20px 0;
            }
            .security-notice {
                background-color: #fef3c7;
                border: 1px solid #f59e0b;
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
                <h1>¡Contraseña restablecida exitosamente!</h1>
            </div>

            <div class="success-text">
                Hola <strong>${first_name} ${last_name}</strong>,
                <br><br>
                Tu contraseña ha sido restablecida exitosamente para la cuenta <strong>${email}</strong>.
                <br><br>
                Ya puedes iniciar sesión con tu nueva contraseña:
            </div>

            <div style="text-align: center;">
                <a href="${loginUrl}" class="login-button">🚀 Iniciar Sesión</a>
            </div>

            <div class="success-notice">
                <strong>✅ Cambio exitoso:</strong> Tu contraseña ha sido actualizada y tu cuenta está segura.
            </div>

            <div class="security-notice">
                <strong>🛡️ Recomendaciones de seguridad:</strong>
                <ul>
                    <li>Mantén tu nueva contraseña en privado</li>
                    <li>No la compartas con nadie</li>
                    <li>Si sospechas actividad no autorizada, contáctanos inmediatamente</li>
                </ul>
            </div>

            <div class="footer">
                <p>Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.</p>
                <p>
                    <a href="mailto:support@empleosafari.com">support@empleosafari.com</a>
                    <br>
                    <a href="${loginUrl}">www.empleosafari.com</a>
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
}

/**
 * Generate plain text email template for password reset confirmation
 */
function generatePasswordResetConfirmationEmailText(data) {
  const { first_name, last_name, email, loginUrl } = data;

  return `
✅ Empleo Safari - Contraseña restablecida exitosamente

Hola ${first_name} ${last_name},

Tu contraseña ha sido restablecida exitosamente para la cuenta ${email}.

Ya puedes iniciar sesión con tu nueva contraseña en:
${loginUrl}

✅ CAMBIO EXITOSO: Tu contraseña ha sido actualizada y tu cuenta está segura.

🛡️ RECOMENDACIONES DE SEGURIDAD:
- Mantén tu nueva contraseña en privado
- No la compartas con nadie
- Si sospechas actividad no autorizada, contáctanos inmediatamente

Si tienes alguna pregunta o necesitas ayuda, contáctanos en:
support@empleosafari.com

--
Empleo Safari
${loginUrl}
  `;
}

/**
 * Send relay email (User <-> HR Contact)
 * Uses sender's full name and relay addresses
 *
 * @param {Object} env - Environment variables
 * @param {Object} relayData - Relay email data
 * @param {string} relayData.toEmail - Recipient's real email
 * @param {string} relayData.fromName - Sender's full name
 * @param {string} relayData.fromRelayAddress - Sender's relay address
 * @param {string} relayData.toRelayAddress - Recipient's relay address
 * @param {string} relayData.subject - Email subject
 * @param {string} relayData.message - Message content
 * @param {string} relayData.jobTitle - Job title (optional)
 * @param {string} relayData.companyName - Company name (optional)
 * @returns {Promise<Object>} Result object with success status
 */
export async function sendRelayEmail(env, relayData) {
  const {
    toEmail,
    fromName,
    fromRelayAddress,
    toRelayAddress,
    subject,
    message,
    jobTitle,
    companyName,
  } = relayData;

  const html = generateRelayEmailHTML({
    fromName,
    subject,
    message,
    jobTitle,
    companyName,
    replyToAddress: fromRelayAddress,
  });

  const text = generateRelayEmailText({
    fromName,
    subject,
    message,
    jobTitle,
    companyName,
    replyToAddress: fromRelayAddress,
  });

  return await sendEmail(env, {
    to: toEmail,
    from: fromRelayAddress,
    fromName: fromName,
    replyTo: fromRelayAddress,
    subject,
    html,
    text,
  });
}

/**
 * Generate HTML email template for relay messages
 */
function generateRelayEmailHTML(data) {
  const { fromName, subject, message, jobTitle, companyName, replyToAddress } =
    data;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
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
                border-bottom: 3px solid #5E3FA6;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .from-info {
                background-color: #f3f4f6;
                border-left: 4px solid #5E3FA6;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
            }
            .message-content {
                background-color: #fefefe;
                padding: 25px;
                border-radius: 6px;
                margin: 20px 0;
                white-space: pre-wrap;
                border: 1px solid #e5e7eb;
            }
            .job-info {
                background-color: #eff6ff;
                border: 1px solid #3b82f6;
                border-radius: 6px;
                padding: 15px;
                margin: 20px 0;
            }
            .reply-button {
                display: inline-block;
                background: linear-gradient(135deg, #5E3FA6, #B276CA);
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                margin: 20px 0;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                font-size: 12px;
                color: #6b7280;
            }
            .privacy-notice {
                background-color: #fef3c7;
                border: 1px solid #f59e0b;
                border-radius: 6px;
                padding: 12px;
                margin: 15px 0;
                font-size: 13px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 0; color: #261942;">💬 Nuevo Mensaje</h2>
            </div>

            <div class="from-info">
                <strong>De:</strong> ${fromName}
                ${
                  jobTitle && companyName
                    ? `<br><strong>Sobre:</strong> ${jobTitle} - ${companyName}`
                    : ""
                }
            </div>

            ${
              jobTitle && companyName
                ? `
            <div class="job-info">
                <strong>📋 Posición:</strong> ${jobTitle}<br>
                <strong>🏢 Empresa:</strong> ${companyName}
            </div>
            `
                : ""
            }

            <div class="message-content">
${message}
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <p style="color: #6b7280; font-size: 14px;">
                    Para responder a este mensaje, simplemente haz clic en "Responder" en tu cliente de correo.
                </p>
            </div>

            <div class="privacy-notice">
                🔒 <strong>Protección de privacidad:</strong> Este mensaje se envió a través de nuestro sistema de mensajería seguro. 
                Tus datos de contacto permanecen privados y protegidos.
            </div>

            <div class="footer">
                <p>
                    <strong>ℹ️ Acerca de este mensaje:</strong><br>
                    Este mensaje fue enviado a través de Empleo Safari, una plataforma que conecta a candidatos con oportunidades laborales.
                    Tu dirección de correo real está protegida por nuestro sistema de relay.
                </p>
                <p>
                    Para responder, simplemente usa el botón "Responder" de tu cliente de correo. 
                    Tu respuesta será entregada de forma segura a ${fromName}.
                </p>
                <p style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                    <a href="https://www.empleosafari.com">www.empleosafari.com</a> •
                    <a href="https://www.empleosafari.com/privacidad">Política de Privacidad</a> •
                    <a href="mailto:soporte@empleosafari.com">Soporte</a>
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
}

/**
 * Generate plain text email template for relay messages
 */
function generateRelayEmailText(data) {
  const { fromName, subject, message, jobTitle, companyName, replyToAddress } =
    data;

  return `
💬 Nuevo Mensaje - Empleo Safari

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

De: ${fromName}
${jobTitle && companyName ? `Sobre: ${jobTitle} - ${companyName}` : ""}

${
  jobTitle && companyName
    ? `
📋 POSICIÓN: ${jobTitle}
🏢 EMPRESA: ${companyName}

`
    : ""
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MENSAJE:

${message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Para responder a este mensaje, simplemente haz clic en "Responder" en tu cliente de correo.

🔒 PROTECCIÓN DE PRIVACIDAD
Este mensaje se envió a través de nuestro sistema de mensajería seguro. 
Tus datos de contacto permanecen privados y protegidos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️ ACERCA DE ESTE MENSAJE:
Este mensaje fue enviado a través de Empleo Safari, una plataforma que conecta 
a candidatos con oportunidades laborales. Tu dirección de correo real está 
protegida por nuestro sistema de relay.

Para responder, simplemente usa el botón "Responder" de tu cliente de correo. 
Tu respuesta será entregada de forma segura a ${fromName}.

--
Empleo Safari
www.empleosafari.com
  `;
}
