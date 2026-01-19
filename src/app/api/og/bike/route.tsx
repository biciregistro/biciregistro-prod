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
    
    // URL base para el logo
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://biciregistro.mx';
    const logoUrl = `${baseUrl}/logo.png`;

    const isStolen = status === 'stolen';

    // Colores según estado
    const bgGradient = isStolen 
      ? 'linear-gradient(to bottom, #7f1d1d, #000000)' // Rojo oscuro a negro para robada
      : 'linear-gradient(to bottom, #0f172a, #000000)'; // Azul oscuro a negro para normal

    const accentColor = isStolen ? '#ef4444' : '#3b82f6'; // Rojo vs Azul
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
            justifyContent: 'center',
            background: bgGradient,
            color: 'white',
            fontFamily: 'sans-serif',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Marco de Alerta para robadas */}
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

          {/* Header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20, zIndex: 2 }}>
            <h1
              style={{
                fontSize: isStolen ? 80 : 60,
                fontWeight: 900,
                margin: 0,
                color: isStolen ? '#fca5a5' : '#e2e8f0',
                textTransform: 'uppercase',
                letterSpacing: isStolen ? '0.05em' : 'normal',
                textShadow: '0 4px 8px rgba(0,0,0,0.5)',
              }}
            >
              {titleText}
            </h1>
            <p style={{ fontSize: 24, color: '#94a3b8', margin: '10px 0 0 0', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
              {subtitleText}
            </p>
          </div>

          {/* Imagen de la Bici */}
          <div
            style={{
              display: 'flex',
              position: 'relative',
              width: 800,
              height: 400,
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              border: `4px solid ${accentColor}`,
              backgroundColor: '#1e293b',
              zIndex: 2,
              alignItems: 'center',
              justifyContent: 'center',
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
              <div style={{ fontSize: 40, color: '#64748b' }}>Sin imagen disponible</div>
            )}

            {/* Overlay de Recompensa (Solo si es robada y tiene monto) */}
            {isStolen && reward && reward !== '0' && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'rgba(220, 38, 38, 0.9)',
                  padding: '10px 20px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 40, fontWeight: 'bold', color: 'white', textTransform: 'uppercase' }}>
                  RECOMPENSA: ${reward}
                </span>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div style={{ display: 'flex', marginTop: 30, gap: 40, zIndex: 2 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: 18, textTransform: 'uppercase' }}>Marca</span>
              <span style={{ fontSize: 32, fontWeight: 'bold' }}>{brand}</span>
            </div>
            {model && (
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: 18, textTransform: 'uppercase' }}>Modelo</span>
                <span style={{ fontSize: 32, fontWeight: 'bold' }}>{model}</span>
              </div>
            )}
             {isStolen && location && (
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: 18, textTransform: 'uppercase' }}>Visto por última vez en</span>
                <span style={{ fontSize: 32, fontWeight: 'bold', color: '#fca5a5' }}>{location}</span>
              </div>
            )}
          </div>
          
          {/* Logo Branding en esquina inferior derecha */}
           <div style={{ position: 'absolute', bottom: 30, right: 30, display: 'flex', zIndex: 10 }}>
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
