export interface ShopSightingAlertData {
    ownerName: string;
    bikeMake: string;
    bikeModel: string;
    shopName: string;
    shopWhatsapp?: string;
    shopEmail: string;
    shopLocation: string;
}

export function generateShopSightingAlertEmail(data: ShopSightingAlertData) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://biciregistro.mx';
    const logoUrl = `${baseUrl}/email/logo-email.png`;

    const subject = `URGENTE: ¡Posible avistamiento de tu bicicleta robada!`;
    const preheader = "Tu Identidad Digital bloqueó un intento de comercialización en una tienda aliada.";

    // Consistent color palette from platform
    const primaryColor = '#0f172a'; // Slate 900
    const accentColor = '#3b82f6'; // Blue 500
    const bodyBg = '#f4f4f5'; // Gray 100
    const footerBg = '#f1f5f9'; // Slate 100
    const textColor = '#333333';
    const lightTextColor = '#64748b';
    const successBg = '#eff6ff'; // Blue 50
    const successBorder = '#bfdbfe'; // Blue 200

    const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Actualización BiciRegistro: Bloqueo de Mercado</title>
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
                            <td align="center" style="background-color: #ffffff; padding: 30px 20px 20px 20px; border-bottom: 2px solid ${accentColor};">
                                <img src="${logoUrl}" alt="BiciRegistro" style="height: 40px; width: auto; max-width: 180px;">
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 30px; font-size: 16px; line-height: 1.6;">
                                <h1 style="color: ${primaryColor}; margin-top: 0; font-size: 24px; text-align: center; margin-bottom: 20px;">¡El ecosistema te respalda! 🛡️</h1>
                                <p>Hola <strong>${data.ownerName}</strong>,</p>
                                
                                <div style="background-color: ${successBg}; border: 1px solid ${successBorder}; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                    <p style="margin:0; color:#1e3a8a;"><strong>Tu Identidad Digital ha funcionado.</strong> Alguien intentó comercializar tu <strong>${data.bikeMake} ${data.bikeModel}</strong> en una de nuestras tiendas aliadas. Gracias a tu registro activo, <strong>la tienda detectó la alerta y rechazó la compra inmediatamente</strong>, bloqueando su ingreso al mercado secundario.</p>
                                </div>

                                <p>Te compartimos los datos de la sucursal donde ocurrió este avistamiento para que puedas integrar esta información como <strong>indicio probatorio</strong> en tu denuncia formal ante el Ministerio Público:</p>

                                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                    <h3 style="margin-top: 0; color: ${primaryColor}; font-size: 18px; margin-bottom: 15px;">📍 Información del Avistamiento</h3>
                                    
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td width="120" style="padding-bottom: 8px; font-weight: 600; color: ${lightTextColor};">Establecimiento:</td>
                                            <td style="padding-bottom: 8px; font-weight: 700; color: ${primaryColor};">${data.shopName}</td>
                                        </tr>
                                        <tr>
                                            <td width="120" style="padding-bottom: 8px; font-weight: 600; color: ${lightTextColor};">Ubicación:</td>
                                            <td style="padding-bottom: 8px; font-weight: 700; color: ${primaryColor};">${data.shopLocation}</td>
                                        </tr>
                                        ${data.shopWhatsapp ? `
                                        <tr>
                                            <td width="120" style="padding-bottom: 8px; font-weight: 600; color: ${lightTextColor};">Contacto:</td>
                                            <td style="padding-bottom: 8px; font-weight: 700; color: ${primaryColor};">${data.shopWhatsapp}</td>
                                        </tr>` : ''}
                                    </table>
                                </div>

                                <p>Te sugerimos presentar esta notificación a las autoridades correspondientes junto con tu <strong>Pasaporte Digital BiciRegistro</strong>, el cual acredita la legítima propiedad de tu patrimonio (Art. 798 del Código Civil).</p>
                                
                                <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; margin-top: 25px;">
                                    <p style="margin:0; font-size: 13px; color: ${lightTextColor}; font-style: italic;">
                                        <strong>Aviso Legal y de Seguridad:</strong> Por mandato de ley, las tiendas no son autoridades y no pueden retener mercancía ni personas, por lo que <strong>la bicicleta ya no se encuentra en el establecimiento</strong>. Por favor, no acudas a la tienda a reclamar la bicicleta, utiliza esta información exclusivamente a través de las vías legales y autoridades competentes.
                                    </p>
                                </div>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td align="center" style="background-color: ${footerBg}; padding: 20px; font-size: 12px; color: ${lightTextColor}; border-top: 1px solid #e2e8f0;">
                                <p style="margin: 0;">Certeza Jurídica para la Comunidad Ciclista.</p>
                                <p style="margin: 5px 0 0 0;">&copy; ${new Date().getFullYear()} BiciRegistro México</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;

    const text = `
¡El ecosistema te respalda! 

Hola ${data.ownerName},

Tu Identidad Digital ha funcionado. Alguien intentó comercializar tu ${data.bikeMake} ${data.bikeModel} en una de nuestras tiendas aliadas. Gracias a tu registro activo, la tienda detectó la alerta y rechazó la compra inmediatamente, bloqueando su ingreso al mercado secundario.

Te compartimos los datos de la sucursal donde ocurrió este avistamiento para que puedas integrar esta información como indicio probatorio en tu denuncia formal ante el Ministerio Público:

Establecimiento: ${data.shopName}
Ubicación: ${data.shopLocation}
${data.shopWhatsapp ? `Contacto: ${data.shopWhatsapp}` : ''}

Te sugerimos presentar esta notificación a las autoridades correspondientes junto con tu Pasaporte Digital BiciRegistro.

Aviso Legal y de Seguridad: Por mandato de ley, las tiendas no son autoridades y no pueden retener mercancía ni personas, por lo que la bicicleta ya no se encuentra en el establecimiento. Por favor, no acudas a la tienda a reclamar la bicicleta, utiliza esta información exclusivamente a través de las vías legales y autoridades competentes.

Certeza Jurídica para la Comunidad Ciclista.
© ${new Date().getFullYear()} BiciRegistro México
    `;

    return { subject, html, text };
}