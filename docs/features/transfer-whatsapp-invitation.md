# Mejora de Fricción: Invitación por WhatsApp en Transferencia

**Fecha:** 2024-05-22
**Tipo de Cambio:** Nueva Funcionalidad / UX
**Estado:** Implementado

---

## 1. Contexto de Negocio
* **Historia de Usuario:** Como usuario, quiero poder invitar por WhatsApp a un comprador a registrarse cuando intento transferirle mi bicicleta y su correo no existe, para evitar fricción en el proceso de venta o cesión.
* **El Problema/Necesidad:** Anteriormente, si el correo electrónico del destinatario no estaba registrado en BiciRegistro.mx, el sistema simplemente mostraba un error. Esto generaba fricción ya que el usuario vendedor no tenía una forma directa de invitar al comprador a unirse a la plataforma para completar la transferencia.

## 2. Arquitectura y Diseño Técnico
* **Flujo de Ejecución:** 
    1. El usuario intenta transferir una bicicleta vía el Server Action `transferOwnership`.
    2. El Server Action verifica si el usuario existe. Si no existe, devuelve un objeto con `userNotFound: true` y los datos necesarios para la invitación (marca, modelo, nombre del emisor y link de comunidad).
    3. El componente cliente `TransferOwnershipForm` detecta este estado y revela condicionalmente un campo de WhatsApp y un botón de invitación.
    4. Al hacer clic en "Invitar", se abre una pestaña de WhatsApp Web/App con un mensaje pre-formateado y codificado.
* **Modelos de Datos:** No se alteraron esquemas de base de datos. Se mejoró la respuesta de la interfaz para manejar estados de error suaves.
* **Integraciones:** API de WhatsApp (`https://wa.me/`).

## 3. Detalles de Implementación (El Bisturí)
* **Archivos Modificados:**
  * `src/lib/actions/bike-actions.ts`: Se actualizó la función `transferOwnership` para capturar el caso de "usuario no encontrado" y devolver metadatos de invitación dinámicos basados en la comunidad del remitente.
  * `src/components/bike-components/transfer-ownership-form.tsx`: Se implementó la lógica de UI para mostrar el campo de invitación y la construcción del mensaje de WhatsApp.

## 4. Impacto en UI/UX y Reglas de Negocio
* **Cambios Visuales:** El modal de transferencia ahora es reactivo a los errores. En caso de que el destinatario no exista, el modal se expande para ofrecer la opción de invitación en lugar de simplemente fallar.
* **Casos Borde Manejados:** 
    * Se utiliza el link de comunidad/invitación personalizado si el remitente pertenece a una comunidad de ONG.
    * Se limpia el número de teléfono para asegurar compatibilidad con la URL de WhatsApp.

## 5. QA y Plan de Pruebas
* **Criterios de Aceptación Cumplidos:**
    - [x] El modal muestra un input de WhatsApp si el correo no existe.
    - [x] El mensaje de WhatsApp incluye marca, modelo y link correcto.
    - [x] Se puede reintentar la transferencia después de invitar.
* **Pruebas de No-Regresión (Zero-Regressions):**
    - [x] Las transferencias entre usuarios existentes siguen funcionando correctamente.
    - [x] La trazabilidad legal (`chainOfCustody`) se mantiene intacta en transferencias exitosas.

## 6. Rollout y Rollback
* **Pasos de Despliegue:** Despliegue estándar.
* **Plan de Reversión:** Revertir los cambios en `src/components/bike-components/transfer-ownership-form.tsx` y `src/lib/actions/bike-actions.ts`.
