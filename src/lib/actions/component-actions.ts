'use server';

import { revalidatePath } from 'next/cache';
import { adminDb } from '../firebase/server';
import { getDecodedSession } from '../auth/server';
import { BikeComponents, BikeFormState, ComponentDetail } from '../types';
import { GamificationRuleId, GAMIFICATION_RULES } from '../gamification/constants';
import { FieldValue } from 'firebase-admin/firestore';

export async function updateBikeComponents(
    bikeId: string,
    frameMaterial: string | null,
    components: BikeComponents | null
): Promise<BikeFormState & { pointsAwarded?: number }> {
    try {
        const decodedToken = await getDecodedSession();
        if (!decodedToken) {
            return { success: false, message: 'No autenticado.' };
        }
        const userId = decodedToken.uid;

        // 1. Verificar propiedad de la bicicleta
        const bikeRef = adminDb.collection('bikes').doc(bikeId);
        const bikeSnap = await bikeRef.get();

        if (!bikeSnap.exists) {
            return { success: false, message: 'Bicicleta no encontrada.' };
        }

        const bikeData = bikeSnap.data();
        if (bikeData?.userId !== userId) {
            return { success: false, message: 'No tienes permiso para editar esta bicicleta.' };
        }

        const currentBikeComponents = bikeData?.components || {};
        const timestamp = new Date().toISOString();

        // 2. Preparar el payload de actualización (Filtrando nulls para no ensuciar DB)
        const updatePayload: Record<string, any> = {};
        
        if (frameMaterial) {
            updatePayload.frameMaterial = frameMaterial;
        }

        if (components) {
            // Limpiamos los componentes e inyectamos updatedAt solo si hubo un cambio real
            const cleanedComponents = Object.entries(components).reduce((acc, [key, val]) => {
                if (val && Object.keys(val).length > 0) {
                    const compVal = val as ComponentDetail;
                    const oldCompVal = currentBikeComponents[key] as ComponentDetail | undefined;
                    
                    // Lógica de Diffing: Verificamos si cambió la marca, modelo o flags
                    const hasChanged = !oldCompVal || 
                        oldCompVal.brand !== compVal.brand || 
                        oldCompVal.model !== compVal.model ||
                        oldCompVal.isGeneric !== compVal.isGeneric ||
                        oldCompVal.isNotApplicable !== compVal.isNotApplicable;

                    // Si cambió, le inyectamos la fecha actual. Si no, mantenemos la que ya tenía (si existía).
                    if (hasChanged) {
                        acc[key] = { ...compVal, updatedAt: timestamp };
                    } else {
                        acc[key] = compVal; // Se queda igual (ya traía su updatedAt previo si existía)
                    }
                }
                return acc;
            }, {} as Record<string, any>);

            if (Object.keys(cleanedComponents).length > 0) {
                updatePayload.components = cleanedComponents;
            }
        }

        // 3. Ejecutar la actualización de la bicicleta
        await bikeRef.update(updatePayload);

        // 4. Lógica de Gamificación (Idempotencia)
        let pointsAwarded = 0;

        // Evaluar si califica para premio de primera vez por componentes
        if (components && Object.keys(components).length > 0) {
            const ruleId: GamificationRuleId = 'action_component_completion';
            
            // Verificar idempotencia en gamification_history
            const historyRef = adminDb.collection('gamification_history');
            const duplicateCheck = await historyRef
                .where('userId', '==', userId)
                .where('actionId', '==', ruleId)
                .where('metadata.bikeId', '==', bikeId)
                .limit(1)
                .get();

            if (duplicateCheck.empty) {
                // Es la primera vez que se completan componentes para ESTA bicicleta
                
                // Obtener el valor de los puntos de las reglas (desde DB o fallback a constante)
                let pointsToAward = GAMIFICATION_RULES[ruleId].defaultPoints; 
                const ruleSnap = await adminDb.collection('gamification_rules').doc(ruleId).get();
                if (ruleSnap.exists) {
                    pointsToAward = ruleSnap.data()?.points ?? pointsToAward;
                }

                if (pointsToAward > 0) {
                    // Transacción para asegurar la consistencia al otorgar puntos
                    await adminDb.runTransaction(async (transaction: any) => {
                        const userRef = adminDb.collection('users').doc(userId);
                        const historyDocRef = historyRef.doc();

                        transaction.set(historyDocRef, {
                            userId: userId,
                            actionId: ruleId,
                            points: pointsToAward,
                            createdAt: new Date().toISOString(),
                            metadata: { bikeId }
                        });

                        transaction.update(userRef, {
                            'gamification.totalPoints': FieldValue.increment(pointsToAward),
                            'gamification.availablePoints': FieldValue.increment(pointsToAward)
                        });
                    });

                    pointsAwarded += pointsToAward;
                }
            }
        }

        revalidatePath(`/dashboard/bikes/${bikeId}`);
        revalidatePath('/dashboard');

        return {
            success: true,
            message: 'Componentes guardados exitosamente.',
            pointsAwarded: pointsAwarded > 0 ? pointsAwarded : undefined
        };

    } catch (error) {
        console.error('Error updating bike components:', error);
        return {
            success: false,
            message: 'Ocurrió un error al guardar los componentes. Por favor intenta nuevamente.'
        };
    }
}