# Validación Internacional y Tracking de Intentos de Registro Fraudulentos

**Fecha:** 2024-05-18
**Tipo de Cambio:** Nueva Funcionalidad / Seguridad / Analítica de Datos
**Estado:** Implementado

---

## 1. Contexto de Negocio
* **Historia de Usuario:** Como plataforma, queremos evitar el registro de bicicletas robadas internacionalmente y trackear silenciosamente (IP/User) quién está intentando registrar unidades bloqueadas para futuros mapas de calor de criminalidad.
* **El Problema/Necesidad:** Crecimiento en el intento de "blanqueo" de bicicletas. Se necesitaba un mecanismo de defensa activa (Bike Index) y pasiva (Logs de fraude para el Admin Dashboard) para proteger la validez del "Certificado de Propiedad" emitido por BiciRegistro.

## 2. Arquitectura y Diseño Técnico
* **Flujo de Ejecución:** `validateSerialNumberAction` (o form submit en `registerBike` y `registerBikeWizardAction`) -> Valida Localmente -> Si no existe localmente, valida en BikeIndex -> Si falla cualquiera de las dos validaciones, bloquea el registro e invoca asíncronamente (fire-and-forget) a `logFraudAttempt()` -> Retorna mensaje de error a la UI.
* **Modelos de Datos:** Nueva colección de Firestore `fraud-attempts` documentada en `src/lib/types.ts` bajo el tipo `FraudAttemptLog`.
* **Integraciones:** 
  * API Pública de Bike Index. 
  * Función `headers()` de Next.js para extraer `x-forwarded-for` (IP) del cliente.

## 3. Detalles de Implementación (El Bisturí)
* **Archivos Modificados:**
  * `src/lib/types.ts`: Agregado el tipo `FraudAttemptLog` para tipado estricto.
  * `src/lib/actions/bike-actions.ts`: 
    * Se inyectó la función interna `checkBikeIndexForTheft` para realizar fetch cacheado a la API internacional.
    * Se inyectó la función interna asíncrona `logFraudAttempt` que guarda un registro pasivo en Firestore sin usar `await` en el hilo principal.
    * Alteración de las 3 vías de registro (`registerBike`, `registerBikeWizardAction` y la validación en vivo `validateSerialNumberAction`) para implementar la validación dual y el registro de logs si la validación falla.

## 4. Impacto en UI/UX y Reglas de Negocio
* **Reglas de Negocio:** Tolerancia Cero al registro de unidades restringidas, sean de origen local o internacional. El registro silencioso permite inteligencia sin confrontar ni alertar al infractor de que está siendo rastreado.
* **Casos Borde Manejados:** 
  * Si la API de Bike Index falla o demora, la promesa hace `catch` silencioso y retorna falso (fail-open) para no frenar la operativa natural de BiciRegistro.
  * La grabación del log de fraude no bloquea ni ralentiza la respuesta que se le da al cliente.
  * Si el usuario se encuentra detrás de un proxy que oculte la IP, el sistema registra `'unknown'` pero continúa capturando el `userId` y la fecha.

## 5. QA y Plan de Pruebas
* **Criterios de Aceptación Cumplidos:** Bloqueos validados en UI. Logs verificables en la colección `fraud-attempts` a nivel backend.
* **Pruebas de No-Regresión:** Se mantuvo intacta la lógica profunda de gamificación (`awardPoints`) y de desnormalización de datos (`userRef.update`).

## 6. Rollout y Rollback
* **Pasos de Despliegue:** Despliegue estándar (Vercel/Firebase). La colección `fraud-attempts` se auto-generará en la base de datos a la primera inserción. No requiere migración manual.
* **Plan de Reversión:** Eliminar las llamadas a `checkBikeIndexForTheft` y `logFraudAttempt` en `src/lib/actions/bike-actions.ts` y redesplegar.
