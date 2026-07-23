# Registro de Menores y Dependientes: Blueprint de Implementación

## 1. Contexto de Negocio

El sistema actual de Biciregistro opera bajo una arquitectura de "1 Usuario = 1 Participante Adulto", lo que impide legal y técnicamente la inscripción de menores de edad a eventos. Esta funcionalidad introduce la figura del "Tutor" (un usuario adulto) que puede registrar y gestionar perfiles de "Dependientes" (menores) para inscribirlos en eventos que lo permitan, firmando las responsivas en su nombre.

### Historias de Usuario

*   **HU-ONG-01 (Organizador):**
    *   **Dado que** estoy creando o editando un evento en mi panel de control,
    *   **Cuando** accedo a la configuración general,
    *   **Entonces** debo poder activar una opción "Permitir inscripción de menores de edad" para que los tutores puedan registrar a sus hijos.

*   **HU-PARENT-01 (Tutor con cuenta):**
    *   **Dado que** he iniciado sesión y encontré un evento que permite menores,
    *   **Cuando** selecciono la opción "Inscribir a un menor" en la tarjeta de registro,
    *   **Entonces** el sistema debe guiarme a través de una secuencia de pasos (selección de categoría, confirmación de mis datos, registro del menor y firma de responsiva) para completar la inscripción del niño.

*   **HU-PARENT-02 (Tutor sin cuenta):**
    *   **Dado que** soy un usuario nuevo y quiero inscribir a mi hijo en un evento,
    *   **Cuando** hago clic en "Crear cuenta" desde la página del evento,
    *   **Entonces** el sistema debe permitirme registrarme, redirigirme de vuelta al evento y dejarme iniciar el flujo de inscripción del menor.

*   **HU-PARENT-03 (Gestión Post-Registro):**
    *   **Dado que** ya inscribí a mi hijo en un evento,
    *   **Cuando** ingreso a mi panel de control personal ("Mis Eventos"),
    *   **Entonces** debo poder ver el boleto de mi hijo claramente identificado como "Menor: [Nombre del Niño]" y gestionarlo (pagarlo, verlo, etc.) de forma unificada con mis propias inscripciones.

*   **HU-PARENT-04 (Intercambio y Cambio de Bicicletas - Swap Atómico):**
    *   **Dado que** como tutor tengo registradas múltiples bicicletas y tengo inscritos a varios participantes (yo mismo y mis dependientes menores) en el mismo evento,
    *   **Cuando** accedo al boleto de cualquiera de los participantes y elijo la opción "Cambiar Bicicleta",
    *   **Entonces** el sistema debe permitirme seleccionar libremente entre todas mis bicicletas registradas. Si selecciono una libre, se reasigna inmediatamente. Si selecciono una bicicleta ya en uso por otro de mis participantes, el sistema debe abrir un modal de confirmación para realizar un **intercambio atómico (swap)** entre ambos boletos en una sola acción, evitando callejones sin salida y doble asignación.

## 2. Arquitectura y Diseño Técnico

### Flujo de Ejecución y Datos

1.  **Configuración (ONG):** Un `boolean` `allowsMinors` se añade al modelo `Event`. La UI en `/dashboard/ong/events/create` se actualiza con un `Switch` que modifica este valor vía Server Action.
2.  **Renderizado Condicional (UI Pública):** El componente de la tarjeta de registro (`EventRegistrationCard`) leerá la propiedad `event.allowsMinors`.
    *   Si es `true` y el usuario está logueado, muestra un selector de participante (Paso 1: "¿Para quién es la inscripción?").
    *   Al seleccionar "Inscribir a un menor", se muestra el UX Copy de onboarding y se procede al Paso 2 (Opciones del evento).
3.  **Secuencia de Modales (Inscripción):** Al hacer clic en "Continuar Inscripción", se lanza una secuencia controlada de modales:
    *   **Modal 1 (Tutor):** Confirma/captura los datos de emergencia del adulto.
    *   **Modal 2 (Dependiente):** Permite elegir un menor existente o registrar uno nuevo. Los nuevos menores se guardan en una nueva colección `dependents` asociada al `userId` del tutor.
    *   **Modal 3 (Legal):** Muestra una carta responsiva adaptada con texto legal de tutoría y captura la firma digital del adulto.
4.  **Creación del Registro (`Ticket`):** La Server Action de inscripción creará un nuevo documento en la colección `tickets` con los datos del evento, pero incluyendo:
    *   `dependentId`: El ID del menor desde la colección `dependents`.
    *   `tutorId`: El `userId` del adulto que realiza la inscripción.
    *   Los datos de contacto y emergencia serán siempre los del `tutorId`.
5.  **Garage Unificado:** Al asignar una bicicleta al boleto del menor, la UI leerá y escribirá únicamente en el `garage` del `tutorId`.
6.  **Cambio e Intercambio de Bicicletas (Swap Atómico):** Para ofrecer una gestión post-registro libre de fricciones de asignación:
    *   **Estado de Edición (`isEditingBike`):** Cada componente `<EventBikeSelector />` gestiona su estado local de edición. Si una bicicleta ya está asignada, la UI se bloquea en modo solo lectura con un botón "Cambiar". Al hacer clic, se activa el selector.
    *   **Selector Inteligente:** El menú desplegable se alimenta con todas las bicicletas de la cuenta (`userBikes`). Si una bicicleta ya está asignada a otro boleto del mismo tutor en este evento, se le añade un badge visual de `En uso` para mitigar la carga cognitiva y dar claridad al usuario de antemano.
    *   **Modal de Intercambio (UX/UI):** Al seleccionar una bicicleta ocupada, el sistema lanza un diálogo (`AlertDialog`) que explica con claridad el "trueque" atómico que se realizará y las consecuencias en ambos participantes.
    *   **Transaccionalidad en el Backend:** La acción de servidor `swapBikeAssignmentsAction` ejecuta el intercambio en una transacción de Firestore (`runTransaction`) garantizando la consistencia y atomicidad de la base de datos (nunca quedará una bicicleta duplicada o un usuario sin bicicleta a mitad de proceso).

### Modelos de Datos (Adiciones)

*   **`src/lib/types.ts`**
    ```typescript
    // Nuevo tipo para dependientes
    export interface Dependent {
      id: string;
      userId: string; // ID del tutor
      firstName: string;
      lastName: string;
      birthDate: Date;
      gender: 'Masculino' | 'Femenino' | 'Otro';
      bloodType?: string;
    }

    // Adición a la interfaz existente de Evento
    export interface Event {
      // ... otras propiedades
      allowsMinors?: boolean;
    }

    // Adición a la interfaz existente de Ticket/Inscripción
    export interface Ticket {
      // ... otras propiedades
      tutorId?: string;
      dependentId?: string;
    }
    ```

### Mapeo de Archivos

*   **Archivos Modificados:**
    *   `src/lib/types.ts`: Añadir nuevas interfaces y propiedades de inscripción de menores.
    *   `src/lib/actions.ts`: Extender la Server Action de inscripción de eventos y añadir `swapBikeAssignmentsAction` para el intercambio atómico.
    *   `src/components/admin/events/EventForm.tsx` (o similar): Agregar el `Switch` de `allowsMinors`.
    *   `src/components/event-registration-card.tsx`: Implementar la lógica de pasos y el selector de participante.
    *   `src/app/(protected)/dashboard/events/page.tsx` (o similar): Renderizar condicionalmente los badges de "Menor".
    *   `src/app/(protected)/dashboard/events/[eventId]/page.tsx`: Modificar la entrega de props de `<EventBikeSelector />` y `<EventUnlockChecklist />` para propagar el contexto completo del evento (`allEventRegistrations`).
    *   `src/components/dashboard/event-bike-selector.tsx`: Rediseñar el componente para soportar el estado `isEditingBike`, menú de selección inteligente con indicación de estado, y modal de intercambio `AlertDialog`.
    *   `src/components/dashboard/event-unlock-checklist.tsx`: Adaptar la firma y la llamada interna de selección de bicicletas para usar el pool transaccional unificado.

*   **Archivos Nuevos:**
    *   `docs/features/minor-dependent-registration.md`: Este mismo documento.
    *   `src/components/dependents/RegistrationModalSequence.tsx`: Componente que orquestará los 3 modales de inscripción.
    *   `src/lib/schemas.ts`: Añadir esquemas de Zod para la validación de los formularios de dependientes.

### Status de Implementación (Análisis del 2024-07-15, actualizado)

*   [x] **CA-01 (Habilitación en Panel y Estados de la Tarjeta):** Lógica del frontend en `event-registration-card.tsx` está completa. El componente reacciona a `event.allowsMinors` y muestra el selector de participante. *Validación del backend en el formulario de la ONG pendiente.*
*   [x] **CA-02 (Listado de Asistentes de la ONG - Lista Plana):** Completado. Se ha refactorizado la lógica de obtención de datos (`getEventAttendees`) para identificar de forma robusta a los menores a través de su `dependentId`, asegurando que registros antiguos y nuevos se procesen correctamente. La UI ahora muestra el nombre completo del menor y un badge distintivo ("🛡️ Menor") para una fácil identificación visual por parte del staff de la ONG.
*   [x] **CA-03 (Secuencia Estricta de Interfaz según Estado de Autenticación):** Flujo para usuarios autenticados y nuevos está correctamente implementado en la tarjeta de registro, con la secuencia de modales unificada.
*   [x] **CA-04 (Persistencia y Guardado de Menores - Catálogo Maestro):** Completado. La acción `saveDependentAction` ha sido creada y conectada al `DependentModal` para la persistencia de nuevos menores en la base de datos.
*   [x] **CA-05 (Independencia de Datos y Herencia Pasiva de Contacto):** Las estructuras de datos en `types.ts` y las acciones del backend están definidas correctamente, separando los datos del menor de los del tutor.
*   [x] **CA-06 (Auditoría Legal de Responsiva en UI y PDF):** Completado. El `WaiverModal` ahora carga dinámicamente el texto de tutoría, y la acción de backend junto con el componente de PDF han sido actualizados para generar un documento que refleja correctamente la firma del tutor en nombre del menor.
*   [ ] **CA-07 (Manejo de Pagos Diferidos y Exclusión de Bucle Familiar):** Lógica existente parece ser reutilizada, pero necesita prueba de extremo a extremo.
*   [x] **CA-08 (Visibilidad en Panel de Control del Adulto):** Completado. La lógica de backend en `getUserEventRegistrations` ahora incluye los boletos de los dependientes. La UI en `DashboardTabs` muestra correctamente el badge y nombre del menor.
*   [x] **CA-09 (Lógica de Garage Unificado e Interacción de Check-in):** Completamente implementado. Se integró la lógica de selección de bicicletas independiente de solo lectura, modo de cambio dinámico y soporte transaccional para intercambio de bicicletas en uso sin riesgo de duplicados o callejones sin salida.
*   [x] **CA-10 (Escalabilidad a Seriales y Campeonatos):** El `dependentId` se pasa a la `registerForEventAction`, cumpliendo con el requisito de datos para futuros desarrollos.
*   [x] **CA-11 (Lógica de Bloqueo Selectivo por Reincidencia):** Completamente implementado. El botón "Inscribirme a mí" se deshabilita si el usuario ya está registrado.
*   [ ] **CA-12 (Manejo de Estados Vacíos Estándar):** Pendiente de implementación.
*   [x] **CA-13 (Estructura de la Tarjeta de Registro y Control del Organizador):** Implementado. La tarjeta opera como un asistente progresivo basado en la selección del participante.

### Comando Git

```bash
git checkout -b feature/minor-registration
```

## 3. QA y Zero-Regressions

### Plan de Pruebas del Feature

*   **Escenario A: Registro de Menor**
    *   Un padre con cuenta existente inscribe a un menor nuevo en un evento de pago.
    *   **Pasos:**
        1.  ONG activa "Permitir menores" en un evento.
        2.  Padre inicia sesión y navega a la página del evento.
        3.  Verifica que la tarjeta de registro muestra las opciones "Inscribirme a mí" y "Inscribir a un menor".
        4.  Selecciona "Inscribir a un menor".
        5.  Selecciona categoría y jersey. Clic en "Continuar Inscripción".
        6.  Modal 1 aparece con sus datos de emergencia precargados. Clic en "Continuar".
        7.  Modal 2 aparece. Selecciona "Registrar un menor nuevo" y llena los datos del niño. Clic en "Guardar y Continuar".
        8.  Modal 3 aparece. Verifica el texto legal de tutoría. Scrollea, firma y acepta.
        9.  Es redirigido al boleto del menor, que muestra estado "Pendiente de Pago".
        10. Va a su dashboard y ve la tarjeta del evento del niño con el badge "Menor: [Nombre del Niño]".
        11. Entra al boleto y realiza el pago. El boleto se activa.
    *   **Resultado Esperado:** El menor queda inscrito correctamente, el pago se procesa y el boleto es visible y funcional tanto para el padre como para el organizador.

*   **Escenario B: Intercambio de Bicicletas Ocupadas (Resolución de Deadlock)**
    *   Tutor con 3 bicicletas registradas y 3 participantes inscritos (Tutor, Hijo 1 e Hijo 2) en el mismo evento, donde las 3 bicicletas ya han sido asignadas individualmente. Se requiere reacomodar el garage.
    *   **Pasos:**
        1.  El tutor entra al boleto de "Hijo 1" que tiene asignada la `Bici A`.
        2.  Verifica que la bicicleta aparece en modo "Vinculada al Evento" de solo lectura.
        3.  Hace clic en "Cambiar". Se despliega el selector inteligente.
        4.  Verifica que las opciones muestran las marcas de `En uso` para la `Bici B` (asignada al tutor) y `Bici C` (asignada a Hijo 2).
        5.  Selecciona la `Bici B`.
        6.  Verifica que se abre un modal de diálogo de advertencia explicando el trueque: "La Bici B ya está asignada a [Tutor]. ¿Deseas intercambiarlas? Hijo 1 recibirá la Bici B y Tutor recibirá la Bici A".
        7.  El tutor hace clic en "Confirmar Intercambio".
        8.  La UI muestra un estado de carga mientras se ejecuta de manera atómica el intercambio en la base de datos.
    *   **Resultado Esperado:** Al completarse, la interfaz se refresca mostrando la `Bici B` vinculada de forma segura en el boleto de "Hijo 1". Si el tutor navega a su propio boleto de participante, verá que la `Bici A` (antes de Hijo 1) ha sido reasignada automáticamente para él, resolviendo el deadlock sin crear duplicados.

### Pruebas de No-Regresión

1.  **Flujo de Inscripción de Adulto:** Verificar que un adulto puede inscribirse a sí mismo en un evento (con o sin `allowsMinors` activado) sin ningún cambio en el flujo actual.
2.  **Flujo de Creación de Evento (Sin Menores):** Crear un evento sin activar la opción de menores y confirmar que la tarjeta de registro pública se comporta exactamente como lo hacía antes, sin mostrar ninguna opción relacionada con menores.
3.  **API de Reportes y Lista de Asistentes:** Confirmar que la página de asistentes de la ONG (`/dashboard/ong/events/[id]`) carga correctamente y que la función de exportar a Excel no se rompe, integrando los datos del menor de forma plana.

## 4. Blueprint de Documentación

*   **Ruta del Archivo:** `docs/features/minor-dependent-registration.md`

### Rollout y Rollback

*   **Rollout:** Según `DEVELOPMENT_GUIDELINES.md`, el despliegue se realizará fusionando la rama `feature/minor-registration` a `main` a través de un Pull Request aprobado. El equipo de infraestructura ejecutará el pipeline de despliegue a producción.
*   **Rollback:** En caso de un incidente crítico, se ejecutará el plan de reversión estándar:
    1.  Revertir el Pull Request en el repositorio de Git.
    2.  Desplegar la versión estable anterior de la rama `main` a producción.
    3.  El equipo de desarrollo analizará la causa raíz en un entorno de staging antes de intentar un nuevo despliegue.

---
Análisis completado. ¿Autorizas la creación de la rama, documentación del requerimiento y el inicio de la implementación quirúrgica, Product Owner?