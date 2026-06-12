# Especificación Técnico-Funcional: Módulo de Gestión y Detalle de Campeonatos (Seriales)

**Módulo:** Panel de Gestión de Campeonatos para BiciRegistro.mx  
**Estado:** Propuesto para Desarrollo  
**Creado por:** Arquitecto de Software Senior & Experto en Eventos Ciclistas / UX  
**Rama:** `feature/serial-management-spec`  

---

## 1. Descripción de la Funcionalidad

El **Módulo de Gestión y Detalle de Campeonatos (Seriales)** es una herramienta administrativa, logística y analítica de nivel B2B diseñada para las ONGs y Organizadores en BiciRegistro.mx. Permite agrupar un conjunto de eventos individuales de ciclismo (denominados "Etapas") bajo la sombrilla de un campeonato unificado. El sistema proporciona un centro de control integral para auditar competidores, monitorear el desempeño de las etapas en tarjetas dedicadas, editar la configuración general del campeonato y analizar indicadores de rendimiento global, sin fragmentar ni alterar destructivamente la base de datos comercial existente.

### 1.1 Perspectiva de Experto en Eventos Ciclistas

En el ciclismo competitivo de ruta, montaña (MTB), gravel o enduro, la organización de un campeonato requiere consistencia y orden de primer nivel. Este módulo resuelve las siguientes necesidades logísticas críticas:

1.  **Gobernanza de Placa Única de Serial (Bib Number):** Evita la pesadilla logística de asignar y entregar números físicos de plástico o lona diferentes en cada etapa. El sistema asigna un número permanente al corredor al registrarse en su primera etapa del serial, el cual se recicla atómicamente a través de todas las etapas subsecuentes.
2.  **Tasa de Fidelidad de Corredores (Stage Completion Rate):** Mide la retención de los participantes del campeonato (ej. cuántos asisten a 3 de las 4 etapas totales). Esto permite a los organizadores identificar a sus corredores más leales para ofrecerles incentivos de fidelidad (jerseys especiales, accesos preferenciales o rifas).
3.  **Auditoría de Requisitos Legales y Médicos (Waivers):** Controla agregadamente si el corredor cuenta con su deslinde firmado para todas las fechas en las que participa de forma activa, protegiendo a la organización de contingencias legales.
4.  **Control de Afiliación Oficial:** En campeonatos nacionales o regionales, valida que el corredor disponga de una licencia de ciclismo federada activa (`affiliationId`) antes de iniciar la competencia.

### 1.2 Perspectiva del Psicólogo de UX/UI

La gestión operativa durante el día del evento ciclista transcurre en ambientes de alto estrés, baja conectividad, luz solar extrema y prisas en la mesa de control. El diseño de la interfaz responde a los siguientes principios de psicología cognitiva y leyes de la interacción humano-computadora:

*   **Ley de Consistencia (Ley de Jakob):** Al acceder al detalle de un campeonato, la interfaz replica exactamente la misma disposición y pestañas (`Tabs`) que el organizador ya domina de los eventos individuales. Esta transferencia del modelo mental elimina la fatiga por aprendizaje y previene errores humanos bajo presión.
*   **Densidad de Información Semántica mediante Badges:** El estatus de inscripción de cada corredor en cada fecha se representa con una matriz compacta de badges semánticos circulares (ej. `E1`, `E2`, `E3`). Los colores de semáforo (Verde: Inscrito, Gris: No Inscrito, Rojo: Cancelado) reducen el esfuerzo cognitivo visual y permiten al organizador auditar la retención de un vistazo.
*   **Agrupamiento Jerárquico en la Vista Principal (Ley de Proximidad):** En lugar de mostrar 12 etapas sueltas en el listado general del dashboard, lo que provocaría sobrecarga informativa e imposibilidad de priorizar visualmente, las etapas se ocultan elegantemente bajo una única tarjeta unificada de "Campeonato (Serial)". Los eventos que no tienen serial se muestran de manera independiente, permitiendo mantener una vista balanceada y limpia.

---

## 2. Análisis Técnico Detallado y Estrategia de Desnormalización

La arquitectura garantiza un flujo de lectura y renderizado óptimo bajo App Router de Next.js y base de datos Firestore, aplicando técnicas de **desnormalización de alto rendimiento** para optimizar tiempos de respuesta y costos de lectura de Firestore.

### 2.1 Modelo NoSQL y Desnormalización de Rendimiento

Hacer fetches cruzados en Firestore en tiempo de ejecución (consultar cientos de registros de `event-registrations` de 5 o más eventos diferentes cada vez que el organizador ingresa a ver el campeonato) consume excesivos recursos de lectura, aumenta los tiempos de respuesta del servidor y disminuye notablemente el rendimiento.

Para solucionar esto aplicando una arquitectura alineada con Firestore y las pautas del proyecto, se implementa una colección dedicada para la agregación del estado del competidor de forma asíncrona/reactiva: `serial_competitors`.

#### Entidad Desnormalizada: `serial_competitors`
*   **Document ID:** `${serialId}_${userId}` (Garantiza unicidad y sobreescrituras limpias).
*   **Estructura del documento:**

```typescript
export type SerialCompetitor = {
    id: string; // `${serialId}_${userId}`
    serialId: string;
    userId: string;
    userName: string;
    userEmail: string;
    userAvatar?: string;
    bibNumber: number; // Su número de placa permanente del serial
    categoryId: string; // Categoría del serial en la que compite
    categoryName: string;
    affiliationId?: string; // ID de afiliación si lo requiere el serial
    
    // Desnormalización de Inscripciones por Etapa
    // Guarda el estatus de inscripción y detalles de cada evento asociado
    stages: {
        [eventId: string]: {
            stageOrder: number;
            eventName: string;
            isRegistered: boolean;
            paymentStatus: 'paid' | 'pending' | 'not_applicable' | 'cancelled';
            waiverSigned: boolean;
            checkedIn: boolean;
        }
    };
    
    // Estadísticas e Indicadores Acumulados (Sincronizados del Leaderboard)
    totalPoints: number;
    overallPosition: number;
    stagesCompleted: number;
    totalChipTimeMs?: number;
    
    updatedAt: string;
};
```

#### Mecanismos de Sincronización y Triggers (Cero Cloud Functions):
Para mantener una arquitectura simple, robusta y con bajo costo de mantenimiento, **el sistema NO utilizará Cloud Functions ni triggers asíncronos en segundo plano**. La sincronización de la colección desnormalizada `serial_competitors` se resolverá inyectando operaciones de escritura síncronas en el servidor dentro de los hilos transaccionales existentes:

1.  **Sincronización en Inscripción:** En `registerUserToEvent`, cuando se detecta que el evento pertenece a un serial (`serialId` definido), se inyectará una operación `set(competitorRef, competitorPayload, { merge: true })` en el mismo `WriteBatch` o transacción de la base de datos de Firestore. Esto garantiza que la creación del boleto y la inicialización o actualización del nodo `stages[eventId]` en `serial_competitors` ocurran de forma **totalmente atómica**.
2.  **Sincronización en Webhook de MercadoPago:** En el webhook seguro de MercadoPago (`/api/webhooks/mercadopago`), la confirmación del pago del boleto actualizará el estatus del registro y, de manera integrada y dentro del bloque seguro, enviará la actualización del campo `stages[eventId].paymentStatus = 'paid'` mediante una operación directa a Firestore con merge para no sobreescribir otros datos.
3.  **Sincronización en Cancelación:** En `cancelEventRegistration` y `cancelEventRegistrationById`, la misma transacción de Firestore actualizará el estatus a cancelado y seteará `stages[eventId].isRegistered = false` y `stages[eventId].paymentStatus = 'cancelled'` en `serial_competitors`.

#### Consistencia Atómica con el Leaderboard:
Al publicarse o recalcularse los resultados de una etapa mediante `publishStageResultsAction`, el proceso de cálculo nativo en memoria (Server Action) realizará las escrituras en lote (`WriteBatch`) para garantizar la consistencia absoluta de los datos.
* El Server Action escribirá el consolidado en la colección `serial_leaderboards`.
* Simultáneamente y dentro del mismo `WriteBatch`, el Server Action iterará sobre los competidores calculados y actualizará de manera atómica sus propiedades de rendimiento competitivo (`totalPoints`, `overallPosition`, `stagesCompleted`, `totalChipTimeMs`) directamente en sus respectivos documentos dentro de la colección `serial_competitors`. Esto asegura que el organizador nunca vea un desfase de posiciones entre el Leaderboard global y la tabla unificada de participantes del serial.

Gracias a esta arquitectura, la carga de la tabla de participantes unificada requiere **una sola consulta de alta velocidad** sobre `serial_competitors` filtrando por `serialId`, lo cual es óptimo y escala infinitamente sin importar el volumen de corredores del serial.

### 2.2 Relaciones Lógicas en Firestore

```
+-------------------+          +-------------------------+          +------------------------+
|     serials       |          |    serial_leaderboards  |          |         events         |
|-------------------|          |-------------------------|          |------------------------|
| - id (PK)         |          | - id (PK)               |          | - id (PK)              |
| - name            |<---------| - serialId (FK)         |          | - serialId (FK, opt)   |
| - categories[]    |          | - categoryId            |          | - isSerialStage (bool) |
| - status          |          | - rows[] (leaderboard)  |          | - stageOrder (number)  |
+-------------------+          +-------------------------+          +------------------------+
          ^                                 ^                                    ^
          |                                 |                                    |
          |                     +-------------------------+                      |
          |                     |   serial_competitors    |                      |
          +---------------------|-------------------------|----------------------+
                                | - id (PK)               |
                                | - serialId (FK)         |
                                | - userId (FK)           |
                                | - stages { [eventId] }  |
                                +-------------------------+
```

### 2.3 Reglas de Seguridad de Firestore (Security Rules)

Para garantizar la total confidencialidad y la gobernanza estricta de los datos confidenciales de los corredores, se agregarán las siguientes reglas de seguridad en `firestore.rules` para la nueva colección `serial_competitors`:

```javascript
match /serial_competitors/{competitorId} {
  // Permitir lectura si el usuario es el dueño de la inscripción (ciclista)
  // o si el usuario es la ONG creadora del serial (identificada en el documento del serial)
  allow read: if request.auth != null && (
    request.auth.uid == resource.data.userId ||
    isOwnerOfSerial(resource.data.serialId)
  );
  
  // La escritura (creación, actualización y borrado) está estrictamente delegada a la capa de
  // aplicación del servidor (Server Actions / Webhooks usando Firebase Admin SDK).
  // Por lo tanto, se rechazan las escrituras directas desde el cliente web SDK por seguridad.
  allow write: if false;
}

// Función auxiliar en firestore.rules para validar propiedad del serial
function isOwnerOfSerial(serialId) {
  return request.auth.uid == get(/$(database)/documents/serials/$(serialId)).data.ongId;
}
```

### 2.4 Alineación Estricta con las Pautas de Desarrollo (DEVELOPMENT_GUIDELINES.md)

1.  **Límite Estricto de 600 Líneas por Archivo:** Ningún archivo de código fuente excederá las 600 líneas de código. Para lograr esto, modularizaremos la vista del campeonato de forma proactiva dividiendo las responsabilidades en componentes unitarios compactos:
    *   `src/app/(protected)/dashboard/ong/serials/[id]/page.tsx` (Server Component de carga e hidratación - ~60 líneas).
    *   `src/components/ong/serial-management.tsx` (Client Component que organiza y conmuta las pestañas - ~150 líneas).
    *   `src/components/ong/serial-attendees-table.tsx` (Client Component exclusivo para el renderizado, búsqueda, paginación y filtrado de competidores - ~350 líneas).
    *   `src/components/ong/serial-stages-tab.tsx` (Client Component para el grid de tarjetas de las etapas - ~100 líneas).
    *   `src/components/ong/serial-edit-tab.tsx` (Client Component para el formulario reactivo de edición - ~200 líneas).
    *   `src/lib/actions/serial-actions.ts` (Persistencia y actualizaciones - ~150 líneas).
    *   `src/lib/data/serial-data.ts` (Data-fetching y sincronización en backend - ~200 líneas).
2.  **Sensibilidad a Mayúsculas y Minúsculas (Case-Sensitivity):** Todos los archivos nuevos se crearán en minúsculas y separados por guiones para evitar fallos catastróficos en el build del servidor de producción.
3.  **Integridad Estricta de Contratos de Datos (`src/lib/types.ts`):** No se reescribirá el archivo de tipos base. Las nuevas interfaces de soporte (`SerialCompetitor`) se inyectarán quirúrgicamente de forma incremental al final del archivo.
4.  **Validación de Tipos de TypeScript:** Ejecución obligatoria de `npx tsc --noEmit` de forma previa a cualquier confirmación de cambios para asegurar cero regresiones de tipado en el proyecto.

### 2.5 Rutas y Estructura de Vistas (App Router)

*   **Ruta de Detalles del Campeonato:** `/dashboard/ong/serials/[id]/page.tsx` (Server Component).
    *   Valida sesión y rol de ONG.
    *   Realiza las consultas concurrentes vía `Promise.all` y renderiza el componente contenedor `<SerialManagement ... />`.
*   **Componente de Control:** `src/components/ong/serial-management.tsx` (Client Component).
    *   Soporta el renderizado de la barra de navegación del campeonato y el flujo de cambio entre pestañas.
*   **Estructura de Pestañas del Campeonato:**
    1.  **Pestaña de Resumen y Competidores (`overview`):** Muestra tarjetas estadísticas rápidas (KPIs de lealtad, asistencia media y total de corredores únicos) y renderiza la tabla de control `<SerialAttendeesTable ... />`.
    2.  **Pestaña de Etapas Asociadas (`stages`):** Lista en formato Grid de tarjetas (`EventCard`) todas las etapas del campeonato, permitiendo al organizador clonarlas, editarlas o acceder a la gestión de cobros individuales de cada etapa de forma natural.
    3.  **Pestaña de Indicadores (`stats`):** Muestra gráficos e indicadores demográficos, participación histórica y de retención acumulada del campeonato.
    4.  **Pestaña de Configuración (`config`):** Hospeda el formulario reactivo de edición del campeonato (`<SerialEditForm ... />`).

---

## 3. Historias de Usuario con Criterios de Aceptación

### Historia de Usuario 1: Agrupación en el Dashboard General (Vistas de Eventos vs Seriales)
**Como** organizador de la ONG,  
**Quiero** que el listado de eventos del dashboard general agrupe las etapas de un campeonato bajo una única tarjeta unificada de "Campeonato", mientras que los eventos independientes aparezcan de forma separada,  
**Para** mantener un panel limpio, ordenado y libre de ruido visual de etapas múltiples.

#### Criterios de Aceptación:
1.  **Tarjeta Unificada de Serial:** El dashboard general (`/dashboard/ong`) identificará si un evento forma parte de un serial. Si un serial tiene etapas, éstas no se listarán individualmente en la pestaña general de "Eventos". En su lugar, se mostrará una única tarjeta de tipo **Campeonato (Serial)** con un badge que diga "Campeonato" y muestre el número total de etapas asociadas (ej. `4 Etapas`).
2.  **Botón de Gestión del Campeonato:** La tarjeta del campeonato presentará el botón primario "Gestionar Campeonato" que redirige al usuario a `/dashboard/ong/serials/[id]`.
3.  **Eventos No Asociados Sueltos:** Todos los eventos individuales que no tengan un `serialId` asociado se listarán de forma normal mediante tarjetas `EventCard` independientes.
4.  **Preservación de Vistas:** El cambio no debe afectar las pestañas de Comunidad, Mi Garaje, Campañas o Indicadores generales de la ONG.

#### Estrategia Técnica de Query para Particionamiento Eficiente:
Para evitar el uso de queries condicionales ineficientes en Firestore (como `where('serialId', '==', null)` o `!= null`), las cuales no son soportadas de forma nativa o requieren de costosos índices compuestos adicionales:

1.  **Estrategia de Particionamiento en Memoria (JavaScript):**
    Dado que las ONGs manejan un volumen pequeño de eventos simultáneos activos (generalmente menos de 50 eventos históricos), **hacer la división de datos en memoria en la capa del cliente o servidor es la solución técnica más eficiente y segura**.
2.  **Flujo de Ejecución en `getEventsByOngId` / Dashboard:**
    *   Se consultan todos los eventos de la ONG de manera plana mediante `getEventsByOngId(user.id)`. Esto realiza un número mínimo de lecturas secuenciales optimizadas de Firestore.
    *   Se realiza un mapeo en memoria para separar los eventos que no tienen `serialId` de aquellos que sí lo tienen.
    *   Para los eventos que tienen `serialId`, se agrupan en un set de identificadores únicos para consultar los metadatos de los `serials` correspondientes.
    *   La UI renderiza una única tarjeta de tipo Campeonato por cada `serialId` encontrado (agrupando en ella las etapas de dicho campeonato), y renderiza de forma estándar las tarjetas de eventos independientes.
3.  Esto previene la reestructuración destructiva del esquema de base de datos base de eventos y garantiza un rendimiento de milisegundos sin inflar costos de consulta a Firestore.

---

### Historia de Usuario 2: Pestaña de Etapas del Serial (Gestión Unificada de Tarjetas)
**Como** coordinador logístico del campeonato,  
**Quiero** ver una pestaña dedicada a "Etapas" dentro de la vista del campeonato que liste todas las fechas en formato de tarjetas individuales,  
**Para** poder clonar etapas, publicar resultados, editar metadatos o acceder a la gestión financiera individual de cada fecha rápidamente.

#### Criterios de Aceptación:
1.  **Pestaña "Etapas":** Se agregará la pestaña `stages` a las pestañas del Campeonato.
2.  **Lista de Tarjetas de Evento (EventCard):** La pestaña mostrará un grid interactivo que cargará las etapas utilizando el componente de UI `EventCard` del proyecto.
3.  **Acciones Completas de Etapa:** Cada tarjeta de etapa en esta pestaña debe mantener todas sus características operativas: botón para clonar, botón para ver página pública y botón para ingresar a la gestión de asistencia y pagos específicos de esa fecha.
4.  **Botón de "Nueva Etapa" Auxiliar:** Se debe desplegar un botón de acción rápida que permita crear un evento adicional directamente asociado a este campeonato.

---

### Historia de Usuario 3: Tabla de Participantes con Analítica de Retención y Fidelidad
**Como** organizador deportivo,  
**Quiero** auditar en una única tabla a todos los corredores del campeonato, visualizando su placa, categoría, las etapas específicas en las que se encuentra inscrito y sus estadísticas competitivas (puntos y posición),  
**Para** evaluar la retención de clientes y simplificar la entrega de kits físicos de competencia.

#### Criterios de Aceptación:
1.  **Columna de Placa Permanente:** Despliega el número permanente asignado para el serial. Muestra el badge "Pendiente" si aún no ha sido asignado.
2.  **Visualización Matricial de Etapas:** La tabla contiene subcolumnas para cada etapa configurada (ej. `Etapa 1`, `Etapa 2`...). Cada celda pintará un badge:
    *   **Verde con Check:** Inscrito de forma activa (`confirmed` y pago aprobado/no aplicable).
    *   **Gris con Cruz o Vacío:** No inscrito.
    *   **Naranja/Amarillo:** Inscrito con pago pendiente de acreditación.
3.  **Tasa de Fidelidad Acumulada:** Se agregará una columna que refleje el porcentaje de etapas a las que se ha inscrito del total de etapas del campeonato (ej. `2/3 (66%)`).
4.  **Filtros de Búsqueda y Categoría:** Permite buscar dinámicamente en tiempo real en la tabla por nombre, email o número de placa. Cuenta con un selector de categorías globales del serial para segmentar competidores.

---

### Historia de Usuario 4: Ordenación y Clasificación Competitiva
**Como** comisario deportivo de la carrera,  
**Quiero** ordenar la tabla de participantes acumulados según su clasificación oficial en el campeonato, puntos o mejor tiempo acumulado,  
**Para** agilizar la ceremonia de premiación y asegurar la transparencia del ranking.

#### Criterios de Aceptación:
1.  **Orden por Posición en Campeonato:** Permite ordenar de forma ascendente (1.º, 2.º, 3.º...) utilizando la posición global actual obtenida del leaderboard (`overallPosition`).
2.  **Orden por Puntos Acumulados:** Permite ordenar de forma descendente en función de los puntos totales ganados a lo largo del serial.
3.  **Orden por Mejor Tiempo:** Si existen tiempos guardados, permite ordenar de forma ascendente (menor tiempo es mejor) según el campo `totalChipTimeMs`.
4.  **Criterio de Desempate Estricto:** Al ordenar por "Posición en Campeonato", el sistema aplicará automáticamente la lógica de desempate preestablecida:
    *   1.º: Puntos totales acumulados.
    *   2.º: Última posición lograda de etapa (desempate primario).
    *   3.º: Tiempo de chip acumulado (desempate secundario).

---

### Historia de Usuario 5: Edición y Configuración General del Serial
**Como** administrador general del serial,  
**Quiero** una pestaña de "Configuración" que me permita modificar la información de perfil, redes, logotipo y reglamento PDF del campeonato,  
**Para** reflejar cambios de patrocinadores o correcciones logísticas en la landing page del serial.

#### Criterios de Aceptación:
1.  **Pestaña "Configuración":** Se agregará la pestaña `config` en las pestañas del Campeonato que cargará el formulario de edición.
2.  **Validación Robusta (Zod):** Todos los campos de texto, URLs y archivos validados deben cumplir con el esquema Zod de creación del serial para mantener la consistencia de datos en Firestore.
3.  **Campos Bloqueados por Integridad:** No se permitirá editar la cantidad inicial de etapas asociadas, las categorías de herencia ni las fechas ya configuradas de las etapas desde este panel unificado, para evitar inconsistencias logísticas o financieras. Los metadatos de las etapas individuales se modificarán accediendo de forma específica a la tarjeta de cada etapa.
4.  **Revalidación Dinámica:** Al guardar los cambios, el Server Action actualizará el documento en Firestore y disparará `revalidatePath` para actualizar la landing pública y el dashboard en tiempo real.

---

## 4. Plan de Implementación: MVP vs Incremental

### 4.1 Alcance del MVP (Mínimo Producto Viable)
El MVP se enfocará en sentar los cimientos de visualización, edición y gestión agregada de etapas:

1.  **Agrupación de Seriales en Dashboard General:** Separar los eventos que pertenecen a un campeonato y agruparlos bajo una tarjeta unificada de "Campeonato" en la pestaña de eventos del Dashboard.
2.  **Ruta de Detalle del Campeonato:** Estructura de páginas en `/dashboard/ong/serials/[id]` con las cuatro pestañas:
    *   **Resumen y Competidores:** KPIs básicos de asistencia y tabla de participantes.
    *   **Etapas:** Grid de tarjetas con `EventCard` de las etapas asociadas al campeonato.
    *   **Configuración:** Formulario reactivo para editar el serial.
3.  **Tabla de Competidores del Serial:**
    *   Visualización de nombre, correo, categoría y número de placa permanente.
    *   Badges de estado de inscripción en cada etapa asociada.
    *   Cálculo automático de la tasa de fidelidad por corredor.
    *   Buscador por texto y selector de categoría.
    *   Ordenamiento por puntos acumulados y posición en campeonato.

### 4.2 Funcionalidades Incrementales (Fase 2)
Características añadidas en entregas sucesivas de menor riesgo:

1.  **Pestaña "Indicadores" Completa (Stats):** Gráficos visuales dinámicos de retención de corredores de una etapa a otra, asistencia acumulada e histogramas demográficos del campeonato.
2.  **Ordenamiento por "Mejor Tiempo Acumulado" (Chip):** Integración fina con los milisegundos de tiempo de chip del cronometraje para desempates automáticos.
3.  **Auditoría Detallada del Waiver (Deslinde):** Popover indicando qué etapas exactas tiene pendientes de firmar el corredor.
4.  **Exportación a Excel / CSV:** Botón para descargar el reporte unificado de todos los inscritos al campeonato y su estado de retención y pago de boletos.
