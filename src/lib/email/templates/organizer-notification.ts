
import { Event, User, EventRegistration } from '@/lib/types';

export interface OrganizerNotificationEmailData {
    organizerName: string;
    eventName: string;
    attendeeName: string;
    eventImageUrl: string;
    dashboardUrl: string;
}

export function getOrganizerNotificationEmailTemplate({ 
    organizerName, 
    eventName, 
    attendeeName, 
    eventImageUrl, 
    dashboardUrl 
}: OrganizerNotificationEmailData) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://biciregistro.mx';
    const logoUrl = `${baseUrl}/email/logo-email.png`;
    
    // Use event image as hero, fallback to default if missing
    const heroUrl = eventImageUrl || `${baseUrl}/email/welcome-hero.jpg`;

    const subject = `Nuevo participante registrado a tu evento ${eventName}`;
    const preheader = `${attendeeName} se ha inscrito a tu evento. Ingresa a tu panel para ver los detalles.`;

    // Consistent color palette matching existing templates
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
        <title>\${subject}</title>
        <style>
            body, table, td, div, p, h1, h2, h3 { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
            body { background-color: \${bodyBg}; color: \${textColor}; -webkit-font-smoothing: antialiased; }
            a { color: \${accentColor}; text-decoration: none; }
            .preheader { display:none !important; visibility:hidden; mso-hide:all; font-size:1px; color:transparent; line-height:1px; max-height:0px; max-width:0px; opacity:0; overflow:hidden; }
            .button { display: inline-block; background-color: \${accentColor}; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold; font-size: 16px; }
        </style>
    </head>
    <body style="background-color: \${bodyBg}; margin: 0; padding: 0;">
        <span class="preheader">\${preheader}</span>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: \${bodyBg};">
            <tr>
                <td align="center" style="padding: 20px 0;">
                    <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        
                        <!-- Header -->
                        <tr>
                            <td align="center" style="background-color: #ffffff; padding: 20px;">
                                <img src="\${logoUrl}" alt="BiciRegistro" style="height: 40px; width: auto; max-width: 180px;">
                            </td>
                        </tr>

                        <!-- Hero Image (Event Image) -->
                        <tr>
                            <td style="background-color: #e2e8f0; text-align: center;">
                                <img src="\${heroUrl}" alt="\${eventName}" style="width: 100%; max-height: 300px; object-fit: cover; display: block;">
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 30px; font-size: 16px; line-height: 1.6;">
                                <p style="margin-bottom: 20px;">Hola <strong>\${organizerName}</strong>,</p>
                                
                                <p style="margin-bottom: 20px;">
                                    <strong>\${attendeeName}</strong> se ha inscrito a tu evento <strong>\${eventName}</strong>, ingresa a tu panel para dar seguimiento a su inscripción.
                                </p>
                                
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td align="center" style="padding: 10px 0 30px 0;">
                                            <a href="\${dashboardUrl}" target="_blank" class="button">
                                                INGRESAR A MI PANEL
                                            </a>
                                        </td>
                                    </tr>
                                </table>

                                <p style="margin-bottom: 10px;">Te deseamos mucho éxito en la organización de tu evento. Si tienes alguna duda no olvides ponerte en contacto con nosotros.</p>
                                
                                <p style="margin-top: 30px;">Atentamente - Equipo de Biciregistro</p>
                                <a href="mailto:hola@biciregistro.mx" style="color: \${accentColor};">hola@biciregistro.mx</a>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td align="center" style="background-color: \${footerBg}; padding: 20px; font-size: 12px; color: \${lightTextColor}; border-top: 1px solid #e2e8f0;">
                                <p style="margin: 0;">&copy; \${new Date().getFullYear()} Biciregistro. Todos los derechos reservados.</p>
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
    Hola \${organizerName},

    \${attendeeName} se ha inscrito a tu evento \${eventName}.
    
    Ingresa a tu panel para dar seguimiento a su inscripción:
    \${dashboardUrl}

    Te deseamos mucho éxito en la organización de tu evento. Si tienes alguna duda no olvides ponerte en contacto con nosotros.

    Atentamente - Equipo de Biciregistro
    hola@biciregistro.mx
    `;

    return { subject, html, text };
}
