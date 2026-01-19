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
            justifyContent: 'flex-start',
            background: bgGradient,
            color: 'white',
            fontFamily: 'sans-serif',
            position: 'relative',
            overflow: 'hidden',
            paddingTop: 30, // Reducido un poco para aprovechar espacio
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

          {/* CABECERA NUEVA: Título + Logo alineados */}
          <div style={{ 
              display: 'flex', 
              flexDirection: 'row', 
              alignItems: 'center', 
              justifyContent: 'center', 
              marginBottom: 15, 
              zIndex: 2,
              gap: 30, // Espacio entre texto y logo
              width: '90%' // Ancho contenido para no pegar a bordes
          }}>
            {/* Texto Header */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <h1
                style={{
                    fontSize: 70,
                    fontWeight: 900,
                    margin: 0,
                    color: isStolen ? '#fca5a5' : '#e2e8f0',
                    textTransform: 'uppercase',
                    lineHeight: 0.9,
                    textShadow: '0 4px 8px rgba(0,0,0,0.5)',
                }}
                >
                {titleText}
                </h1>
                <p style={{ fontSize: 20, color: '#94a3b8', margin: '5px 0 0 5px', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 'bold' }}>
                {subtitleText}
                </p>
            </div>

            {/* Logo BiciRegistro (Alineado a la derecha del título) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={logoUrl}
                alt="BiciRegistro"
                width="120" // Un poco más grande para destacar en cabecera
                height="120"
                style={{ objectFit: 'contain' }}
            />
          </div>

          {/* Imagen de la Bici */}
          <div
            style={{
              display: 'flex',
              position: 'relative',
              width: 800, // Recuperamos un poco de ancho (antes 750) ya que ganamos altura quitando footer
              height: 420, // Recuperamos altura (antes 380)
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              border: `4px solid ${accentColor}`,
              backgroundColor: '#1e293b',
              zIndex: 2,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
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
                  padding: '10px 0',
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

          {/* Footer Info Simplificado (Marca/Modelo/Lugar) */}
          <div style={{ 
              display: 'flex', 
              width: '100%', 
              justifyContent: 'center', 
              gap: 40, 
              zIndex: 2,
              paddingBottom: 20 
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ color: '#cbd5e1', fontSize: 16, textTransform: 'uppercase' }}>Bicicleta</span>
              <span style={{ fontSize: 24, fontWeight: 'bold' }}>{brand} {model}</span>
            </div>
             {isStolen && location && (
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ color: '#cbd5e1', fontSize: 16, textTransform: 'uppercase' }}>Ubicación</span>
                <span style={{ fontSize: 24, fontWeight: 'bold', color: '#fca5a5' }}>{location}</span>
              </div>
            )}
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
