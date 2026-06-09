# Technical Specification Document (Tech Spec): Motor de Seriales y Campeonatos

**Módulo:** Motor de Seriales y Campeonatos para Biciregistro.mx
**Metodología:** Spec-Driven Development (SDD)
**Rol:** Arquitecto de Software Senior & Tech Lead

Este documento traduce el FRD del "Motor de Seriales y Campeonatos" en un plano arquitectónico detallado para su implementación en el ecosistema Next.js (App Router), TypeScript y Firebase/Firestore. Refleja la arquitectura de flujos de inscripción individual y las estrategias de mitigación de riesgo para proteger la estabilidad del sistema actual.

---

## 1. Data Layer (Contrato de Datos y Base de Datos)

El patrón "Wrapper" exige que la entidad base `Event` no se altere de forma destructiva, y se maneje la agrupación mediante una nueva entidad `Serial`.

### 1.1 Interfaces TypeScript (`src/lib/types.ts`)

Se agregarán las siguientes interfaces e inyecciones quirúrgicas. Siguiendo las directrices de desarrollo, estas modificaciones no rompen los compiladores existentes.

```typescript
// --- EN src/lib/types.ts ---

// 1. Tipos de Apoyo para Seriales
export type PointMatrix = {
    position: number;
    points: number;
};

export type SerialStatus = 'draft' | 'published' | 'completed';

// 2. Entidad Wrapper: Serial
export type Serial = {
    id: string;
    ongId: string;
    name: string;
    slug: string; // Friendly URL (/serial/[slug])
    description: string;
    status: SerialStatus;
    heroImageUrl?: string;
    country: string;
    state: string;
    guideUrl: string; // PDF del reglamento
    sponsors?: string[]; // Array de URLs de logos
    coOrganizerEmails?: string[]; // Incremental: emails vinculados
    pointMatrix: PointMatrix[];
    
    // Aislamiento Numérico Arquitectónico (FRD 8.3)
    maxParticipantsGlobal: number; // Obligatorio. Define el límite de la piscina
    protectedBibRange: {
        min: number; // Siempre será 1
        max: number; // Será igual a maxParticipantsGlobal
    };

    categories: EventCategory[]; // Reutilizado
    requiresAffiliationId: boolean; // Flag B2C
    createdAt: string;
    updatedAt: string;
};

// 3. Extensión Quirúrgica a la Entidad Event (Hijo)
// No modificamos la base, solo agregamos campos opcionales para la vinculación.
export type Event = {
    // ... (campos existentes se mantienen intactos)
    serialId?: string; // Llave foránea lógica al Serial
    isSerialStage?: boolean;
    stageOrder?: number; // Para ordenar las fechas cronológicamente (1, 2, 3...)
};

// 4. Extensión Quirúrgica a EventRegistration / EventAttendee
export type EventRegistration = {
    // ... (campos existentes se mantienen intactos)
    serialBibNumber?: number; // El "Número Único Permanente"
    affiliationId?: string; // Captura si requiresAffiliationId es true
};

// 5. Entidad Leaderboard (Tabla Global del Serial)
export type SerialLeaderboardRow = {
    userId: string;
    categoryId: string;
    totalPoints: number;
    overallPosition: number;
    stagesCompleted: number;
    lastStagePosition?: number; // Tie-breaker primario
    totalChipTimeMs?: number; // Tie-breaker secundario
    // Datos desnormalizados para lectura rápida en UI
    userName: string;
    userAvatar?: string;
    categoryName: string;
};

export type SerialLeaderboard = {
    id: string; // Document ID compuesto: `${serialId}_${categoryId}`
    serialId: string;
    categoryId: string;
    rows: SerialLeaderboardRow[]; // Ordenado por overallPosition
    lastCalculatedAt: string;
};
```

### 1.2 Esquema de Firestore

Se utilizará una estructura plana para facilitar consultas rápidas bajo el modelo de base de datos NoSQL documental de Firebase:

*   **Colección `serials`:** Almacena los documentos base del tipo `Serial`.
*   **Colección `events` (Existente):** Los eventos hijos se guardan aquí de manera plana. Para obtener el cronograma de etapas de un serial, se ejecutará una consulta indexada: `where("serialId", "==", target_serial_id) orderBy("date", "asc")`.
*   **Colección `serial_leaderboards`:** Colección raíz para las tablas de posiciones. Utiliza Document IDs compuestos (`serialId_categoryId`) para permitir escrituras directas y optimizar la carga asíncrona de la tabla fragmentada por categoría en la PWA (evitando leer toda la base del campeonato).

### 1.3 Arquitectura Wrapper y Aislamiento de Pool Numérico

1.  Al crear un campeonato desde el Dashboard B2B, el organizador define `maxParticipantsGlobal` (Ej. 300). Se guarda el documento `Serial` con su `protectedBibRange` (1-300).
2.  Dentro del mismo flujo transaccional (`WriteBatch`), se generan `N` documentos en la colección `events`. En cada uno, se vincula `serialId` y se inyecta su propio `bibNumberConfig` configurado en Modo Automático iniciando a partir de `301` (`nextNumber: 301`). 
    *   *Mitigación de Riesgo:* Esto implementa el principio de Composición sobre Modificación. El evento hijo queda 100% autónomo. Si un corredor compra un boleto "suelto" ahí, el motor del evento funciona como siempre y le da la placa 301+. Cero colisiones con el Serial y cero lógica condicional frágil en el checkout de la plataforma.
3.  **Regla de Desconexión:** Si se elimina una fecha de un serial desde el panel, el sistema localizará el documento en la colección `events` y ejecutará un `update` seteando `serialId = null` y `isSerialStage = false`, desvinculándolo inmediatamente del Wrapper sin borrar registros comerciales.

---

## 2. Backend Layer (Server Actions & Webhooks)

### 2.1 Server Actions (`src/lib/actions/serial-actions.ts`)

```typescript
// 1. Creación del Serial y Eventos Hijos (MVP)
// Input: FormData validado que incluye datos del serial y un array de 'stages'.
// Output: { success: boolean, serialId?: string, error?: string }
export async function createSerialWithStagesAction(data: CreateSerialPayload)

// 2. Publicación de Resultados Síncrona (Incremental Etapa 4)
// Mitigación de riesgo: Ejecutado sincrónicamente en memoria en lugar de un Worker externo.
export async function publishStageResultsAction(data: PublishResultsPayload)
```

### 2.2 Estrategia Técnica de Asignación de Placa y Webhook Fallback

Para mitigar el riesgo crítico de romper la emisión de boletos en MercadoPago por errores al intentar buscar el número de placa permanente del ciclista, implementaremos una inyección aislada con salvavidas (`Try-Catch Fallback`).

**Flujo de Inyección de Asignación Segura (`src/app/api/webhooks/mercadopago/route.ts`):**

1.  **Interceptación No Invasiva:** Al final de la ejecución del Webhook, justo antes de persistir la entidad `EventRegistration` en Firestore, invocaremos un servicio externo e independiente (`SerialBibService`) envuelto estrictamente en un bloque `try-catch`. No se modificará el núcleo transaccional ni la validación criptográfica de MercadoPago.
2.  **Consulta y Operación Atómica:**
    *   El servicio ejecuta una query para verificar si el usuario es un corredor recurrente de ese campeonato.
    *   Si SÍ, recicla y extrae su número original.
    *   Si NO, extrae el siguiente número seguro mediante la operación atómica nativa de Firebase `FieldValue.increment(1)` sobre el documento `serial_bib_counters/{serialId}`.
3.  **Mecanismo de Fallback:** Si por algún timeout, error de red, o indisponibilidad de Firestore el `SerialBibService` levanta una excepción, el bloque `catch` la silenciará e inyectará un número estándar o vacío delegando al motor base del evento. *Prioridad Absoluta de Negocio: La transacción financiera es sagrada; la creación del boleto pagado en base de datos debe completarse siempre, el número de placa puede corregirse administrativamente después.*

---

## 3. Frontend Layer (UI Components & Routing)

### 3.1 Estructura de Rutas (App Router)

*   **(B2B) `/dashboard/ong` (Existente):** Se inyectará el botón CTA "Crear Campeonato" en el componente `ong-dashboard-tabs.tsx`.
*   **(B2B) `/dashboard/ong/serials/create`:** Ruta anfitriona para montar el Wizard de creación del serial.
*   **(B2C Pública) `/serial/[slug]`:** Landing page dinámica SEO-friendly del campeonato. Para mitigar impactos visuales en la página general `/events`, crearemos un componente dedicado `SerialStagesFeed` en esta vista en lugar de modificar los filtros globales.
*   **(B2C Privada) `/dashboard/serial/[serialId]`:** Centro de control del competidor (Ficha fija con `serialBibNumber` y carriles horizontales de etapas).

### 3.2 Árbol de Componentes y Reutilización (Mitigación de Riesgos UI)

**Panel B2B (Creación & Importación):**
*   `SerialWizard` (Client Component): Componente contenedor que manejará el estado local del formulario de 3 pasos (react-hook-form + Zod).
*   **Resultados IA (Clonación de Patrón Base):** Para mitigar los riesgos técnicos de construir un motor de IA desde cero (latencias, alucinaciones, fallos de esquema de LLMs), **reutilizaremos la tubería probada en producción del inventario masivo** (`src/components/ong/bulk-import-modal.tsx`).
    *   Se clonará y adaptará como `results-import-modal.tsx`.
    *   Mantendrá la misma UX de "Pantalla de Auditoría Humana": Si la IA (Gemini) extrae números de placa que no existen en la BD (Fallback Mechanism de la Etapa 8.4 del FRD), estos se renderizarán en las tablas de estado rojo permitiendo la corrección manual en la UI antes de ejecutar el Server Action final de publicación.

---

## 4. Gobernanza y Procesamiento Nativo (Incrementales)

### 4.1 Estrategia: Next.js Native Worker (Sincronía Controlada)

Para evitar la fragmentación de la arquitectura del proyecto y la dependencia de Cloud Functions externas que requerirían doble pipeline de despliegue y complicarían la DX (Developer Experience) local:

1.  **Ejecución Nativa:** El cálculo y recálculo del Leaderboard se ejecutará directamente en el servidor de App Hosting que procesa el Server Action de publicación.
2.  **Mitigación de Latencia en Tiempo de Ejecución:** Dado que el volumen promedio de un serial en la plataforma ronda los 500 a 2000 corredores (un volumen ínfimo para arreglos en NodeJS), la lógica en memoria que lee los documentos, sortea y calcula desempates tomará **menos de 400ms**. Se ejecutará de forma **100% síncrona** en el mismo hilo antes de resolver el request al organizador.
3.  **Actualización Atómica:** El servicio finaliza sobreescribiendo el documento maestro `serial_leaderboards/{serialId}_{categoryId}`.

### 4.2 Gobernanza B2B: Validación en Capa de Aplicación

Para mitigar el riesgo de vulnerabilidades de acceso al delegar la organización logística a "Co-Organizadores" locales:

1.  **Reglas Firestore (Conservadoras):** Se mantendrán las reglas base estrictas permitiendo escritura solo si el usuario pertenece al arreglo de dueños u organizadores.
2.  **Filtro Sanitizador en Capa de Aplicación:** El control granular de los "Campos Bloqueados" (Precios, Categorías, Configuración Estructural de Placas) no se basará en complejas `Firestore Rules` a nivel de propiedad. Se implementará en el backend de actualización.
3.  El Server Action leerá la sesión. Si detecta que el usuario está operando en capacidad de *invitado/co-organizador* (`coOrganizerEmails`), el payload de actualización se sanitizará forzosamente usando `zod.omit()` para borrar silenciosamente cualquier intento de mutar estructuras financieras, guardando únicamente cambios en descripciones logísticas o de campo.