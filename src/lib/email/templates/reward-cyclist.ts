export interface CyclistRewardTemplateProps {
  userName: string;
  campaignTitle: string;
  advertiserName: string;
  description: string;
  conditions: string;
  endDate: string;
  imageUrl: string;
  appUrl: string;
  isCoupon?: boolean;
}

export function getCyclistRewardTemplate(props: CyclistRewardTemplateProps) {
  const { userName, campaignTitle, advertiserName, description, conditions, endDate, imageUrl, appUrl, isCoupon = false } = props;
  
  const formattedDate = new Date(endDate).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
  });

  const subject = `${userName} aquí está tu cupón para ${isCoupon ? 'obtener tu beneficio de' : 'canjear tu'} ${campaignTitle}`;

  // Simple clean HTML formatting for bullet points if any
  const formatConditions = (conds: string) => {
      if (!conds) return '';
      // If it contains HTML bullets already from Rich Text editor
      if (conds.includes('<ul>') || conds.includes('<li>')) return conds;
      
      // If plain text with newlines or hyphens
      return `<ul>${conds.split('\n').filter(c => c.trim().length > 0).map(c => `<li>${c.replace(/^-\s*/, '')}</li>`).join('')}</ul>`;
  };

  const adquisitionText = isCoupon 
      ? 'adquirido a través de nuestra plataforma de beneficios'
      : 'adquirido con tus Kilómetros de BiciRegistro';

  const footerReason = isCoupon
      ? 'Has recibido este correo porque adquiriste un beneficio en nuestra plataforma.'
      : 'Has recibido este correo porque canjeaste una recompensa en nuestra plataforma.';

  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; background-color: #f9f9f9; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
          .header { background-color: #111827; padding: 24px; text-align: center; display: flex; justify-content: space-between; align-items: center; }
          .header img { height: 40px; }
          .header-text { color: white; font-weight: bold; font-size: 18px; }
          .hero-image { width: 100%; height: 250px; object-fit: cover; border-bottom: 4px solid #10b981; }
          .content { padding: 32px 24px; }
          .title { color: #111827; font-size: 24px; font-weight: bold; margin-bottom: 24px; text-align: center; }
          .details-box { background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
          .detail-item { margin-bottom: 12px; }
          .detail-label { font-weight: bold; color: #4b5563; }
          .conditions { background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin-bottom: 24px; font-size: 14px; }
          .important-note { text-align: center; font-weight: bold; color: #ef4444; margin-bottom: 24px; }
          .btn-container { text-align: center; margin: 32px 0; }
          .btn { background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold; display: inline-block; }
          .footer { background-color: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #6b7280; }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              <img src="https://biciregistro.mx/logo-white-bg.png" alt="BiciRegistro Logo" style="filter: brightness(0) invert(1);">
              <span class="header-text">${advertiserName}</span>
          </div>
          
          <img src="${imageUrl}" alt="Cupón" class="hero-image">
          
          <div class="content">
              <div class="title">¡Felicidades ${userName}!</div>
              <p>Aquí tienes los detalles de tu cupón ${adquisitionText}.</p>
              
              <div class="details-box">
                  <div class="detail-item"><span class="detail-label">Válido por:</span> ${campaignTitle}</div>
                  <div class="detail-item"><span class="detail-label">Válido con:</span> ${advertiserName}</div>
                  <div class="detail-item"><span class="detail-label">Detalles:</span> ${description}</div>
                  <div class="detail-item"><span class="detail-label">Vigencia hasta:</span> ${formattedDate}</div>
              </div>

              ${conditions ? `
              <div class="conditions">
                  <strong>Condiciones:</strong><br>
                  ${formatConditions(conditions)}
              </div>` : ''}

              <div class="important-note">
                  Importante: Necesitas mostrar el cupón en tu app de BiciRegistro para hacerlo válido en sucursal.
              </div>
              
              <div class="btn-container">
                  <a href="${appUrl}" class="btn">Ir a mi cupón en la App</a>
              </div>
          </div>
          
          <div class="footer">
              <p>© ${new Date().getFullYear()} BiciRegistro. Todos los derechos reservados.</p>
              <p>${footerReason}</p>
          </div>
      </div>
  </body>
  </html>
  `;

  const text = `
¡Felicidades ${userName}!

Aquí tienes los detalles de tu cupón ${adquisitionText}:

- Válido por: ${campaignTitle}
- Válido con: ${advertiserName}
- Detalles: ${description}
- Vigencia hasta: ${formattedDate}

${conditions ? `Condiciones:\n${conditions}\n` : ''}

Importante: Necesitas mostrar el cupón en tu app de BiciRegistro para hacerlo válido en sucursal.
Ingresa aquí para ver tu cupón: ${appUrl}

© ${new Date().getFullYear()} BiciRegistro. Todos los derechos reservados.
`.trim();

  return { subject, html, text };
}
