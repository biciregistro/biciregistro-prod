# Transferencia Comercial y Trazabilidad (Fase 2)

**Fecha:** 2025-05-22
**Tipo de Cambio:** Nueva Funcionalidad / Modificación
**Estado:** Implementado

---

## 1. Contexto de Negocio
* **Historia de Usuario:** Como dueño de una bicicleta (Tienda o Ciclista), quiero transferir la propiedad ingresando el email del destinatario y el monto de la transacción para que el sistema actualice al dueño y registre el volumen económico del ecosistema.
* **El Problema/Necesidad:** Anteriormente, las transferencias no capturaban el valor de mercado. Con la entrada de tiendas (B2B), es vital saber a qué precio se venden las bicicletas para generar reportes de mercado real (MSRP) y volumen transaccionado.

## 2. Arquitectura y Diseño Técnico
* **Flujo de Ejecución:** 
    1. El usuario abre el modal de transferencia.
    2. Ingresa Email del comprador y Monto de Venta.
    3. El Server Action `transferOwnership` busca al usuario por email.
    4. Si existe, inicia un `Firestore Batch`:
        * Actualiza la bicicleta: cambia `userId`, `status` a `'safe'`, actualiza `appraisedValue` con el monto de venta y marca `transferredAt`.
        * Actualiza el perfil del comprador (`ownedBrands`, `ownedModalities`).
        * Crea un registro en la nueva colección `ecosystem-sales`.
* **Modelos de Datos:** 
    * Nueva Colección: `ecosystem-sales` (Campos: `bikeId`, `sellerId`, `buyerId`, `saleAmount`, `make`, `model`, `date`).
    * Actualización en `bikes`: Transición de estado `'inventory'` a `'safe'`.

## 3. Detalles de Implementación (El Bisturí)
* **Archivos Modificados:**
  * `src/lib/actions/bike-actions.ts`: Inyección de lógica de Batch, trazabilidad financiera y actualización de MSRP.
  * `src/components/bike-components/transfer-ownership-form.tsx`: Rediseño del modal para incluir input numérico de `saleAmount` con estilo visual de billetera.

## 4. Impacto en UI/UX y Reglas de Negocio
* **Cambios Visuales:** Nuevo campo "Monto de Venta (Opcional)" con ícono de `Wallet`. Mensaje de error descriptivo si el usuario no tiene cuenta en la plataforma.
* **Reglas de Negocio:** El monto ingresado sobrescribe el `appraisedValue` original de la bicicleta, asumiendo que el precio de venta es el valor de mercado más preciso actualmente.

## 5. QA y Plan de Pruebas
* **Criterios de Aceptación Cumplidos:**
    * Transferencia exitosa entre usuarios existentes.
    * Actualización automática del estatus de la bici de `'inventory'` a `'safe'`.
    * Creación de documento en `ecosystem-sales` solo si el monto es mayor a 0.
* **Pruebas de No-Regresión:** 
    * Las transferencias sin monto (regalos) siguen funcionando y asignando la propiedad correctamente.

## 6. Rollout y Rollback (Despliegue y Reversión)
* **Pasos de Despliegue:** Despliegue estándar a través de `develop`. No requiere migración previa de base de datos ya que Firestore crea colecciones al vuelo.
* **Plan de Reversión:** Revertir los cambios en `src/lib/actions/bike-actions.ts` para eliminar el uso de `Batch` y la escritura en `ecosystem-sales`.
