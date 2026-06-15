# Feature Update: Integración de Flag Nativo de Strava en Anti-Fraude

## 1. Contexto de Negocio
**Historia de Usuario:** Como administrador, quiero bloquear la asignación de recompensas a actividades que hayan sido marcadas por los algoritmos internos de Strava como fraudulentas (ej. denunciadas por la comunidad o detectadas como e-bikes/vehículos en rutas mecánicas) para sumar una capa adicional de confianza a nuestra economía virtual de B-coins.
**Problema resuelto:** Nuestra validación de telemetría por velocidad es efectiva contra excesos obvios, pero no contra tácticas de "motorización lenta" o fraudes detectados asíncronamente. Depender de la auditoría comunitaria y algorítmica nativa de Strava provee una "Defensa en Profundidad".

## 2. Diseño Técnico
- Se agrega el mapeo del atributo `flagged: boolean` en la interfaz TypeScript `StravaActivity`.
- En el flujo iterativo de `syncStravaActivities`, antes de procesar nuestra telemetría (velocidad promedio/máxima), se incorpora un paso de verificación directa: si `activity.flagged === true`, se determina de inmediato como fraudulenta.
- Esta acción se ejecuta silenciosamente: la actividad se marca en la base de datos de "BiciRegistro" como procesada para no volver a consumirla en ciclos posteriores, y se omite de los contadores finales.

## 3. Detalles de Implementación
**Archivos Modificados:**
- `src/lib/actions/strava-actions.ts`:
  - Se extendió la interfaz `StravaActivity` (línea 31 aprox).
  - En la iteración principal (líneas 189-195), se agregó `activity.flagged === true` como primera condición dentro del bloque `isFraudulent`.
- `docs/features/strava-fraud-prevention.md`: Se anexa este documento como actualización arquitectónica.

## 4. QA
**Criterios de Aceptación:**
- Una actividad que la API de Strava regrese con `"flagged": true` no suma kilómetros válidos a la cuenta del usuario.
- El toast reflejará el texto "Sincronización Parcial" y mostrará la nota diplomática sobre trayectos omitidos.
**Pruebas de no-regresión:**
- Actividades válidas con `"flagged": false` se evalúan normalmente contra nuestro límite local de >90 km/h y, de pasar, se suman correctamente a los B-coins.

## 5. Despliegue
- Integración inmediata. No hay dependencia de terceros más allá de la lectura de un booleano ya provisto por la API estándar v3 de Strava.