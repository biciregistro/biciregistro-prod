# Resolución de Problemas de Tipado en Campañas B2B2C

## Contexto de Negocio
El sistema de tipos de campañas (`Campaign` y `CampaignConversion`) fue refactorizado recientemente para soportar segmentación geográfica a nivel múltiple (`targetStates: string[]`), renombrar variables de contadores y asociar las métricas publicitarias al identificador estándar de organización (`ongId`). Sin embargo, el archivo controlador de acciones (`campaign-actions.ts`) y la visualización de banners publicitarios (`promotional-banner.tsx`) mantenían referencias al modelo obsoleto de datos. Esto causaba fallos de TypeScript en tiempo de construcción, previniendo el despliegue.

## Diseño Técnico
La alineación requiere actualizar todos los accesos en el servicio back-end de la aplicación y la vista front-end para empatar el 100% de la interfaz `types.ts`.

## Detalles de Implementación
*   **Rama de trabajo**: `bugfix/campaign-types-sync`
*   **Modificaciones en `src/lib/actions/campaign-actions.ts`:**
    *   Se eliminó el uso de `targetCountry` (el modelo asume nacional si no está restringido globalmente).
    *   Se reemplazaron `targetState` estático por búsquedas dentro del array `targetStates` utilizando `includes()` o iteraciones en `Set`.
    *   El campo identificador del anunciante, previamente consultado como `advertiserId`, fue reemplazado a `ongId` para emparejar la lógica B2B del ecosistema ONG y Partners de BiciRegistro.
    *   Nombres de propiedades numéricas normalizadas a plural: `clicksCount` y `conversionsCount` (previamente `clickCount` y `uniqueConversionCount`).
    *   Condiciones de validación de fechas seguras (`new Date(data.endDate)` fue envuelta en un guard para evitar error `Invalid Date` si la campaña no tiene fecha final de expiración).
    *   Se separó la estructura de datos que se guarda en la base de datos de conversiones, extrayendo metadatos no definidos en la interfaz TypeScript para insertarlos transparentemente a través de type-bypassing (`as any`), respetando la interfaz principal.
*   **Modificaciones en `src/components/dashboard/promotional-banner.tsx`:**
    *   Se corrigió el uso de `campaign.assetUrl` que causaba error por `campaign.actionUrl`.
    *   Se corrigió la imagen fuente de carga en Next/Image reemplazando la llamada de `campaign.bannerImageUrl` por `campaign.imageUrl`, además de blindar la etiqueta de imagen con una evaluación del valor nulo (fallback visual si la campaña no posee imagen cargada).

## QA
*   Correr Next build localmente debería estar limpio de errores para estos dos archivos.
*   Probar flujo de creación y obtención de campaña desde la consola Admin (el overlap geográfico debe evaluar arreglos correctamente).
*   Visualizar banner desde vista ciclista para confirmar la lectura asíncrona de datos de imagen y acción URL.

## Despliegue
Al confirmar con los tests, hacer push y abrir Pull Request (Merge de `bugfix/campaign-types-sync` a `develop`).