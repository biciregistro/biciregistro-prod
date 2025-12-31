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
    const { event, user, registration, publicUrl, dashboardUrl, ticketUrl } = data;
    const isFree = event.costType === 'Gratuito';
    const isPaid = registration.paymentStatus === 'paid';
    
    // Colors
    const primaryColor = '#0f172a'; // Slate 900
    const accentColor = '#2563eb'; // Blue 600
    const warningColor = '#d97706'; // Amber 600
    const dangerBg = '#fef2f2'; // Red 50
    const dangerText = '#b91c1c'; // Red 700

    // Payment Warning Section
    let paymentWarningHtml = '';
    if (!isFree && !isPaid) {
        paymentWarningHtml = `
            <div style="background-color: ${dangerBg}; border-left: 4px solid ${dangerText}; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                <p style="margin: 0; color: ${dangerText}; font-weight: bold; font-size: 14px;">
                    ⚠️ No olvides completar tu pago para asegurar tu lugar.
                </p>
                <p style="margin: 5px 0 0 0; color: ${dangerText}; font-size: 13px;">
                    Tu registro está confirmado temporalmente. Si no realizas el pago, tu lugar podría ser liberado.
                </p>
            </div>
        `;
    }

    // HTML Structure
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmación de Registro</title>
    </head>
    <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f5;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background-color: ${primaryColor}; padding: 20px; text-align: center;">
                <img src="https://biciregistro.mx/logo.png" alt="BiciRegistro" style="height: 40px; width: auto;">
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
                <h2 style="color: ${primaryColor}; margin-top: 0;">¡Hola ${user.name}!</h2>
                <p style="font-size: 16px;">Aquí tienes tu pre-registro al evento <strong>${event.name}</strong>.</p>
                
                ${paymentWarningHtml}

                <div style="background-color: #f8fafc; border-radius: 6px; padding: 20px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: ${primaryColor}; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Detalles del Evento</h3>
                    
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Fecha:</td>
                            <td style="padding: 8px 0; font-weight: 500; text-align: right;">${new Date(event.date).toLocaleDateString()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Ubicación:</td>
                            <td style="padding: 8px 0; font-weight: 500; text-align: right;">${event.state}, ${event.country}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Categoría:</td>
                            <td style="padding: 8px 0; font-weight: 500; text-align: right;">${registration.categoryName || 'General'}</td>
                        </tr>
                        ${registration.bibNumber ? `
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Dorsal:</td>
                            <td style="padding: 8px 0; font-weight: bold; text-align: right; color: ${accentColor}; font-size: 16px;">#${registration.bibNumber}</td>
                        </tr>` : ''}
                    </table>
                </div>

                <div style="text-align: center; margin-top: 30px;">
                    <a href="${dashboardUrl}" style="display: inline-block; background-color: ${accentColor}; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                        Ver Boleto Digital y Gestionar
                    </a>
                    <p style="margin-top: 15px; font-size: 12px; color: #94a3b8;">
                        O copia este enlace: <br>
                        <a href="${dashboardUrl}" style="color: ${accentColor};">${dashboardUrl}</a>
                    </p>
                </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b;">
                <p style="margin: 0;">Estás recibiendo este correo porque te registraste en BiciRegistro.</p>
                <p style="margin: 5px 0 0 0;">&copy; ${new Date().getFullYear()} BiciRegistro. Todos los derechos reservados.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    return {
        subject: `${user.name}, aquí tienes tu pre-registro al evento ${event.name}`,
        html: html,
        text: `Hola ${user.name}, te has registrado al evento ${event.name}. Accede a tu boleto aquí: ${dashboardUrl}`
    };
}
