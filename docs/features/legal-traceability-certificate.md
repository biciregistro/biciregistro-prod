# Certificado de Propiedad con Trazabilidad Legal

**Fecha:** 2024-05-18
**Tipo de Cambio:** Mejora de Seguridad (Legal / Documental)
**Estado:** Implementado

---

## 1. Contexto de Negocio
* **Historia de Usuario:** Como usuario, quiero que mi certificado de propiedad muestre los metadatos exactos de toda la cadena de custodia (dueños previos y actuales), para que la prueba documental tenga valor legal preciso (Especialmente útil para bicicletas originadas en tiendas/ONGs mediante carga masiva que luego son revendidas).
* **El Problema/Necesidad:** Anteriormente, el certificado PDF siempre extraía la fecha de creación original (`createdAt`) y la IP original de registro (`registrationIp`). Al usar cargas masivas (Bulk Import), la IP guardada era "bulk_upload" y se perdía la información del primer registrador. Si la bicicleta se transfería, se perdía el rastro inmutable de quién la transfirió, a qué precio y dónde.

## 2. Arquitectura y Diseño Técnico
* **Flujo de Ejecución:** Durante una transferencia (`transferOwnership`), capturamos la IP del dispositivo del vendedor, su ubicación, su nombre real y el monto de la venta. Agrupamos esto en un objeto `CustodyEvent` y lo inyectamos al arreglo `chainOfCustody` en el documento de la bicicleta. Al generar el PDF, iteramos sobre este arreglo para pintar la historia completa.
* **Modelos de Datos:** El esquema `Bike` (en `src/lib/types.ts`) se expandió para incluir un arreglo `chainOfCustody?: CustodyEvent[]`. Además, se añadieron los campos `originalOwnerId`, `originalOwnerName`, y `originalOwnerLocation` para preservar la identidad del primer creador.

## 3. Detalles de Implementación (El Bisturí)
* **Archivos Modificados:**
  * `src/lib/types.ts`: Añadido el tipo `CustodyEvent` y los campos de creador original a `Bike`.
  * `src/lib/actions/ai-inventory-actions.ts`: En `registerBulkBikesAction`, inyectado `getClientIp()` y consultas al perfil del usuario ONG para poblar el snapshot del creador original (`originalOwnerName`, etc.).
  * `src/lib/actions/bike-actions.ts`: Modificadas todas las funciones de registro para guardar el snapshot del creador. Modificado `transferOwnership` para insertar eventos en `chainOfCustody`.
  * `src/components/bike-components/bike-ownership-certificate.tsx`: 
    * El Hash (SHA-256) se mantiene fiel al estado actual, pero se corrigió su diseño visual (separado en un bloque gris con borde punteado).
    * Modificada la vista del PDF para renderizar el bloque "Registro Original" y un bucle que imprime todas las transacciones de "Cambio de Propietario" de forma cronológica.
    * Añadido soporte *Legacy* para imprimir transferencias antiguas que no estaban en el arreglo de custodia.

## 4. Impacto en UI/UX y Reglas de Negocio
* **Reglas de Negocio:** El certificado ahora emula la "factura endosada" del mundo físico. Cada transacción hereda y certifica los datos del dueño anterior, garantizando una cadena de custodia inquebrantable en el ecosistema B2B2C.
* **Cambios Visuales:** El PDF luce más técnico, largo (si tiene muchas transferencias) y formal, dándole un peso pericial superior al Hash criptográfico.

## 5. QA y Plan de Pruebas
* **Criterios de Aceptación Cumplidos:** PDFs de bicicletas masivas muestran correctamente el nombre y ubicación de la ONG creadora, la IP real de la transacción que hizo la ONG hacia el ciclista, y la IP/Ubicación de cualquier transferencia posterior entre ciclistas.
* **Pruebas de No-Regresión:** El renderizado del PDF incluye lógica híbrida para soportar bicicletas viejas que solo tenían los campos de `transferredAt` sin romper el documento.

## 6. Rollout y Rollback
* **Pasos de Despliegue:** Despliegue estándar. (Bases de datos noSQL toleran nuevos campos sin migraciones de esquema).
* **Plan de Reversión:** Ejecutar `git revert` sobre los commits de la rama `feature/legal-traceability-certificate`.
