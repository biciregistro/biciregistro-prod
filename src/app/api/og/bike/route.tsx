import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const brand = searchParams.get('brand') || 'Bicicleta';
    const model = searchParams.get('model') || '';
    const image = searchParams.get('image');
    const status = searchParams.get('status') || 'active';
    const reward = searchParams.get('reward');
    const location = searchParams.get('location');
    
    // URL base para el logo (Asumimos que el usuario subirá logo-white-bg.png)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://biciregistro.mx';
    const logoUrl = `${baseUrl}/logo-white-bg.png`;

    const isStolen = status === 'stolen';

    // Colores según estado
    const bgGradient = isStolen 
      ? 'linear-gradient(to bottom, #7f1d1d, #000000)' // Rojo oscuro a negro para robada
      : 'linear-gradient(to bottom, #0f172a, #000000)'; // Azul oscuro a negro para normal

    const accentColor = isStolen ? '#ef4444' : '#3b82f6';
    const titleText = isStolen ? '¡SE BUSCA!' : 'BICIREGISTRO';
    const subtitleText = isStolen ? 'AYÚDANOS A ENCONTRARLA' : 'CERTIFICADO DE PROPIEDAD';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start', // Cambiado a flex-start para controlar mejor el flujo vertical
            background: bgGradient,
            color: 'white',
            fontFamily: 'sans-serif',
            position: 'relative',
            overflow: 'hidden',
            paddingTop: 40, // Padding superior fijo
          }}
        >
          {/* Marco de Alerta */}
          {isStolen && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                border: '16px solid #ef4444',
                zIndex: 1,
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Header Compacto */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20, zIndex: 2 }}>
            <h1
              style={{
                fontSize: 70, // Reducido un poco para ganar espacio
                fontWeight: 900,
                margin: 0,
                color: isStolen ? '#fca5a5' : '#e2e8f0',
                textTransform: 'uppercase',
                lineHeight: 1,
                textShadow: '0 4px 8px rgba(0,0,0,0.5)',
              }}
            >
              {titleText}
            </h1>
            <p style={{ fontSize: 20, color: '#94a3b8', margin: '5px 0 0 0', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
              {subtitleText}
            </p>
          </div>

          {/* Imagen de la Bici (Ajustada para dejar espacio abajo) */}
          <div
            style={{
              display: 'flex',
              position: 'relative',
              width: 750, // Reducido ancho
              height: 380, // Reducido alto (antes 400)
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              border: `4px solid ${accentColor}`,
              backgroundColor: '#1e293b',
              zIndex: 2,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20, // Espacio antes del footer
            }}
          >
            {image ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={image}
                alt={brand}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div style={{ fontSize: 30, color: '#64748b' }}>Sin imagen</div>
            )}

            {/* Overlay de Recompensa */}
            {isStolen && reward && reward !== '0' && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'rgba(220, 38, 38, 0.95)',
                  padding: '8px 0',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 36, fontWeight: 'bold', color: 'white', textTransform: 'uppercase' }}>
                  RECOMPENSA: ${reward}
                </span>
              </div>
            )}
          </div>

          {/* Footer Info (Ajustado para no cortarse) */}
          <div style={{ 
              display: 'flex', 
              width: '100%', 
              justifyContent: 'center', 
              gap: 40, 
              zIndex: 2,
              paddingBottom: 30 // Espacio inferior seguro
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ color: '#cbd5e1', fontSize: 16, textTransform: 'uppercase' }}>Marca</span>
              <span style={{ fontSize: 28, fontWeight: 'bold' }}>{brand}</span>
            </div>
            {model && (
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ color: '#cbd5e1', fontSize: 16, textTransform: 'uppercase' }}>Modelo</span>
                <span style={{ fontSize: 28, fontWeight: 'bold' }}>{model}</span>
              </div>
            )}
             {isStolen && location && (
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ color: '#cbd5e1', fontSize: 16, textTransform: 'uppercase' }}>Visto en</span>
                <span style={{ fontSize: 28, fontWeight: 'bold', color: '#fca5a5' }}>{location}</span>
              </div>
            )}
          </div>
          
          {/* Logo Branding - Ajustado para no superponerse */}
           <div style={{ 
               position: 'absolute', 
               bottom: 20, 
               right: 25, 
               display: 'flex', 
               zIndex: 10,
           }}>
             {/* eslint-disable-next-line @next/next/no-img-element */}
             <img
               src={logoUrl}
               alt="BiciRegistro"
               width="100"
               height="100"
               style={{ objectFit: 'contain' }}
             />
           </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (e: any) {
    console.error("Error generating OG image:", e);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
