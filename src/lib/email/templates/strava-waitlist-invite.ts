export interface StravaWaitlistInviteTemplateProps {
    userName: string;
}

export function getStravaWaitlistInviteTemplate({ userName }: StravaWaitlistInviteTemplateProps) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://biciregistro.mx';
    const logoUrl = `${baseUrl}/email/logo-email.png`;
    const actionUrl = `${baseUrl}/dashboard?tab=rewards`;

    const subject = "🎟️ ¡Tu lugar VIP para Strava está listo!";
    const preheader = "Hemos liberado nuevos cupos en el servidor y fuiste seleccionado. Entra y conecta tu cuenta ahora.";

    // Consistent color palette matching BiciRegistro Guidelines
    const primaryColor = '#0f172a'; // Slate 900
    const bodyBg = '#f4f4f5'; // Gray 100
    const footerBg = '#f1f5f9'; // Slate 100
    const textColor = '#333333';
    const lightTextColor = '#64748b';
    const stravaOrange = '#FC5200'; // Forzado en línea para evitar sobrescrituras

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
                                <h2 style="color: ${primaryColor}; margin-top: 0; font-size: 24px;">¡Es oficial, ${userName}! 🎉</h2>
                                <p>Gracias a la increíble demanda, hemos logrado ampliar nuestra capacidad de servidores con Strava. Como te apuntaste a la <strong>Lista VIP</strong>, nos emociona decirte que tu lugar ha sido liberado.</p>
                                
                                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid ${stravaOrange}; border-radius: 6px; padding: 20px; margin: 25px 0;">
                                    <h3 style="margin-top: 0; color: ${primaryColor}; font-size: 18px; margin-bottom: 10px;">⏰ Tienes un lugar asegurado</h3>
                                    <p style="margin: 0; font-size: 15px;">
                                        Tu cuenta ya está habilitada para realizar la conexión. Al conectar, ganarás un bono de bienvenida en B-coins y tus rodadas al aire libre empezarán a sumar a tu wallet de forma inmediata.
                                    </p>
                                </div>

                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td align="center" style="padding: 10px 0 30px 0;">
                                            <a href="${actionUrl}" target="_blank" style="display: inline-block; background-color: #FC5200; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                                                CONECTAR STRAVA AHORA
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="margin-bottom: 0;">Nos vemos en la ruta (y en la wallet).</p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td align="center" style="background-color: ${footerBg}; padding: 30px; font-size: 12px; color: ${lightTextColor}; border-top: 1px solid #e2e8f0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: ${primaryColor};">El equipo de BiciRegistro</p>
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
¡Es oficial, ${userName}! 🎉

Gracias a la increíble demanda, hemos logrado ampliar nuestra capacidad de servidores con Strava. Como te apuntaste a la Lista VIP, nos emociona decirte que tu lugar ha sido liberado.

Tu cuenta ya está habilitada para realizar la conexión. Al conectar, ganarás un bono de bienvenida en B-coins y tus rodadas al aire libre empezarán a sumar a tu wallet de forma inmediata.

Conecta Strava ahora desde tu Dashboard de Recompensas:
${actionUrl}

Nos vemos en la ruta.
El equipo de BiciRegistro
    `.trim();

    return { subject, html, text };
}