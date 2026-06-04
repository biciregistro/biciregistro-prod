export interface StravaDisconnectTemplateProps {
    userName: string;
}

export function getStravaDisconnectTemplate({ userName }: StravaDisconnectTemplateProps) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://biciregistro.mx';
    const logoUrl = `${baseUrl}/email/logo-email.png`;

    const subject = "Confirmación de Desconexión de Strava - BiciRegistro";
    const preheader = "Tu cuenta de Strava ha sido desconectada exitosamente y tus datos protegidos.";

    // Consistent color palette matching BiciRegistro
    const primaryColor = '#0f172a'; // Slate 900
    const accentColor = '#2563eb'; // Blue 600
    const bodyBg = '#f4f4f5'; // Gray 100
    const footerBg = '#f1f5f9'; // Slate 100
    const textColor = '#333333';
    const lightTextColor = '#64748b';
    const stravaOrange = '#FC5200';

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
                            <td align="center" style="background-color: #ffffff; padding: 20px; border-bottom: 3px solid ${stravaOrange};">
                                <img src="${logoUrl}" alt="BiciRegistro" style="height: 40px; width: auto; max-width: 180px;">
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 30px; font-size: 16px; line-height: 1.6;">
                                <h2 style="color: ${primaryColor}; margin-top: 0; font-size: 24px;">Hola, ${userName}</h2>
                                <p>Te confirmamos oficialmente que tu cuenta de Strava ha sido desconectada de nuestro sistema de recompensas.</p>
                                
                                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid ${stravaOrange}; border-radius: 6px; padding: 20px; margin: 25px 0;">
                                    <h3 style="margin-top: 0; color: ${primaryColor}; font-size: 18px; margin-bottom: 10px;">🛡️ Confirmación de Privacidad:</h3>
                                    <p style="margin: 0; font-size: 15px;">
                                        En estricto cumplimiento con las normativas de protección de datos, te informamos que todos los tokens de acceso han sido revocados. No guardaremos registros de tus nuevas actividades y hemos purgado cualquier historial local asociado a tu cuenta.
                                    </p>
                                </div>

                                <p style="margin-bottom: 20px;">Tus B-coins acumulados hasta hoy se mantienen <strong>100% seguros</strong> en tu wallet, listos para ser canjeados.</p>
                                
                                <p>Si en el futuro deseas volver a sumar kilómetros, eres bienvenido a reconectar tu cuenta en cualquier momento desde tu perfil.</p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td align="center" style="background-color: ${footerBg}; padding: 30px; font-size: 12px; color: ${lightTextColor}; border-top: 1px solid #e2e8f0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: ${primaryColor};">El equipo de BiciRegistro</p>
                                <p style="margin: 0 0 20px 0;">¿Tienes alguna duda? Responde a este correo y te ayudaremos con gusto.</p>
                                <img src="${baseUrl}/strava/api_logo_pwrdBy_strava_horiz_light.svg" alt="Powered by Strava" style="width: 100px; opacity: 0.5;">
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;

    // Text version (For fallback and better deliverability)
    const text = `
Hola ${userName},

Te confirmamos oficialmente que tu cuenta de Strava ha sido desconectada de nuestro sistema de recompensas.

Confirmación de Privacidad: En estricto cumplimiento con las normativas de protección de datos, te informamos que todos los tokens de acceso han sido revocados. No guardaremos registros de tus nuevas actividades y hemos purgado cualquier historial local asociado a tu cuenta.

Tus B-coins acumulados hasta hoy se mantienen 100% seguros en tu wallet, listos para ser canjeados.

Si en el futuro deseas volver a sumar kilómetros, eres bienvenido a reconectar tu cuenta en cualquier momento desde tu perfil.

El equipo de BiciRegistro
¿Tienes alguna duda? Responde a este correo y te ayudaremos con gusto.
    `.trim();

    return { subject, html, text };
}