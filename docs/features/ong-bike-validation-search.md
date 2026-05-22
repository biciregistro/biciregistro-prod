# Buscador y Validación de Series (B2B)

**Fecha:** 2025-05-22
**Tipo de Cambio:** Nueva Funcionalidad
**Estado:** Implementado

---

## 1. Contexto de Negocio
* **Historia de Usuario:** Como dependiente de tienda (ONG), quiero validar el número de serie de una bicicleta que ingresa al taller o mostrador para confirmar que esté en regla, ver su historial de procedencia, y en caso de que esté robada, emitir una alerta al dueño legítimo.
* **El Problema/Necesidad:** Las tiendas de bicicletas son puntos críticos donde el equipo robado intenta reingresar a la economía formal. Proveer a las tiendas con una herramienta oficial de consulta protege a la tienda de comprar/reparar artículos robados y activa la red ciudadana para lograr recuperaciones físicas del ecosistema BiciRegistro.

## 2. Arquitectura y Diseño Técnico
* **Flujo de Ejecución:** El usuario hace clic en el botón de "Validar Serie" en la nueva **Barra de Acciones Rápidas** (fuera de las pestañas) -> Se abre el `BikeValidationModal` -> Ingresa un número de serie -> El Server Action `validateBikeStatusAction` consulta Firestore y reconstruye el historial -> Si es segura, muestra el Timeline de trazabilidad; si es robada, muestra un panel de Alerta Máxima -> Al pulsar "Notificar", `sendShopSightingAlertAction` cruza los datos de la ONG con los del dueño y dispara un correo vía Resend.
* **Modelos de Datos:** Ningún cambio de esquemas, pero se aprovechan los campos `createdAt`, `transferredAt` y el objeto `theftReport` para construir inferencias de tiempo al vuelo.
* **Integraciones:** Resend (Email Provider) para el envío de alertas de avistamiento a través de `sendShopSightingAlertEmail`.

## 3. Detalles de Implementación (El Bisturí)
* **Archivos Creados:**
  * `src/components/ong/bike-validation-modal.tsx`: Componente de UI que actúa como modal de búsqueda y renderiza condicionalmente el panel verde (Historial) o el panel rojo (Robo/Bloqueo).
  * `src/lib/email/templates/shop-sighting-alert.ts`: Plantilla HTML de correo que se envía al ciclista indicándole que su bicicleta fue avistada en una tienda específica.
* **Archivos Modificados:**
  * `src/components/ong/ong-dashboard-tabs.tsx`: Se inyectó una nueva zona de UI llamada "Quick Actions Bar" (Barra de Acciones Rápidas) ubicada inmediatamente debajo del Hero y arriba de los Tabs, para alojar herramientas operativas del mostrador B2B.
  * `src/lib/actions/ong-actions.ts`: Se agregaron los Server Actions `validateBikeStatusAction` y `sendShopSightingAlertAction`.
  * `src/lib/email/resend-service.ts`: Integración del nuevo template y exportación del servicio para el Action.
* **Variables de Entorno (Configuración):** No se requieren nuevas variables. Se reutiliza `RESEND_API_KEY`.

## 4. Impacto en UI/UX y Reglas de Negocio
* **Cambios Visuales:** 
  * Se reorganizó la jerarquía visual del panel B2B para independizar las herramientas operativas de las de gestión de datos.
  * Modal inmersivo con diseño agresivo (rojo brillante, íconos de alerta, texto en mayúsculas) para el escenario de robo, aplicando psicología del color para evitar "errores de dedo" en el taller.
* **Casos Borde Manejados:** 
  * Si la bicicleta no existe, se muestra un *empty state* amistoso.
  * Si la ONG que dispara la alerta no tiene cuenta completa, el correo enviará fallbacks como "Una tienda" o "Ubicación no especificada".

## 5. QA y Plan de Pruebas
* **Criterios de Aceptación Cumplidos:**
    * [x] Buscador por serie integrado en panel B2B.
    * [x] Visualización de historial y estatus para bicicletas en regla (`safe` / `inventory`).
    * [x] Pantalla de bloqueo rojo si la bicicleta es `stolen` con despliegue de detalles del incidente.
    * [x] Función de notificación que dispara correo al dueño legítimo.
* **Pruebas de No-Regresión (Zero-Regressions):** 
    * El widget público de validación de BiciRegistro (que usan usuarios no logueados) no sufrió alteraciones y mantiene su privacidad.

## 6. Rollout y Rollback (Despliegue y Reversión)
* **Pasos de Despliegue:** Despliegue estándar.
* **Plan de Reversión:** Eliminar o comentar la importación de `<BikeValidationModal />` en `src/components/ong/ong-dashboard-tabs.tsx`.
