import { NextResponse } from 'next/server';
import { isSerialNumberUnique } from '@/lib/data';
import { adminDb } from '@/lib/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

// Helper for exact match comparison
function isExactMatch(biSerial: string | null | undefined, ourSerial: string): boolean {
    if (!biSerial) return false;
    const cleanBi = biSerial.replace(/[\s-]+/g, '').toUpperCase();
    const cleanOur = ourSerial.replace(/[\s-]+/g, '').toUpperCase();
    return cleanBi === cleanOur;
}

export async function POST(request: Request) {
  try {
    const { serialNumber } = await request.json();

    if (!serialNumber || typeof serialNumber !== 'string') {
      return NextResponse.json({ error: 'El número de serie es inválido.' }, { status: 400 });
    }

    const cleanSerialForBi = serialNumber.replace(/[\s-]+/g, '').toUpperCase();
    console.log(`[CHECK-SERIAL] Iniciando búsqueda para serial: ${serialNumber} (Limpio: ${cleanSerialForBi})`);

    // Increment global search counter (Fraud prevention metric)
    adminDb.collection('stats').doc('global').set({
        totalSearches: FieldValue.increment(1)
    }, { merge: true }).catch(err => console.error("Error updating stats:", err));

    const isUnique = await isSerialNumberUnique(serialNumber);
    let externalTheft = null;
    
    console.log(`[CHECK-SERIAL] Estado local (isUnique): ${isUnique}`);

    // Si es única en nuestra BD, buscamos en Bike Index por si acaso
    if (isUnique) {
        try {
            const biUrl = `https://bikeindex.org/api/v3/search?serial=${encodeURIComponent(cleanSerialForBi)}&stolenness=stolen`;
            console.log(`[CHECK-SERIAL] Consultando Bike Index: ${biUrl}`);
            
            const biRes = await fetch(biUrl);
            console.log(`[CHECK-SERIAL] Respuesta Bike Index Status: ${biRes.status}`);
            
            if (biRes.ok) {
                const biData = await biRes.json();
                console.log(`[CHECK-SERIAL] Bicicletas encontradas en Bike Index: ${biData.bikes ? biData.bikes.length : 0}`);
                
                if (biData.bikes && biData.bikes.length > 0) {
                    // Log the serials returned by BI to debug the exact match
                    biData.bikes.forEach((b: any, index: number) => {
                        console.log(`[CHECK-SERIAL] Result ${index}: serial='${b.serial}', stolen=${b.stolen}`);
                    });

                    const stolenBike = biData.bikes.find((b: any) => 
                        b.stolen && isExactMatch(b.serial, cleanSerialForBi)
                    );

                    if (stolenBike) {
                        console.log(`[CHECK-SERIAL] Match EXACTO encontrado para Bike Index ID: ${stolenBike.id}`);
                        externalTheft = {
                            status: 'stolen',
                            brand: stolenBike.manufacturer_name || 'Desconocida',
                            model: stolenBike.frame_model || 'Desconocido',
                            color: stolenBike.frame_colors?.join(', ') || 'Desconocido',
                            date: stolenBike.date_stolen ? new Date(stolenBike.date_stolen * 1000).toLocaleDateString('es-MX') : null,
                            source: 'Bike Index'
                        };
                    } else {
                        console.log(`[CHECK-SERIAL] No hubo coincidencia exacta entre el serial buscado y los resultados de Bike Index.`);
                    }
                }
            } else {
                console.error(`[CHECK-SERIAL] Error del servidor Bike Index: ${biRes.statusText}`);
            }
        } catch (e) {
            console.error("[CHECK-SERIAL] Excepción al consultar Bike Index:", e);
        }
    }

    return NextResponse.json({ isUnique, externalTheft });
  } catch (error) {
    console.error('[CHECK-SERIAL] Error general:', error);
    return NextResponse.json({ error: 'Ocurrió un error en el servidor.' }, { status: 500 });
  }
}
