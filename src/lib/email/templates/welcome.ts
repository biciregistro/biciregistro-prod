
export interface WelcomeEmailData {
    name: string;
    dashboardUrl: string;
    privacyPolicyUrl: string;
}

export function getWelcomeEmailTemplate({ name, dashboardUrl, privacyPolicyUrl }: WelcomeEmailData) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://biciregistro.mx';
    const logoUrl = `${baseUrl}/email/logo-email.png`;
    const heroUrl = `${baseUrl}/email/welcome-hero.jpg`;

    const subject = `🛡️ ${name}, tu bici ya no es anónima. ¡Bienvenido a Biciregistro!`;
    const preheader = "Has activado tu primer nivel de protección. Aquí tus siguientes pasos.";

    // Consistent color palette
    const primaryColor = '#0f172a'; // Slate 900
    const accentColor = '#2563eb'; // Blue 600
    const bodyBg = '#f4f4f5'; // Gray 100
    const footerBg = '#f1f5f9'; // Slate 100
    const textColor = '#333333';
    const lightTextColor = '#64748b';

    const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
            body, table, td, div, p, h1, h2, h3 { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
            body { background-color: ${bodyBg}; color: ${textColor}; -webkit-font-smoothing: antialiased; }
            a { color: ${accentColor}; text-decoration: none; }
            .preheader { display:none !important; visibility:hidden; mso-hide:all; font-size:1px; color:transparent; line-height:1px; max-height:0px; max-width:0px; opacity:0; overflow:hidden; }
        </style>
    </head>
    <body style="background-color: ${bodyBg}; margin: 0; padding: 0;">
        <span class="preheader">${preheader}</span>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${bodyBg};">
            <tr>
                <td align="center" style="padding: 20px 0;">
                    <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        
                        <!-- Header -->
                        <tr>
                            <td align="center" style="background-color: #ffffff; padding: 20px;">
                                <img src="${logoUrl}" alt="BiciRegistro" style="height: 40px; width: auto; max-width: 180px;">
                            </td>
                        </tr>

                        <!-- Hero Image -->
                        <tr>
                            <td>
                                <img src="${heroUrl}" alt="Bienvenido a BiciRegistro" style="width: 100%; height: auto; display: block;">
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 30px; font-size: 16px; line-height: 1.6;">
                                <h2 style="color: ${primaryColor}; margin-top: 0; font-size: 24px;">¡Hola, ${name}!</h2>
                                <p>Bienvenido a la comunidad que está acabando con el anonimato de las bicicletas en México. Desde hoy, no solo eres un ciclista más en la ruta; ahora ruedas con identidad y respaldo.</p>
                                
                                <p style="margin-top: 20px;"><strong>¿Qué significa esto para ti y tu bici?</strong> Tu cuenta está activa, pero para que tu blindaje sea total, necesitamos completar tu Bóveda de Seguridad. Recuerda que tus datos están protegidos; tú tienes la llave y tú decides qué mostrar.</p>
                                
                                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin: 25px 0;">
                                    <h3 style="margin-top: 0; color: ${primaryColor}; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; font-size: 18px;">Tu Check-list de Protección:</h3>
                                    <ul style="padding-left: 0; margin-top: 15px; list-style-type: none;">
                                        <li style="margin-bottom: 15px;">
                                            <strong style="color: ${primaryColor};">1. Completa tu Perfil:</strong> No cuidamos solo a la máquina, te cuidamos a ti.
                                        </li>
                                        <li style="margin-bottom: 15px;">
                                            <strong style="color: ${primaryColor};">2. Crea el ADN de tu Bici:</strong> Deja que Sprock nuestra IA te ayude a subir fotos, número de serie y factura.
                                        </li>
                                        <li>
                                            <strong style="color: ${primaryColor};">3. Activa tu Pasaporte Ciclista:</strong> Prepárate para inscribirte a eventos con un solo clic.
                                        </li>
                                    </ul>
                                </div>

                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td align="center" style="padding: 10px 0 20px 0;">
                                            <a href="${dashboardUrl}" target="_blank" style="display: inline-block; background-color: ${accentColor}; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                                                IR A MI GARAGE DIGITAL
                                            </a>
                                        </td>
                                    </tr>
                                </table>

                                <p><strong>Sprock AI ya está patrullando 🔍</strong> Mientras tú disfrutas la ruta, nuestro agente inteligente monitorea la red para combatir el mercado negro. Si alguna vez necesitas reportar un incidente, estaremos listos para activar la alerta comunitaria.</p>
                                
                                <p>Rueda tranquilo, rueda con identidad.</p>
                                <p>El equipo de Biciregistro.</p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td align="center" style="background-color: ${footerBg}; padding: 20px; font-size: 12px; color: ${lightTextColor}; border-top: 1px solid #e2e8f0;">
                                <p style="margin: 0;">¿Tienes dudas sobre tu privacidad? Consulta nuestro <a href="${privacyPolicyUrl}" style="color: ${accentColor}; text-decoration: underline;">aviso de privacidad aquí</a>.</p>
                                <p style="margin: 5px 0 0 0;">Síguenos en <a href="https://www.instagram.com/biciregistro.mx/" style="color: ${accentColor}; text-decoration: underline;">Instagram</a> para consejos de seguridad en ruta.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;

    // Plain text version
    const text = `
    ¡Hola, ${name}!
    Bienvenido a la comunidad que está acabando con el anonimato de las bicicletas en México.
    Tu cuenta está activa, pero para que tu blindaje sea total, necesitamos completar tu Bóveda de Seguridad.

    Tu Check-list de Protección:
    1. Completa tu Perfil.
    2. Crea el ADN de tu Bici.
    3. Activa tu Pasaporte Ciclista.

    Ir a mi garage digital: ${dashboardUrl}

    Sprock AI ya está patrullando. Si alguna vez necesitas reportar un incidente, estaremos listos para activar la alerta comunitaria.
    Rueda tranquilo, rueda con identidad.
    El equipo de Biciregistro.

    Aviso de Privacidad: ${privacyPolicyUrl}
    Síguenos en Instagram: https://www.instagram.com/biciregistro.mx/
    `;

    return { subject, html, text };
}
