# Bug Resolution: Fallo en Transacción de Firestore al Registrar Participantes en Seriales

## 1. Contexto de Negocio
**Historia de Usuario:** Como usuario previamente registrado, deseo inscribirme a mí mismo (o a un menor/dependiente bajo mi cargo) en un evento que pertenece a un serial (campeonato) de forma fluida y sin interrupciones.
**Problema:** Al completar el flujo de inscripción para un evento que pertenece a un serial, el usuario seleccionaba un nivel de acceso de pago, firmaba la responsiva (waiver) y, al presionar "Aceptar y firmar", el sistema fallaba con el mensaje genérico: *"Ocurrió un error al procesar tu registro. Por favor inténtalo de nuevo"*.

## 2. Diseño Técnico
- **Análisis de Error (Causa Raíz):** La consola del servidor mostraba: `Transaction failure: Error: Firestore transactions require all reads to be executed before all writes.`
- **Enfoque de Resolución:** Las transacciones de Firestore (`runTransaction`) tienen una regla atómica estricta: **todas las lecturas (métodos `.get()`) deben ser ejecutadas antes de cualquier escritura (`.set()`, `.update()`, `.delete()`)**.
- En la lógica previa de `registerUserToEvent`, cuando el evento pertenecía a un serial, se ejecutaba la asignación de números de competidor (bib number), la cual realizaba escrituras intermedias en `serial_bib_counters` y `serial_registrations`. Posteriormente, en el bloque de desnormalización del serial (`--- SERIAL INTEGRATION: DENORMALIZATION ---`), se realizaban operaciones de lectura sobre los documentos de usuario (`users`) y del competidor (`serial_competitors`), violando la regla atómica al ejecutar lecturas después de escrituras previas.
- **Solución:** Reestructurar de forma quirúrgica la transacción en la función `registerUserToEvent` para mover todas las lecturas al principio del bloque de transacción, manteniendo las validaciones y delegando todas las escrituras al bloque final.

## 3. Detalles de Implementación
**Archivos Modificados:**
- `src/lib/data/event-registration-data.ts`:
  - Se definieron los mocks/referencias de documentos de forma anticipada.
  - Se agrupó la lectura del evento, la lectura paralela de los documentos del serial (`serialRegDoc`, `counterDoc`, `userDoc`, `competitorDoc`) mediante `Promise.all([transaction.get(...)])`, y la verificación de registro previo.
  - Se estructuró la sección intermedia de validación de cupo y de nivel de costos (tier validation).
  - Se agruparon de manera estricta todas las operaciones de escritura al final del bloque: la asignación del número de competidor, la actualización del contador, la creación del registro del evento (`event-registrations`), la actualización o creación del competidor del serial (`serial_competitors`), la actualización de datos de emergencia en el perfil de usuario (`users`) y el incremento de participantes del evento.

## 4. QA
**Criterios de Aceptación:**
- Los usuarios (tanto adultos como menores dependientes) pueden inscribirse a eventos de seriales sin experimentar bloqueos por transacción.
- El flujo completa correctamente el guardado en base de datos, confirma la asignación de números de competidor (bib numbers), y crea los registros de competencia sincronizados correspondientes en `serial_competitors`.
- No ocurren errores de transacción al procesar eventos que no pertenecen a seriales (los cuales siguen flujos de asignación de números normales).

**Pruebas de no-regresión:**
- Validación estricta de tipos de TypeScript en el proyecto (`npx tsc --noEmit`).

## 5. Despliegue
- El despliegue de esta modificación no requiere índices adicionales de Firestore ni cambios en reglas de seguridad (`firestore.rules`). Se despliega automáticamente con el pipeline continuo al realizar la fusión de la rama a `develop` y eventualmente a `main`.
