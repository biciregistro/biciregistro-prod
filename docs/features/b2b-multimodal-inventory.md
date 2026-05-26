# Carga Masiva de Inventario B2B (Multimodal)

**Fecha:** 2026-05-22
**Tipo de Cambio:** Nueva Funcionalidad
**Estado:** Implementado

---

## 1. Contexto de Negocio
* **Historia de Usuario:** Como administrador de una ONG/Tienda, quiero subir una foto de mi hoja de inventario físico, un PDF de mi factura, o un CSV, y que el sistema procese automáticamente todas las bicicletas para agregarlas a mi garaje.
* **El Problema/Necesidad:** Cargar bicicletas una por una mediante el flujo estándar era inviable para tiendas que reciben lotes de 20 a 100 bicicletas a la vez. Requeríamos una forma multimodal (OCR/Vision + NLP) para resolver el "Data Entry" manual.

## 2. Arquitectura y Diseño Técnico
* **Flujo de Ejecución:** El usuario sube un archivo (Client Component `BulkImportModal`) -> Se envía como Base64 o Texto a un Server Action (`parseMultimodalInventoryAction`) -> **Genkit + Gemini 1.5 Flash** analiza el documento y devuelve un JSON estructurado -> La UI muestra una tabla editable para revisión -> El usuario confirma y llama a `registerBulkBikesAction` (Batch Write a Firestore).
* **Prevención de Fraude:** Durante la escritura final, cada serial pasa por `validateSerialNumberAction`, cruzando datos localmente y con **Bike Index**. Los seriales robados o duplicados son rechazados silenciosamente en base de datos.

## 3. Detalles de Implementación (El Bisturí)
* **Archivos Creados/Modificados:**
  * `src/components/ong/bulk-import-modal.tsx`: Interfaz de usuario para la carga multimodal. (Modificado en fase 2 para manejar los rechazos visualmente).
  * `src/lib/actions/ai-inventory-actions.ts`: 
    * Prompts de Gemini para extracción de inventario multimodal.
    * (Fase 2): Modificado `registerBulkBikesAction` para retornar el arreglo `rejectedBikes` y sus motivos, en lugar de ignorarlos en silencio.
  * `src/lib/types.ts`: Estados agregados para B2B.

## 4. Impacto en UI/UX y Reglas de Negocio
* **Cambios Visuales:** 
  * Nuevo paso de 'result' en el Modal de Importación Masiva. Si hay rechazos, se muestra una alerta roja con una tabla detallando qué seriales fallaron y por qué (Ej. "Reporte de robo internacional activo").
* **Casos Borde Manejados:** 
  * ¿Qué pasa si el serial es ilegible? Se genera un ID temporal (`PENDING_BULK_xxxx`).
  * ¿Qué pasa si la IA falla o alucina formatos? Zod bloquea la salida y devuelve un error amigable pidiendo reintentar.

## 5. QA y Plan de Pruebas
* **Criterios de Aceptación Cumplidos:** 
  * Lectura de CSV y PDF con éxito.
  * Inserción Batch con IDs correctos de ONG.
  * Intercepción y notificación visual en caso de detectar seriales robados en Bike Index durante la carga masiva.
* **Pruebas de No-Regresión (Zero-Regressions):** Se verificó que este flujo paralelo no ensucie las métricas de usuarios finales (B2C), asignándoles el estado especial `status: 'inventory'`.

## 6. Rollout y Rollback
* **Pasos de Despliegue:** Normal.
* **Plan de Reversión:** Apagar botón de Bulk Import desde el dashboard de ONG.
