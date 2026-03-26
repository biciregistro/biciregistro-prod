import { adminDb } from '../src/lib/firebase/server';

/**
 * Script de Migración: Desnormalización de Datos para Analíticas Cruzadas
 * 
 * PROPÓSITO:
 * 1. Lee todos los usuarios para obtener sus datos demográficos y de ubicación.
 * 2. Lee todas las bicicletas.
 * 3. Inyecta los datos del usuario (ownerGender, ownerCity, etc.) en cada bicicleta.
 * 4. Calcula el resumen del "garaje" por usuario (marcas, modalidades poseídas).
 * 5. Inyecta el resumen del garaje en el documento de cada usuario.
 * 
 * SEGURIDAD:
 * - Utiliza "Batched Writes" (lotes) de Firestore para garantizar que las operaciones 
 *   no excedan los límites de memoria ni cuelguen la base de datos.
 * - Es idempotente: Se puede correr múltiples veces sin corromper la data.
 * 
 * EJECUCIÓN (Modo Dry-Run recomendado primero):
 * npx tsx --env-file=.env.local scripts/migrate-analytics-denormalization.ts
 */

const DRY_RUN = false; // <-- CAMBIA A FALSE PARA EJECUTAR EN BASE DE DATOS REAL

async function runMigration() {
  console.log(`\n🚀 INICIANDO MIGRACIÓN DE DATOS (Desnormalización) ${DRY_RUN ? '[MODO DRY-RUN]' : '[ESCRITURA REAL]'}`);
  
  try {
    const usersRef = adminDb.collection('users');
    const bikesRef = adminDb.collection('bikes');

    console.log('1️⃣ Descargando catálogo de usuarios...');
    const usersSnapshot = await usersRef.get();
    const usersMap = new Map();
    
    usersSnapshot.forEach(doc => {
      usersMap.set(doc.id, doc.data());
    });
    console.log(`✅ ${usersMap.size} usuarios cargados en memoria.`);

    // Mapas para calcular el resumen del garaje de cada usuario
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

    // Helper para commitear lotes (Firestore permite max 500 ops por lote)
    const commitBatchIfNeeded = async () => {
      if (operationsCount >= 450) {
        if (!DRY_RUN) {
          await batch.commit();
          batch = adminDb.batch(); // Iniciar nuevo lote
        }
        operationsCount = 0;
        console.log(`   ⏳ Lote commiteado...`);
      }
    };

    // --- FASE A: ACTUALIZAR BICICLETAS Y CALCULAR GARAJES ---
    for (const doc of bikesSnapshot.docs) {
      const bike = doc.data();
      const userId = bike.userId;
      const owner = usersMap.get(userId);

      // 1. Acumular datos para el resumen del garaje del usuario
      if (!userGarageSummary.has(userId)) {
        userGarageSummary.set(userId, { brands: new Set(), modalities: new Set(), hasStolen: false });
      }
      const summary = userGarageSummary.get(userId)!;
      if (bike.make) summary.brands.add(bike.make);
      if (bike.modality) summary.modalities.add(bike.modality);
      if (bike.status === 'stolen') summary.hasStolen = true;

      // 2. Preparar actualización de la bicicleta con datos del dueño
      if (owner) {
        const bikeUpdateData: any = {};
        let needsUpdate = false;

        // Solo agregar campos si el usuario los tiene y no están ya actualizados correctamente
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
    console.log(`✅ Fase A completada. ${bikesUpdatedCount} bicicletas preparadas para actualización.`);

    // --- FASE B: ACTUALIZAR USUARIOS CON EL RESUMEN DE SU GARAJE ---
    console.log('3️⃣ Procesando resúmenes de garaje para usuarios...');
    for (const [userId, summary] of userGarageSummary.entries()) {
      const userRef = usersRef.doc(userId);
      const owner = usersMap.get(userId);

      if (owner) {
        const ownedBrandsArray = Array.from(summary.brands);
        const ownedModalitiesArray = Array.from(summary.modalities);

        // Verificamos superficialmente si necesita actualización para evitar escrituras innecesarias
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
    console.log(`✅ Fase B completada. ${usersUpdatedCount} usuarios preparados para actualización.`);

    // --- FASE C: COMMIT FINAL ---
    if (operationsCount > 0 && !DRY_RUN) {
      await batch.commit();
      console.log(`   ⏳ Lote final commiteado...`);
    }

    console.log(`\n🎉 MIGRACIÓN FINALIZADA CON ÉXITO!`);
    console.log(`📊 Resumen:`);
    console.log(`   - Bicicletas analizadas: ${bikesSnapshot.size}`);
    console.log(`   - Bicicletas actualizadas: ${bikesUpdatedCount}`);
    console.log(`   - Usuarios analizados: ${usersMap.size}`);
    console.log(`   - Usuarios actualizados: ${usersUpdatedCount}`);

    if (DRY_RUN) {
      console.log(`\n⚠️ IMPORTANTE: Esto fue un DRY-RUN. No se escribió nada en la base de datos.`);
      console.log(`   Para ejecutar los cambios, cambia 'const DRY_RUN = false' en el script.`);
    }

  } catch (error) {
    console.error('❌ ERROR DURANTE LA MIGRACIÓN:', error);
    process.exit(1);
  }
}

runMigration();