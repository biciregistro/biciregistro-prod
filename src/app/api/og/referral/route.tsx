import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name') || 'Un Ciclista';
    const displayName = name.length > 25 ? `${name.substring(0, 25)}...` : name;

    let logoData: ArrayBuffer | null = null;
    
    try {
        // Usamos la imagen específica para emails que suele tener mejor formato para encabezados
        // Ruta relativa: src/app/api/og/referral/route.tsx -> ../../../../../public/email/logo-email.png
        const logoUrl = new URL('../../../../../public/email/logo-email.png', import.meta.url);
        logoData = await fetch(logoUrl).then((res) => res.arrayBuffer());
    } catch (e) {
        console.error('Error loading local logo, using fallback text:', e);
    }

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
                    backgroundColor: '#F8FAFC', // Slate 50
                    fontFamily: 'sans-serif',
                    position: 'relative',
                }}
            >
                {/* Top Border Brand Colors */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '16px',
                    display: 'flex'
                }}>
                    <div style={{ flex: 1, background: '#2563EB' }} />
                    <div style={{ flex: 1, background: '#FBBF24' }} />
                </div>

                {/* Logo Container */}
                <div style={{
                    marginBottom: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {logoData ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                            src={logoData as any} 
                            alt="Biciregistro" 
                            width="220"
                            style={{ objectFit: 'contain' }}
                        />
                    ) : (
                         <div style={{ 
                            fontSize: 50, 
                            fontWeight: 900, 
                            color: '#2563EB',
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <span style={{ color: '#FBBF24', marginRight: 10, fontSize: 40 }}>✦</span> BICIREGISTRO
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '0 40px',
                    gap: '12px'
                }}>
                    <div style={{ 
                        fontSize: 64, 
                        fontWeight: 'bold', 
                        color: '#0F172A', // Slate 900
                        lineHeight: 1.1,
                    }}>
                        {displayName}
                    </div>

                    <div style={{ 
                        fontSize: 32, 
                        color: '#475569', // Slate 600
                        fontWeight: 400,
                        maxWidth: '800px',
                    }}>
                        te ha invitado a unirte a Biciregistro
                    </div>
                </div>

                {/* CTA Button */}
                <div style={{ 
                    marginTop: 60, 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28, 
                    backgroundColor: '#2563EB', // Brand Blue
                    color: '#ffffff', 
                    padding: '20px 50px', 
                    borderRadius: '12px',
                    fontWeight: 600,
                    boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2), 0 2px 4px -1px rgba(37, 99, 235, 0.1)'
                }}>
                    Protege tu bici hoy
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
        },
    );
}
