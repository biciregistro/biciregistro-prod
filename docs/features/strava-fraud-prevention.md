# Feature: Prevención de Fraude en Sincronización Strava

## 1. Contexto de Negocio
**Historia de Usuario:** Como administrador del sistema, quiero validar la telemetría (velocidad y tiempos) de las rodadas importadas desde Strava para detectar automáticamente trayectos realizados en vehículos motorizados y evitar la minería fraudulenta de B-coins.
**Problema:** Ciclistas frecuentemente olvidan apagar el GPS al subir a un automóvil, o existen intentos de hacer trampa para inflar los kilómetros y ganar puntos de gamificación de manera ilegítima.

## 2. Diseño Técnico
- Se implementó un **filtro de matemática determinista** durante la ingesta efímera de actividades (antes de ejecutar la transacción en Firestore).
- **Límites de tolerancia (basado en físicas de ciclismo común y métricas de Strava en m/s):**
  - Velocidad Promedio > 45 km/h (`12.5 m/s`)
  - Velocidad Máxima > 90 km/h (`25.0 m/s`)
- **Idempotencia Estratégica:** Si una actividad supera estos límites, se clasifica como vehículo motorizado y **se agrega de inmediato al historial de IDs procesados** (para evitar re-evaluarla en el futuro y consumir recursos), pero **se omite de la suma de kilómetros válidos**.
- **UX (Fricción Diplomática):** Se modifican las respuestas JSON para que el frontend presente mensajes informativos y asertivos, sin lenguaje acusatorio.

## 3. Detalles de Implementación
**Archivos Modificados:**
- `src/lib/actions/strava-actions.ts`:
  - Se inyecta la validación `isFraudulent` dentro del iterador principal de actividades de la función `syncStravaActivities`.
  - Se declara el nuevo estado local `hasFilteredActivities`.
  - La actualización del documento del usuario se reestructuró levemente para guardar los IDs procesados incluso si ninguna actividad fue válida (debido a que todas fueron vehículos).
  - Se ajustan los mensajes de retorno incorporando la nota diplomática sobre trayectos omitidos.
- `src/components/dashboard/strava-sync-card.tsx`:
  - Se actualiza la firma del tipo de la función de `onSync` en la interfaz `StravaSyncCardProps` para soportar la nueva propiedad opcional `hasFilteredActivities`, manteniendo compatibilidad con el resto del front.

## 4. QA
**Criterios de Aceptación:**
- Trayectos normales (promedio y máxima dentro de límites humanos) procesan exitosamente y arrojan confeti.
- Trayectos de alta velocidad se descartan silenciosamente del contador, muestran mensaje diplomático en el Toast de la UI y no otorgan B-coins.
**Pruebas de no-regresión (Zero-Regressions):**
- El límite diario de kilómetros sigue aplicando y respetándose con las rodadas válidas resultantes.
- El ciclo de vida de conexión y Waitlist permanece inalterado.

## 5. Despliegue
- Se integran los cambios vía pull request. No requiere migración de esquemas en Firebase, ya que los campos requeridos (`processedActivityIds`) ya existen.