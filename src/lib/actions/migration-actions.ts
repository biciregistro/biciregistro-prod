'use server';

import { adminDb } from '@/lib/firebase/server';
import { getAuthenticatedUser } from '@/lib/data'; // Corregido: importación correcta

/**
 * Server Action para Desnormalización de Datos para Analíticas Cruzadas
 * 
 * Se ejecuta dentro del entorno seguro de Next.js, por lo que tiene
 * acceso automático a las credenciales de Firebase Admin (ya sea en local
 * o inyectadas por App Hosting).
 */
export async function runAnalyticsDenormalizationMigration(isDryRun: boolean = true) {
  try {
    // 1. Verificación estricta de seguridad
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'admin') {
      throw new Error('No autorizado. Solo administradores pueden ejecutar migraciones.');
    }

    console.log(`\n🚀 INICIANDO MIGRACIÓN (Server Action) ${isDryRun ? '[MODO DRY-RUN]' : '[ESCRITURA REAL]'}`);
    
    const usersRef = adminDb.collection('users');
    const bikesRef = adminDb.collection('bikes');

    console.log('1️⃣ Descargando catálogo de usuarios...');
    const usersSnapshot = await usersRef.get();
    const usersMap = new Map();
    
    usersSnapshot.forEach(doc => {
      usersMap.set(doc.id, doc.data());
    });
    console.log(`✅ ${usersMap.size} usuarios cargados.`);

    const userGarageSummary = new Map<string, {
      brands: Set<string>;
      modalities: Set<string>;
      hasStolen: boolean;
    }>();

    console.log('2️⃣ Procesando bicicletas y cruzando datos...');
    const bikesSnapshot = await bikesRef.get();
    
    let batch = adminDb.batch();
    let operationsCount = 0;
    let bikesUpdatedCount = 0;
    let usersUpdatedCount = 0;

    const commitBatchIfNeeded = async () => {
      if (operationsCount >= 450) {
        if (!isDryRun) {
          await batch.commit();
          batch = adminDb.batch();
        }
        operationsCount = 0;
      }
    };

    // --- FASE A: ACTUALIZAR BICICLETAS ---
    for (const doc of bikesSnapshot.docs) {
      const bike = doc.data();
      const userId = bike.userId;
      const owner = usersMap.get(userId);

      if (!userGarageSummary.has(userId)) {
        userGarageSummary.set(userId, { brands: new Set(), modalities: new Set(), hasStolen: false });
      }
      const summary = userGarageSummary.get(userId)!;
      if (bike.make) summary.brands.add(bike.make);
      if (bike.modality) summary.modalities.add(bike.modality);
      if (bike.status === 'stolen') summary.hasStolen = true;

      if (owner) {
        const bikeUpdateData: any = {};
        let needsUpdate = false;

        if (owner.gender && bike.ownerGender !== owner.gender) { bikeUpdateData.ownerGender = owner.gender; needsUpdate = true; }
        if (owner.city && bike.ownerCity !== owner.city) { bikeUpdateData.ownerCity = owner.city; needsUpdate = true; }
        if (owner.state && bike.ownerState !== owner.state) { bikeUpdateData.ownerState = owner.state; needsUpdate = true; }
        if (owner.country && bike.ownerCountry !== owner.country) { bikeUpdateData.ownerCountry = owner.country; needsUpdate = true; }
        if (owner.birthDate && bike.ownerBirthDate !== owner.birthDate) { bikeUpdateData.ownerBirthDate = owner.birthDate; needsUpdate = true; }

        if (needsUpdate) {
          batch.update(doc.ref, bikeUpdateData);
          operationsCount++;
          bikesUpdatedCount++;
          await commitBatchIfNeeded();
        }
      }
    }

    // --- FASE B: ACTUALIZAR USUARIOS ---
    for (const [userId, summary] of userGarageSummary.entries()) {
      const userRef = usersRef.doc(userId);
      const owner = usersMap.get(userId);

      if (owner) {
        const ownedBrandsArray = Array.from(summary.brands);
        const ownedModalitiesArray = Array.from(summary.modalities);

        const needsUpdate = 
          JSON.stringify(owner.ownedBrands) !== JSON.stringify(ownedBrandsArray) ||
          JSON.stringify(owner.ownedModalities) !== JSON.stringify(ownedModalitiesArray) ||
          owner.hasStolenBikes !== summary.hasStolen;

        if (needsUpdate) {
          const userUpdateData = {
            ownedBrands: ownedBrandsArray,
            ownedModalities: ownedModalitiesArray,
            hasStolenBikes: summary.hasStolen
          };

          batch.update(userRef, userUpdateData);
          operationsCount++;
          usersUpdatedCount++;
          await commitBatchIfNeeded();
        }
      }
    }

    // --- FASE C: COMMIT FINAL ---
    if (operationsCount > 0 && !isDryRun) {
      await batch.commit();
    }

    const resultMessage = `Migración completada. Bicicletas: ${bikesUpdatedCount}, Usuarios: ${usersUpdatedCount}. DryRun: ${isDryRun}`;
    console.log(resultMessage);
    
    return { success: true, message: resultMessage };

  } catch (error: any) {
    console.error('❌ ERROR DURANTE LA MIGRACIÓN:', error);
    return { success: false, message: error.message || 'Error desconocido' };
  }
}
