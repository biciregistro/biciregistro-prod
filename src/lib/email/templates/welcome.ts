
export interface WelcomeEmailData {
    name: string;
    dashboardUrl: string;
    privacyPolicyUrl: string;
}

export function getWelcomeEmailTemplate({ name, dashboardUrl, privacyPolicyUrl }: WelcomeEmailData) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://biciregistro.mx';
    const logoUrl = `${baseUrl}/email/logo-email.png`;
    const heroUrl = `${baseUrl}/email/welcome-hero.jpg`;

    const subject = `🛡️ ${name} tu bici ya no es anónima. ¡Bienvenido a Biciregistro!`;
    const preheader = "Has activado tu primer nivel de protección. Aquí tus siguientes pasos.";

    const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #ffffff; color: #333333; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; }
            .logo { width: 180px; height: auto; }
            .hero { width: 100%; border-radius: 8px; margin-bottom: 20px; }
            .content { line-height: 1.6; font-size: 16px; }
            .button-container { text-align: center; margin: 30px 0; }
            .button { background-color: #2563eb; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; }
            .checklist { background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .checklist-item { margin-bottom: 15px; }
            .checklist-title { font-weight: bold; color: #1e40af; display: block; margin-bottom: 4px; }
            .footer { font-size: 12px; color: #64748b; text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
            .footer a { color: #2563eb; text-decoration: underline; }
            .preheader { display: none; max-height: 0; overflow: hidden; }
        </style>
    </head>
    <body>
        <span className="preheader">${preheader}</span>
        <div className="container">
            <div className="header">
                <img src="${logoUrl}" alt="BiciRegistro" className="logo" />
            </div>
            
            <img src="${heroUrl}" alt="Bienvenido Ciclista" className="hero" />

            <div className="content">
                <p>¡Hola, <strong>${name}</strong>!</p>
                <p>Bienvenido a la comunidad que está acabando con el anonimato de las bicicletas en México. Desde hoy, no solo eres un ciclista más en la ruta; ahora ruedas con identidad y respaldo.</p>
                
                <p><strong>¿Qué significa esto para ti y tu bici?</strong> Tu cuenta está activa, pero para que tu blindaje sea total, necesitamos completar tu Bóveda de Seguridad. Recuerda que tus datos están protegidos con encriptación bancaria; tú tienes la llave y tú decides qué mostrar.</p>
                
                <div className="checklist">
                    <h3 style="margin-top: 0; color: #0f172a;">Tu Check-list de Protección:</h3>
                    
                    <div className="checklist-item">
                        <span className="checklist-title">✅ Completa tu Perfil</span>
                        No cuidamos solo a la máquina, te cuidamos a ti.
                    </div>
                    
                    <div className="checklist-item">
                        <span className="checklist-title">🧬 Crea el ADN de tu Bici</span>
                        Deja que <strong>Sprock</strong> nuestra IA te ayude a subir fotos, número de serie y factura. Esto la vuelve "tóxica" para el mercado negro y rastreable legalmente.
                    </div>
                    
                    <div className="checklist-item">
                        <span className="checklist-title">🆔 Activa tu Pasaporte Ciclista</span>
                        Prepárate para inscribirte a eventos con un solo clic y sin papeles.
                    </div>
                </div>

                <div className="button-container">
                    <a href="${dashboardUrl}" className="button">IR A MI GARAGE DIGITAL</a>
                </div>

                <p><strong>Sprock AI ya está patrullando 🔍</strong> Mientras tú disfrutas la ruta, nuestro agente inteligente monitorea la red para combatir el mercado negro. Si alguna vez necesitas reportar un incidente, estaremos listos para activar la alerta comunitaria y generar tu Carpeta de Investigación legal.</p>
                
                <p>Rueda tranquilo, rueda con identidad.</p>
                
                <p>El equipo de Biciregistro.</p>
            </div>

            <div className="footer">
                <p>¿Tienes dudas sobre tu privacidad? Consulta nuestro <a href="${privacyPolicyUrl}">aviso de privacidad aquí</a>.</p>
                <p>Síguenos en <a href="https://www.instagram.com/biciregistro.mx/">Instagram</a> para consejos de seguridad en ruta.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const text = `
    ¡Hola, ${name}!

    Bienvenido a la comunidad que está acabando con el anonimato de las bicicletas en México.

    ¿Qué significa esto para ti y tu bici? Tu cuenta está activa, pero para que tu blindaje sea total, necesitamos completar tu Bóveda de Seguridad.

    Tu Check-list de Protección:
    1. Completa tu Perfil.
    2. Crea el ADN de tu Bici.
    3. Activa tu Pasaporte Ciclista.

    Ir a mi garage digital: ${dashboardUrl}

    Sprock AI ya está patrullando 🔍 Mientras tú disfrutas la ruta, nuestro agente inteligente monitorea la red para combatir el mercado negro.

    Rueda tranquilo, rueda con identidad.
    El equipo de Biciregistro.

    Aviso de Privacidad: ${privacyPolicyUrl}
    Síguenos en Instagram: https://www.instagram.com/biciregistro.mx/
    `;

    return { subject, html, text };
}
