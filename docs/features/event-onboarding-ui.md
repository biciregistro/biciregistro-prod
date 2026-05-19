# Documentación de Funcionalidad: Checklist de Desbloqueo de Ticket

## 1. Objetivo de Negocio
Sustituir el sistema de "Bloqueo por Desenfoque" (Blur Wall) por un flujo de "Checklist de Requisitos" más amigable y eficiente. El objetivo es permitir que el usuario acceda a su Dashboard de Evento inmediatamente después de la inscripción, pero manteniendo el Código QR bloqueado hasta que cumpla con los requisitos innegociables de seguridad y logística (Pago y Registro de Bicicleta).

## 2. Historia de Usuario
Como ciclista inscrito, quiero ver las tareas pendientes para activar mi ticket de forma clara y sin ventanas emergentes que interrumpan mi experiencia, especialmente en dispositivos móviles.

## 3. Arquitectura de Interfaz (UI)
Se introduce el componente `EventUnlockChecklist`, el cual se renderiza en la parte superior de la página del ticket. 

### Características Clave:
- **Estado Inline:** Los formularios (como el de registro de bicicleta) se despliegan directamente en la página, empujando el contenido hacia abajo en lugar de abrir un modal (`Dialog`).
- **Eliminación de Conflictos:** Al no usar Modales para el registro de bicicleta, se resuelven los problemas de captura de foco (Focus Trap) de Radix UI que afectaban al buscador de modelos de marcas.
- **Feedback en Tiempo Real:** El checklist se actualiza dinámicamente conforme el usuario completa las tareas.

## 4. Lógica de Activación (Server-Side)
La página `/dashboard/events/[id]` evalúa tres condiciones para determinar si el ticket está "Liberado":
1. **Waiver Firmado:** (Requisito previo para llegar a la página).
2. **Pago Completado:** El estatus de pago debe ser `paid` (o el evento debe ser gratuito).
3. **Bicicleta Asignada:** Debe haber un `bikeId` vinculado a la inscripción.

Si alguna condición falla, el Código QR se muestra en escala de grises y con un candado visual, y se presenta el Checklist de tareas.

## 5. Criterios de Aceptación Técnicos
- El componente `TicketBlurWall` y sus referencias deben ser eliminados.
- El `SimpleBikeForm` debe funcionar correctamente dentro del despliegue inline del checklist.
- El buscador de modelos (`ModelCombobox`) debe permitir la entrada de texto sin bloqueos.
- La navegación global (Header y Bottom Nav) debe permanecer funcional y visible en todo momento.

## 6. QA y Pruebas
- **Prueba A:** Usuario sin bici y sin pago -> Ve checklist con 2 tareas.
- **Prueba B:** Usuario con bici pero sin pago -> Ve checklist con 1 tarea (Pago).
- **Prueba C:** Usuario paga y registra bici -> El checklist desaparece y el QR se activa automáticamente.
