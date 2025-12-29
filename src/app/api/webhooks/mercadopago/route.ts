import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { updateRegistrationStatusInternal } from '@/lib/financial-data';

export async function POST(req: NextRequest) {
    // 1. Validar Secreto
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (!secret) {
        console.error('MERCADOPAGO_WEBHOOK_SECRET no configurado');
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    // 2. Extraer Headers
    const xSignature = req.headers.get('x-signature');
    const xRequestId = req.headers.get('x-request-id');

    // Leer el cuerpo crudo
    const bodyText = await req.text(); 
    let body;
    try {
        body = JSON.parse(bodyText);
    } catch (e) {
        console.error('Webhook con JSON inválido');
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Validación de Firma (HMAC SHA-256)
    if (xSignature && xRequestId) {
        const parts = xSignature.split(',');
        let ts = '';
        let v1 = '';
        
        parts.forEach(part => {
             const [key, value] = part.split('=');
             if (key === 'ts') ts = value;
             if (key === 'v1') v1 = value;
        });

        const id = body.data?.id;
        
        if (id && ts && v1) {
            const manifest = `id:${id};request-id:${xRequestId};ts:${ts};`;
            const cyphedSignature = crypto
                .createHmac('sha256', secret)
                .update(manifest)
                .digest('hex');

            if (cyphedSignature !== v1) {
                console.warn(`Firma de Webhook inválida. Esperada: ${cyphedSignature}, Recibida: ${v1}`);
                // return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
            } else {
                console.log('Firma de Webhook válida.');
            }
        }
    }

    // 3. Procesar Evento
    const { action, type, data } = body;
    
    if (type === 'payment' || action === 'payment.created' || action === 'payment.updated') {
        const paymentId = data?.id;

        if (!paymentId) {
             return NextResponse.json({ status: 'ignored_no_id' });
        }
        
        try {
            const accessToken = process.env.MP_ACCESS_TOKEN;
            if (!accessToken) {
                 throw new Error("MP_ACCESS_TOKEN faltante");
            }

            const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            if (!res.ok) {
                console.error(`Error fetching payment ${paymentId}:`, await res.text());
                return NextResponse.json({ status: 'error_fetching_payment' }, { status: 500 });
            }

            const paymentData = await res.json();
            const status = paymentData.status;
            const metadata = paymentData.metadata; 
            
            console.log(`Procesando pago ${paymentId}. Estado: ${status}. Metadata:`, JSON.stringify(metadata));

            if (status === 'approved') {
                const registrationId = metadata?.registration_id;
                
                if (registrationId) {
                    // Update registration status internal will now handle auto-assigning bib number
                    await updateRegistrationStatusInternal(registrationId, {
                        paymentStatus: 'paid',
                        paymentMethod: 'platform',
                    });
                    
                    console.log(`Pago aprobado y registrado para ID: ${registrationId}`);
                } else {
                    console.warn(`Pago ${paymentId} aprobado pero sin registration_id en metadata.`);
                }
            }
            
            return NextResponse.json({ status: 'ok' });

        } catch (error) {
            console.error('Error procesando webhook de pago:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }

    return NextResponse.json({ status: 'ignored' });
}
