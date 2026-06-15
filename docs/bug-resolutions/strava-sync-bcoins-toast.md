# Bug Resolution: Strava Sync B-coins Toast & Confetti

## 1. Contexto de Negocio
**Historia de Usuario:** Como ciclista, al sincronizar mis kilómetros de Strava, el sistema muestra los kilómetros sincronizados en lugar de los B-coins ganados, y falta la celebración visual (confeti), lo cual reduce el impacto de gamificación esperado.
**Problema:** Mensaje incorrecto de validación (KMs en vez de B-coins) en la UI y ausencia de feedback positivo visual.

## 2. Diseño Técnico
- Se extrae el cálculo final de los B-coins (`pointsEarned`) generado dentro de la transacción de Firebase en `strava-actions.ts` para que esté disponible en el objeto de retorno (`pointsAdded`).
- Se ajusta la cadena `message` construida en el backend para reportar explícitamente los "B-coins".
- Se actualiza la interfaz `StravaSyncCardProps` en la tarjeta de front-end para aceptar la métrica de `pointsAdded`.
- Se importa y dispara `canvas-confetti` en la función `handleSync` del lado del cliente tras validar que la sincronización devolvió un resultado exitoso.

## 3. Detalles de Implementación
**Archivos Modificados:**
- `src/lib/actions/strava-actions.ts`:
  - Modificada función `syncStravaActivities`.
  - Variable `finalPointsEarned` extraída de la transacción para reemplazar el texto de retorno.
- `src/components/dashboard/strava-sync-card.tsx`:
  - Importación de `canvas-confetti`.
  - Inserción de la lógica `confetti(...)` si `result.success === true`.

## 4. QA
**Criterios de Aceptación:**
- El Toast de éxito debe decir "Sincronización Exitosa! Sumaste [X] B-coins a tu wallet".
- Debe aparecer animación de confeti.
- El balance total de B-coins en la tarjeta de Mis Recompensas debe incrementar correctamente.
**Pruebas de no-regresión:**
- Segunda sincronización consecutiva sin nuevas rodadas: Muestra mensaje "Tu cuenta ya está al día" sin confeti (Success = false, control preventivo).
- Conectar Strava por primera vez en onboarding: Mantiene funcionalidad de confeti principal íntegra.

## 5. Despliegue
- Integración de la rama `feature/bugfix-strava-bcoins-toast` hacia `develop`.
- Despliegue automático a entorno de Staging (`biciregistro-dev`).
- Validar comportamiento local y en Staging antes de promoción a `main`.