"use server";

import { adminDb as db } from '@/lib/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';
import type { SerialLeaderboard, SerialLeaderboardRow, Serial } from '@/lib/types';
import { z } from 'zod';

// Nota: No podemos exportar el schema Zod desde un archivo "use server" si lo estamos 
// usando en un Client Component. Un archivo "use server" SOLO puede exportar 
// funciones asíncronas. Hemos movido la definición del schema al componente cliente
// y aquí solo tipamos el payload.

export type PublishResultsPayload = {
    eventId: string;
    serialId: string;
    results: {
        userId: string;
        categoryId: string;
        position: number;
        totalChipTimeMs?: number;
        userName: string;
        categoryName: string;
    }[];
};

export async function publishStageResultsAction(payload: PublishResultsPayload) {
    try {
        const { eventId, serialId, results } = payload;

        if (!eventId || !serialId || !Array.isArray(results)) {
             return { success: false, error: "Estructura de datos inválida" };
        }

        // 1. Fetch Serial Context (To get the Point Matrix)
        const serialDoc = await db.collection('serials').doc(serialId).get();
        if (!serialDoc.exists) {
            return { success: false, error: "Serial no encontrado" };
        }
        const serialData = serialDoc.data() as Serial;
        const pointMatrix = serialData.pointMatrix;

        // Map for quick points lookup
        const pointsMap = new Map<number, number>();
        pointMatrix.forEach(pm => pointsMap.set(pm.position, pm.points));

        // We will process updates per Category Leaderboard to maintain boundaries
        // group results by category
        const categoryMap = new Map<string, typeof results>();
        results.forEach(res => {
            if (!categoryMap.has(res.categoryId)) {
                categoryMap.set(res.categoryId, []);
            }
            categoryMap.get(res.categoryId)!.push(res);
        });

        const batch = db.batch();
        const now = new Date().toISOString();

        // 2. Mark event as 'results_published' (using status or a new flag, let's use a new flag for safety)
        const eventRef = db.collection('events').doc(eventId);
        batch.update(eventRef, { resultsPublishedAt: now });

        // 3. Process each Category Leaderboard Sync (NATIVELY IN MEMORY)
        for (const [categoryId, stageResults] of Array.from(categoryMap.entries())) {
            const leaderboardId = `${serialId}_${categoryId}`;
            const leaderboardRef = db.collection('serial_leaderboards').doc(leaderboardId);
            
            // Read current leaderboard state
            const leaderboardDoc = await leaderboardRef.get();
            let currentRows: SerialLeaderboardRow[] = [];
            
            if (leaderboardDoc.exists) {
                currentRows = (leaderboardDoc.data() as SerialLeaderboard).rows || [];
            }

            // Map current rows for easy mutation
            const userRowMap = new Map<string, SerialLeaderboardRow>();
            currentRows.forEach(r => userRowMap.set(r.userId, r));

            // Apply new results
            stageResults.forEach(res => {
                const pointsEarned = pointsMap.get(res.position) || 0; // Default to 0 if outside matrix
                
                if (userRowMap.has(res.userId)) {
                    // Update existing
                    const row = userRowMap.get(res.userId)!;
                    row.totalPoints += pointsEarned;
                    row.stagesCompleted += 1;
                    row.lastStagePosition = res.position;
                    // Add time if available for tie-breaker
                    if (res.totalChipTimeMs) {
                        row.totalChipTimeMs = (row.totalChipTimeMs || 0) + res.totalChipTimeMs;
                    }
                    row.userName = res.userName; // Keep updated
                } else {
                    // Create new row
                    userRowMap.set(res.userId, {
                        userId: res.userId,
                        categoryId: res.categoryId,
                        totalPoints: pointsEarned,
                        overallPosition: 0, // Will be calculated next
                        stagesCompleted: 1,
                        lastStagePosition: res.position,
                        totalChipTimeMs: res.totalChipTimeMs,
                        userName: res.userName,
                        categoryName: res.categoryName
                    });
                }
            });

            // Re-calculate positions and desempates (Tie-Breaker Rules FRD 8.1)
            let updatedRows = Array.from(userRowMap.values());
            updatedRows.sort((a, b) => {
                // 1. Primary: Puntos Totales (Descendente)
                if (b.totalPoints !== a.totalPoints) {
                    return b.totalPoints - a.totalPoints;
                }
                // 2. Secondary Tie-breaker: Última posición lograda (Ascendente - menor es mejor)
                if (a.lastStagePosition && b.lastStagePosition && a.lastStagePosition !== b.lastStagePosition) {
                    return a.lastStagePosition - b.lastStagePosition;
                }
                // 3. Tertiary Tie-breaker: Tiempo total de chip (Ascendente - menor es mejor)
                if (a.totalChipTimeMs && b.totalChipTimeMs && a.totalChipTimeMs !== b.totalChipTimeMs) {
                    return a.totalChipTimeMs - b.totalChipTimeMs;
                }
                return 0; // Absolute tie
            });

            // Assign numerical positions
            updatedRows.forEach((row, index) => {
                row.overallPosition = index + 1;
            });

            // Write back to DB
            const newLeaderboardData: SerialLeaderboard = {
                id: leaderboardId,
                serialId: serialId,
                categoryId: categoryId,
                rows: updatedRows,
                lastCalculatedAt: now
            };

            batch.set(leaderboardRef, newLeaderboardData);
        }

        // Execute atomic commit
        await batch.commit();

        return { success: true };

    } catch (error) {
        console.error("Error publishing stage results:", error);
        return { success: false, error: "Internal Server Error" };
    }
}
