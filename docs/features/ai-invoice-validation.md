# Feature: Motor de Validación de Facturas con IA (Sprock)

## 1. Contexto de Negocio
Para fortalecer la certeza jurídica del ecosistema de BiciRegistro y prevenir el fraude en la obtención de recompensas (B-Coins), se ha implementado un motor de validación inteligente llamado **Sprock**. Este motor analiza mediante IA multimodal (Gemini) los comprobantes de propiedad (facturas, tickets, recibos) cargados por los usuarios, asegurando que correspondan a una bicicleta completa y coincidan con los datos registrados de la unidad.

## 2. Diseño Técnico
El sistema actúa como un middleware inteligente en el servidor. El flujo de datos es:
1. El cliente sube el archivo a Firebase Storage.
2. La URL del archivo se envía a la Server Action `updateOwnershipProof`.
3. El servidor invoca a `validateInvoiceWithAIAction`, que descarga el archivo, lo procesa con Genkit/Gemini y evalúa reglas estructurales, semánticas y de consistencia.
4. Si la IA aprueba, se persiste el cambio en Firestore y se otorgan puntos. Si rechaza, se detiene el flujo y se informa el motivo exacto al usuario.

## 3. Detalles de Implementación

### Archivos Modificados:
- **`src/lib/actions/ai-actions.ts`**: Creación de la lógica de validación con el modelo Gemini Flash. Se configuró un prompt robusto con reglas de consistencia de marca/modelo y tolerancia a la ausencia de número de serie.
- **`src/lib/actions/bike-actions.ts`**: Inyección quirúrgica del validador en `updateOwnershipProof`. Limpieza de los métodos `updateBike` y `registerBike` para delegar la carga de facturas exclusivamente al flujo verificado.
- **`src/app/(protected)/dashboard/bikes/[id]/page-client.tsx`**: 
    - Implementación de estados visuales "🤖 Sprock está analizando...".
    - Adición de la funcionalidad de **"Actualizar Documento"** permitiendo corregir archivos previos bajo el mismo esquema de seguridad.
- **`src/components/bike-card.tsx`**: Se comentó el bloque de carga de facturas en el formulario principal para centralizar la lógica en el Pasaporte y evitar riesgos de regresión (Single Point of Failure).

## 4. QA (Plan de Pruebas)
- **Prueba de Rechazo Estructural**: Subir una imagen que no sea un ticket/factura. Resultado esperado: Rechazo por "NOT_AN_INVOICE".
- **Prueba de Rechazo Semántico**: Subir un ticket de compra de accesorios (casco/luces). Resultado esperado: Rechazo por "NO_BICYCLE_FOUND".
- **Prueba de Consistencia**: Subir factura de una marca distinta a la registrada. Resultado esperado: Rechazo por "BRAND_MISMATCH".
- **Prueba de Éxito**: Subir factura válida que coincida semánticamente. Resultado esperado: Éxito, confeti y otorgamiento de puntos.
- **No-Regresión**: Editar datos básicos de la bicicleta (color/año) no debe disparar validaciones de IA ni errores de red.

## 5. Despliegue
- Rollout: Despliegue en rama `feature/ai-invoice-validation` -> Merge a `develop`.
- Rollback: Revertir a la versión anterior de `updateOwnershipProof` en `bike-actions.ts` y descomentar el bloque en `bike-card.tsx`.
