import { Event, User, EventRegistration } from '@/lib/types';

interface RegistrationEmailData {
    event: Event;
    user: User;
    registration: EventRegistration;
    publicUrl: string;
    dashboardUrl: string;
    ticketUrl: string;
}

export function getRegistrationEmailTemplate(data: RegistrationEmailData) {
    const { event, user, registration, dashboardUrl } = data;
    const isFree = event.costType === 'Gratuito';
    const isPaid = registration.paymentStatus === 'paid';
    
    // Configuración Base (Igual que organizer-notification.ts)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://biciregistro.mx';
    const logoUrl = `${baseUrl}/email/logo-email.png`;
    
    // Imagen Hero (Prioridad: Evento -> Default)
    const heroUrl = event.imageUrl || `${baseUrl}/email/welcome-hero.jpg`;

    // Colores
    const primaryColor = '#0f172a'; // Slate 900
    const accentColor = '#2563eb'; // Blue 600
    const bodyBg = '#f4f4f5'; // Gray 100
    const footerBg = '#f1f5f9'; // Slate 100
    const textColor = '#333333';
    const lightTextColor = '#64748b';
    
    // Colores específicos para alertas
    const dangerBg = '#fef2f2'; 
    const dangerText = '#b91c1c';

    // Asunto y Preheader
    const subject = `${user.name}, aquí tienes tu pre-registro al evento ${event.name}`;
    const preheader = `Tu inscripción a ${event.name} está confirmada. Accede a tu boleto aquí.`;

    // Sección de Advertencia de Pago
    let paymentWarningHtml = '';
    if (!isFree && !isPaid) {
        paymentWarningHtml = `
            <div style="background-color: ${dangerBg}; border-left: 4px solid ${dangerText}; padding: 15px; margin-bottom: 25px; border-radius: 4px;">
                <p style="margin: 0; color: ${dangerText}; font-weight: bold; font-size: 14px;">
                    ⚠️ No olvides completar tu pago para asegurar tu lugar.
                </p>
                <p style="margin: 5px 0 0 0; color: ${dangerText}; font-size: 13px;">
                    Tu registro está confirmado temporalmente. Si no realizas el pago, tu lugar podría ser liberado.
                </p>
            </div>
        `;
    }

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
            .button { display: inline-block; background-color: ${accentColor}; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold; font-size: 16px; }
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

                        <!-- Hero Image (Event Image) -->
                        <tr>
                            <td style="background-color: #e2e8f0; text-align: center;">
                                <img src="${heroUrl}" alt="${event.name}" style="width: 100%; max-height: 300px; object-fit: cover; display: block;">
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 30px; font-size: 16px; line-height: 1.6;">
                                <p style="margin-bottom: 20px; font-size: 18px;">¡Hola <strong>${user.name}</strong>!</p>
                                
                                <p style="margin-bottom: 20px;">
                                    Aquí tienes tu confirmación de registro al evento <strong>${event.name}</strong>.
                                </p>

                                ${paymentWarningHtml}
                                
                                <!-- Detalles del Evento -->
                                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
                                    <h3 style="margin-top: 0; color: ${primaryColor}; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; font-size: 16px; margin-bottom: 15px;">Detalles del Evento</h3>
                                    
                                    <table style="width: 100%; border-collapse: collapse;">
                                        <tr>
                                            <td style="padding: 6px 0; color: ${lightTextColor}; font-size: 14px; width: 40%;">Fecha:</td>
                                            <td style="padding: 6px 0; font-weight: 500; text-align: right; color: ${textColor};">${new Date(event.date).toLocaleDateString()}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 6px 0; color: ${lightTextColor}; font-size: 14px;">Ubicación:</td>
                                            <td style="padding: 6px 0; font-weight: 500; text-align: right; color: ${textColor};">${event.state}, ${event.country}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 6px 0; color: ${lightTextColor}; font-size: 14px;">Categoría:</td>
                                            <td style="padding: 6px 0; font-weight: 500; text-align: right; color: ${textColor};">${registration.categoryName || 'General'}</td>
                                        </tr>
                                        ${registration.bibNumber ? `
                                        <tr>
                                            <td style="padding: 6px 0; color: ${lightTextColor}; font-size: 14px;">Dorsal:</td>
                                            <td style="padding: 6px 0; font-weight: bold; text-align: right; color: ${accentColor}; font-size: 16px;">#${registration.bibNumber}</td>
                                        </tr>` : ''}
                                    </table>
                                </div>

                                <!-- Botón Principal -->
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td align="center" style="padding: 10px 0 30px 0;">
                                            <a href="${dashboardUrl}" target="_blank" class="button">
                                                VER BOLETO DIGITAL
                                            </a>
                                        </td>
                                    </tr>
                                </table>

                                <p style="margin-bottom: 10px; font-size: 14px; color: ${lightTextColor}; text-align: center;">
                                    O copia este enlace: <br>
                                    <a href="${dashboardUrl}" style="color: ${accentColor}; word-break: break-all;">${dashboardUrl}</a>
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td align="center" style="background-color: ${footerBg}; padding: 20px; font-size: 12px; color: ${lightTextColor}; border-top: 1px solid #e2e8f0;">
                                <p style="margin: 0;">Estás recibiendo este correo porque te registraste en BiciRegistro.</p>
                                <p style="margin: 5px 0 0 0;">&copy; ${new Date().getFullYear()} BiciRegistro. Todos los derechos reservados.</p>
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
    ¡Hola ${user.name}!

    Aquí tienes tu confirmación de registro al evento ${event.name}.

    ${!isFree && !isPaid ? '[ADVERTENCIA: No olvides completar tu pago para asegurar tu lugar]' : ''}

    Detalles:
    Fecha: ${new Date(event.date).toLocaleDateString()}
    Ubicación: ${event.state}, ${event.country}
    Categoría: ${registration.categoryName || 'General'}
    ${registration.bibNumber ? `Dorsal: #${registration.bibNumber}` : ''}

    Ver Boleto Digital: ${dashboardUrl}

    © ${new Date().getFullYear()} BiciRegistro.
    `;

    return { subject, html, text };
}
