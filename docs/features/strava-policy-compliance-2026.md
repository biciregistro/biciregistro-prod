# Cumplimiento Strava API Policy 2026 y Refinamiento UX

**Fecha:** 2024-05-24 (Simulación Junio 2026)
**Tipo de Cambio:** Nueva Funcionalidad / Modificación / Refactor
**Estado:** Implementado

---

## 1. Contexto de Negocio
* **Historia de Usuario:** Como plataforma, necesitamos cumplir estrictamente con las políticas de Strava (Junio 2026) eliminando el almacenamiento crudo de datos y garantizando consentimiento previo, para proteger las credenciales API del negocio. Como ciclista, quiero transparencia sobre mis datos y como administrador, necesito escalar la capacidad de la aplicación justificando la demanda ante Strava.
* **El Problema/Necesidad:** Strava prohibió el entrenamiento de IA y la analítica B2B con sus datos, y deprecó la API base `v3` antigua. Además, el límite estricto de 10 atletas en el "Standard Tier" ocasionaría errores `429` / `403` a nuevos usuarios, dañando la experiencia y retención si no se maneja de forma elegante.

## 2. Arquitectura y Diseño Técnico
* **Flujo de Ejecución:** El usuario aprueba un Modal de Confianza (Sección 2.1) -> Autoriza en Strava -> El Callback evalúa la cuota:
  * *Si hay cupo:* Genera el token, guarda ID y entrega bono inicial.
  * *Si se rebasó el límite:* Intercepta el error y redirige a la lista de espera automática.
  * *En la Sincronización (Modelo Efímero):* Usa `api-v3.strava.com`. Las actividades se descargan a la memoria del server, se calcula la distancia contra un array de `processedActivityIds` para garantizar idempotencia, se actualiza la Wallet y la actividad cruda *se desecha*.
  * *Al desconectar:* Se llama a `oauth/revoke` y se dispara un email automático de confirmación de borrado.
* **Modelos de Datos:** 
  * Se DEPRECÓ la colección `strava_activities` (Para cumplir con la Sección 5.5).
  * En `GamificationProfile`: se agregó `processedActivityIds` (array) y `waitlistStatus` ('pending' | 'invited').
  * En `GamificationSettings` (BD config/gamification): se agregaron `stravaConnectionLimit`, `stravaConnectedCount` y `stravaWaitlistCount` para manejar el límite global.
  * Nueva colección `strava_waitlist` para encolar atletas interesados.
* **Integraciones:** Strava API V3 actualizada (`api-v3.strava.com`), Endpoint `oauth/revoke` y servicio interno de Resend (para confirmaciones).

## 3. Detalles de Implementación (El Bisturí)
* **Archivos Modificados:**
  * `src/lib/gamification/gamification-types.ts`: Adición de campos `processedActivityIds`, contadores y límite de cuota.
  * `src/app/api/auth/strava/callback/route.ts`: Manejo de offset temporal de -7 días (para evitar pérdida de primer historial) y captura del límite con redirección `waitlist_auto`.
  * `src/components/dashboard/strava-sync-card.tsx`: Adición de `AlertDialog` pre-Auth de privacidad, y un estado visual "Lista VIP" manejando la escasez como prueba social positiva.
  * `src/lib/actions/strava-actions.ts`: 
    * Cambio a la nueva URL de API.
    * Eliminación completa de `adminDb.batch()` que inyectaba a la tabla B2B prohibida.
    * Inclusión de array de idempotencia `processedIdsSet` manteniendo últimos 200 registros.
    * Nuevo Server Action `joinStravaWaitlist`.
  * `src/components/admin/gamification/rules-editor.tsx`: Inyección del panel de "Métricas de Capacidad" (Atletas conectados vs. En Lista de Espera) esencial para reportes de escalamiento B2B.

## 4. Impacto en UI/UX y Reglas de Negocio
* **Cambios Visuales:** 
  * Modal de consentimiento claro y conciso antes del flujo OAuth.
  * Menú contextual de Opciones en la tarjeta de conexión (Soporte B-coins y Desconexión).
  * Tarjeta de UI transformada a azul ("Lista VIP") cuando se alcanza el límite.
  * Panel Administrativo en `/admin/gamification` con barras de progreso de cuota de API.
* **Casos Borde Manejados:** 
  * *Race Conditions en Cupo:* Si dos personas terminan el OAuth al mismo tiempo y el contador llega a su límite, el callback evalúa el total global *antes* de proceder, rebotando al último hacia la lista de espera.
  * *Doble Gasto (Idempotencia):* `processedActivityIds` previene que recargas rápidas sumen los kilómetros dos veces en la wallet.

## 5. QA y Plan de Pruebas
* **Criterios de Aceptación Cumplidos:**
  - [x] Modal de Privacidad (Compliance 2026) mostrado antes del Auth.
  - [x] Rodadas no se insertan en tablas secundarias.
  - [x] Confirmación legal por email enviada exitosamente en la desconexión.
  - [x] Sistema de límite de atletas funcional y reflejado en el Dashboard de Admin.
* **Pruebas de No-Regresión (Zero-Regressions):** 
  * Registro de Bici manual y recompensas referidos intactas.
  * Funcionalidad de login persistente protegida.

## 6. Rollout y Rollback
* **Pasos de Despliegue:** 
  * Despliegue de la rama a `main` o al entorno deseado.
  * Ejecutar script de base de datos para inicializar `stravaConnectionLimit: 10`, `stravaConnectedCount: 0`, `stravaWaitlistCount: 0` en `config/gamification`.
  * Opcional: Eliminar la colección antigua `strava_activities` en la consola de Firebase.
* **Plan de Reversión:** Desde el panel admin de Firestore, apagar el toggle `Activar Integración Strava` para ocultar todo el módulo de recompensas externas.
