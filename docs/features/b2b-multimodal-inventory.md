# Carga Masiva de Inventario Multimodal (B2B Onboarding)

**Fecha:** 2025-05-22
**Tipo de Cambio:** Nueva Funcionalidad
**Estado:** Implementado

---

## 1. Contexto de Negocio
* **Historia de Usuario:** Como usuario ONG (Tienda o Organización), quiero cargar mi inventario de bicicletas mediante archivos (CSV/Excel) o fotos/PDFs de facturas para registrarlas masivamente sin captura manual, permitiendo que nazcan blindadas en el ecosistema.
* **El Problema/Necesidad:** El registro manual 1-a-1 es una barrera de entrada para tiendas que manejan grandes volúmenes de bicicletas. Automatizar este proceso mediante IA permite que las bicicletas tengan una identidad digital desde el punto de venta, facilitando su posterior transferencia al cliente final.

## 2. Arquitectura y Diseño Técnico
* **Flujo de Ejecución:** 
    1. El usuario carga un archivo en el `BulkImportModal`.
    2. El cliente pre-procesa el archivo: los CSV se leen como texto plano; los PDFs e Imágenes se convierten a Base64.
    3. Se invoca el Server Action `parseMultimodalInventoryAction`.
    4. La IA (Gemini 3.1 Flash) analiza el contenido y devuelve un JSON estructurado bajo un esquema de Zod.
    5. El usuario valida y edita los datos en una tabla UI (Human-in-the-loop).
    6. Se ejecuta `registerBulkBikesAction` que realiza un `Batch Write` en Firestore con estatus `inventory`.
* **Modelos de Datos:** 
    * Se extendió el tipo `BikeStatus` para incluir el valor `'inventory'`.
    * Las bicicletas en este estado representan stock de tienda y no propiedad activa de un ciclista.
* **Integraciones:** Google Gemini (vía Genkit) para procesamiento de lenguaje natural y visión artificial.

## 3. Detalles de Implementación (El Bisturí)
* **Archivos Creados:**
  * `src/lib/actions/ai-inventory-actions.ts`: Lógica de extracción con IA y persistencia en lote (Batches).
  * `src/components/ong/bulk-import-modal.tsx`: Interfaz de usuario para el flujo de carga, análisis y edición.
* **Archivos Modificados:**
  * `src/lib/types.ts`: Se agregó `'inventory'` a la unión `BikeStatus`.
  * `src/components/ong/ong-dashboard-tabs.tsx`: Inserción del modal en la pestaña de "Mi Garaje" de la ONG.
  * `src/components/bike-card.tsx`: Adición de estilos visuales (`badge`, `icon`) para el estatus de inventario.

## 4. Impacto en UI/UX y Reglas de Negocio
* **Cambios Visuales:** 
    * Botón de "Importación Masiva" en el panel de ONG.
    * Tabla de revisión interactiva post-análisis.
    * Badge de estatus "En Inventario" (Gris) en las tarjetas de bicicleta.
* **Casos Borde Manejados:** 
    * Si la IA no detecta bicicletas, se informa al usuario.
    * Los números de serie duplicados se omiten automáticamente durante el registro masivo para evitar colisiones.
    * Soporte multimodal (Texto, PDF, Imagen).

## 5. QA y Plan de Pruebas
* **Criterios de Aceptación Cumplidos:**
    * Extracción exitosa desde imagen de lista impresa.
    * Extracción exitosa desde archivo CSV con encabezados aleatorios.
    * Edición manual de celdas en la tabla de revisión.
    * Persistencia correcta en Firestore con estatus `inventory`.
* **Pruebas de No-Regresión:** 
    * El flujo de registro individual (`RegisterWizard`) sigue funcionando sin cambios.
    * El flujo de "Express Register" mantiene su integridad y asignación de puntos.

## 6. Rollout y Rollback (Despliegue y Reversión)
* **Pasos de Despliegue:** Despliegue estándar. Requiere que la API Key de Google GenAI esté activa en el entorno de producción.
* **Plan de Reversión:** Descomentar o eliminar la invocación de `<BulkImportModal />` en `src/components/ong/ong-dashboard-tabs.tsx`.
