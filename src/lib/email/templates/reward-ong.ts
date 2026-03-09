export interface OngRewardTemplateProps {
  ongName: string;
  userName: string;
  campaignTitle: string;
  imageUrl: string;
}

export function getOngRewardTemplate(props: OngRewardTemplateProps) {
  const { ongName, userName, campaignTitle, imageUrl } = props;

  const subject = `Hola ${ongName}, ${userName} ha adquirido tu cupón válido por ${campaignTitle}`;

  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; background-color: #f9f9f9; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
          .header { background-color: #111827; padding: 24px; text-align: center; }
          .header img { height: 40px; filter: brightness(0) invert(1); }
          .hero-image { width: 100%; height: 250px; object-fit: cover; border-bottom: 4px solid #10b981; }
          .content { padding: 32px 24px; }
          .title { color: #111827; font-size: 20px; font-weight: bold; margin-bottom: 24px; }
          .instructions-box { background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
          .instructions-list { margin: 0; padding-left: 20px; }
          .instructions-list li { margin-bottom: 8px; }
          .success-message { color: #047857; font-weight: bold; font-size: 14px; text-align: center; margin-top: 24px; }
          .footer { background-color: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #6b7280; }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              <img src="https://biciregistro.mx/logo-white-bg.png" alt="BiciRegistro Logo">
          </div>
          
          <img src="${imageUrl}" alt="Campaña" class="hero-image">
          
          <div class="content">
              <div class="title">¡Hola ${ongName}!</div>
              <p>El usuario de BiciRegistro <strong>${userName}</strong> ha comprado un cupón por: <strong>${campaignTitle}</strong>.</p>
              
              <div class="instructions-box">
                  <p style="margin-top: 0; font-weight: bold; color: #4b5563;">Para hacerlo válido, te dejamos algunas recomendaciones:</p>
                  <ul class="instructions-list">
                      <li>Apégate a los beneficios y condiciones detallados en el cupón original de tu campaña.</li>
                      <li>El usuario debe mostrarte su app de BiciRegistro con el cupón en estado de "Comprado" (listo para canjear).</li>
                      <li>Al hacer válido el beneficio físico, pide que en tu presencia el usuario haga clic en <strong>"Canjear"</strong> en su celular. Así queda registrado el canje en el sistema.</li>
                  </ul>
              </div>

              <div class="success-message">
                  Además, este lead se ha agregado a la base de datos de tu campaña y podrás comenzar a ver sus estadísticas en tu panel de BiciRegistro.
              </div>
              
              <p style="text-align: center; margin-top: 32px; color: #4b5563;">
                  Gracias por ser parte de BiciRegistro, para nosotros también es importante ayudarte a crecer.
              </p>
          </div>
          
          <div class="footer">
              <p>© ${new Date().getFullYear()} BiciRegistro. Todos los derechos reservados.</p>
          </div>
      </div>
  </body>
  </html>
  `;

  const text = `
¡Hola ${ongName}!

El usuario de BiciRegistro ${userName} ha comprado un cupón por: ${campaignTitle}.

Para hacerlo válido, te dejamos algunas recomendaciones:
- Apégate a los beneficios y condiciones detallados en el cupón original de tu campaña.
- El usuario debe mostrarte su app de BiciRegistro con el cupón en estado de "Comprado" (listo para canjear).
- Al hacer válido el beneficio físico, pide que en tu presencia el usuario haga clic en "Canjear" en su celular. Así queda registrado el canje en el sistema.

Además, este lead se ha agregado a la base de datos de tu campaña y podrás comenzar a ver sus estadísticas en tu panel de BiciRegistro.

Gracias por ser parte de BiciRegistro, para nosotros también es importante ayudarte a crecer.

© ${new Date().getFullYear()} BiciRegistro. Todos los derechos reservados.
`.trim();

  return { subject, html, text };
}
