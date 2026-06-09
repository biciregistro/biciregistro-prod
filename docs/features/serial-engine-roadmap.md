# Roadmap de Implementación: Motor de Seriales y Campeonatos

Para garantizar un desarrollo modular, proteger el contexto y asegurar la entrega continua del valor de negocio definido en el FRD, dividiremos la implementación en "Épicas" (Phases) y "Tickets" (Tareas Atómicas).

Esta estructura está diseñada para que cualquier agente de IA o desarrollador humano pueda retomar el trabajo con tan solo leer este documento, el `serial-engine-tech-spec.md` y el código del ticket en cuestión.

---

## FASE 1: Data Layer & Core Backend (Foundation)

**Objetivo:** Establecer el contrato de datos estricto y las capacidades de mutación sin tocar la UI.
**Dependencias:** Ninguna.

*   **Ticket 1.1: Inyección Quirúrgica de Tipos**
    *   *Acción:* Modificar `src/lib/types.ts` según el Tech Spec (interfaces `Serial`, `SerialLeaderboard` y modificaciones a `Event` / `EventRegistration`).
    *   *Verificación:* `npx tsc --noEmit` debe pasar limpio en todo el proyecto.
*   **Ticket 1.2: Motor de Asignación Atómica (Bib Service)**
    *   *Acción:* Crear `src/lib/actions/serial-bib-service.ts`.
    *   *Scope:* Implementar la lógica de consulta histórica y extracción centralizada usando `FieldValue.increment(1)` en el contador global del Serial (`serial_bib_counters`).
*   **Ticket 1.3: Server Actions de Creación de Campeonato**
    *   *Acción:* Crear `src/lib/actions/serial-actions.ts`.
    *   *Scope:* Implementar `createSerialWithStagesAction`. Debe contener la validación (Zod) y la transacción multi-documento (`WriteBatch`) que crea el padre `Serial` y los hijos `Event` vinculados por el `serialId`.

---

## FASE 2: Interfaz Organizador B2B (Creación de Seriales)

**Objetivo:** Construir la UI que consume los Server Actions de la Fase 1.
**Dependencias:** Fase 1 completada.

*   **Ticket 2.1: Router & Contenedor B2B**
    *   *Acción:* Añadir CTA "Crear Campeonato" en `src/components/ong/ong-dashboard-tabs.tsx` y crear la ruta `/src/app/(protected)/dashboard/ong/serials/create/page.tsx`.
*   **Ticket 2.2: Wizard Form (State Management)**
    *   *Acción:* Crear `src/components/ong/serial-wizard/`.
    *   *Scope:* Implementar el shell del formulario, `react-hook-form` con Zod schema extendido y el flujo entre los 3 pasos.
*   **Ticket 2.3: Sub-Componentes del Wizard**
    *   *Acción:* Implementar `StepSerialGeneralInfo`, `StepSerialStagesStructure` (con `useFieldArray`) y `StepConfirmation`.
    *   *Integración:* Conectar el Wizard con el Server Action `createSerialWithStagesAction` de la Fase 1 y testear flujo completo (E2E básico B2B).

---

## FASE 3: Interfaz Pública B2C y Flujo de Cobro Seguro

**Objetivo:** Mostrar los campeonatos al público y blindar la asignación de números en el webhook de MP.
**Dependencias:** Fase 1 completada.

*   **Ticket 3.1: Inyección del Fallback en Webhook (Crítico)**
    *   *Acción:* Modificar `src/app/api/webhooks/mercadopago/route.ts`.
    *   *Scope:* Integrar la invocación al `SerialBibService` (Ticket 1.2) dentro de un estricto `try-catch` antes del guardado del boleto. **NO tocar validación MP.**
*   **Ticket 3.2: Landing Page Pública del Campeonato**
    *   *Acción:* Crear `/src/app/(public)/serial/[slug]/page.tsx`.
    *   *Scope:* Renderizar `HeroBannerSerial`, reutilizar `SponsorsCarousel` y construir `StagesFeed` (reutilizando EventCards). El Leaderboard se deja como mock temporal.
*   **Ticket 3.3: Dashboard del Competidor (Carril y Ficha)**
    *   *Acción:* Modificar el Dashboard público B2C para inyectar "Mis Seriales".
    *   *Acción:* Crear ruta privada `/src/app/(protected)/dashboard/serial/[serialId]/page.tsx` para mostrar la Ficha Fija y los carriles de progreso del ciclista.

---

## FASE 4: Procesamiento de Resultados IA & Leaderboard (Incrementales)

**Objetivo:** Cerrar el ciclo competitivo procesando resultados e integrando el recálculo asíncrono.
**Dependencias:** Fases 1, 2 y 3.

*   **Ticket 4.1: Server Action: Cálculo de Leaderboard Síncrono**
    *   *Acción:* Expandir `src/lib/actions/serial-actions.ts`.
    *   *Scope:* Implementar `calculateLeaderboardService` (procesamiento nativo de NodeJS, desempates y sobreescritura de `serial_leaderboards`).
*   **Ticket 4.2: Componente Importación IA (Fallback UI)**
    *   *Acción:* Clonar `bulk-import-modal.tsx` hacia `results-import-modal.tsx`.
    *   *Scope:* Implementar el pipeline de carga, consulta LLM y renderizado de la tabla de "Auditoría Humana" (Validación/Errores en rojo).
*   **Ticket 4.3: Conexión Frontend y Leaderboard Real**
    *   *Acción:* Actualizar el Endpoint final en el modal para ejecutar el guardado y despachar el cálculo (Ticket 4.1).
    *   *Acción:* Conectar la Landing Page (Ticket 3.2) y el Modal de Puntuación (Ticket 3.3) a la colección real de Firestore `serial_leaderboards`.

---

## FASE 5: Gobernanza y Gamificación (Incrementales)

**Objetivo:** Refinamientos de producto y control de daños B2B.

*   **Ticket 5.1: Filtro de Co-Organizadores (Sanitizador)**
    *   *Acción:* Modificar Server Action de actualización de eventos.
    *   *Scope:* Interceptar payload, leer sesión, y si es co-organizador, aplicar `zod.omit()` para descartar datos financieros/estructurales.
*   **Ticket 5.2: Inyección de Gamificación (Confetti & B-Coins)**
    *   *Acción:* Lógica de validación en UI para checar rango final del usuario. Disparar efecto reutilizando `src/lib/confetti.ts` y llamar al endpoint base de B-Coins.

---

### ¿Cómo protege esto el contexto?

*   **Progreso Atómico:** Un nuevo agente o desarrollador puede leer este documento y decir: *"Voy a implementar el Ticket 2.2"*. El agente leerá las dependencias (Tickets 1.1 y 1.3), revisará el `Tech Spec` y sabrá exactamente qué archivos tocar sin intentar reescribir todo el sistema.
*   **Aislamiento de Riesgo:** El Ticket 3.1 (Webhook) y el Ticket 1.1 (Tipos) están en etapas tempranas. Se prueban y asientan antes de enredarnos con la UI compleja de React.
*   **Trazabilidad Continua:** Cada ticket puede marcarse como completado. Si el contexto se pierde por límite de tokens, el agente solo necesita hacer un `cat docs/features/serial-engine-roadmap.md` para saber dónde nos quedamos y qué falta.