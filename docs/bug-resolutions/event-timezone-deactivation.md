# Bug Resolution: Desactivación Temprana de Eventos por Desfase de Zona Horaria (CST vs UTC)

## 1. Contexto de Negocio
**Historia de Usuario:** Como organizador de eventos, al programar un evento a una hora local específica (ej. 8:00 AM del 15 de enero), necesito que las inscripciones permanezcan habilitadas hasta la hora exacta del evento en mi hora local.
**Problema:** Se reportó que los eventos se desactivaban exactamente 6 horas antes de lo programado (por ejemplo, a las 2:00 AM del 15 de enero). Esto impedía la inscripción de usuarios tardíos durante el período más crítico (horas previas al evento). El comportamiento se debía a que el sistema procesaba las fechas de los eventos asumiendo la hora UTC del servidor en lugar de la hora local (CST) del lugar del evento.

## 2. Diseño Técnico
El problema residía en cómo el cliente serializaba y enviaba la fecha del evento a través de un campo `datetime-local` en el formulario:

1.  **Carga del Formulario (Edición):** El frontend recibía una fecha en formato ISO con indicador de zona horaria `Z` (UTC). Al cargarlo en un componente `datetime-local`, el código usaba `new Date(date).toISOString().slice(0, 16)`. El método `.toISOString()` convierte siempre la fecha de vuelta a UTC, y el `.slice(0, 16)` truncaba el string eliminando la letra `Z` y los segundos. Esto convertía una fecha local en una fecha UTC "ingenua" (naive).
2.  **Envío del Formulario (Guardado):** Al guardar, el valor del formulario (un string local sin indicador de zona horaria) se enviaba directamente a la Server Action de guardado. Al procesarse en el servidor que corre en UTC, `new Date('2025-01-15T08:00')` se interpretaba como 8:00 AM UTC (que equivale a las 2:00 AM en la hora local CST, sufriendo el desfase de 6 horas).

**Solución Implementada:**
-   Se introdujo una función auxiliar en el cliente llamada `toLocalISOString` que traduce el objeto `Date` a un formato `datetime-local` representativo de la hora local del organizador, no de la hora UTC.
-   En el envío del formulario (`onSubmit`), antes de enviar la fecha a la Server Action `saveEvent`, se convierte el string de hora local del formulario en un objeto `Date` del navegador (el cual hereda implícitamente la zona horaria del usuario) y se llama a `.toISOString()`. Esto genera un string ISO 8601 completo con la hora UTC equivalente (ej. `08:00 CST` se convierte en `14:00 UTC`), que el servidor interpretará y almacenará de forma precisa en Firestore.

## 3. Detalles de Implementación
**Archivos Modificados:**
-   `src/components/ong/event-form.tsx`:
    -   Se implementó la función helper `toLocalISOString`:
        ```typescript
        const toLocalISOString = (date: Date) => {
            const offset = date.getTimezoneOffset();
            const localDate = new Date(date.getTime() - (offset * 60 * 1000));
            return localDate.toISOString().slice(0, 16);
        };
        ```
    -   Se modificaron los `defaultValues` para `date` y `registrationDeadline` para inicializar el formulario usando el helper local:
        ```typescript
        date: initialData?.date ? toLocalISOString(new Date(initialData.date)) : "",
        registrationDeadline: initialData?.registrationDeadline ? toLocalISOString(new Date(initialData.registrationDeadline)) : "",
        ```
    -   Se ajustó el objeto de envío `submitData` en `onSubmit` para convertir las fechas de vuelta a string ISO 8601 preservando la zona horaria:
        ```typescript
        const submitData = { 
            ...data, 
            id: initialData?.id,
            costTiers: isCostEnabled ? data.costTiers : [],
            date: new Date(data.date).toISOString(),
            registrationDeadline: data.registrationDeadline ? new Date(data.registrationDeadline).toISOString() : undefined,
        };
        ```

## 4. QA
**Criterios de Aceptación:**
-   Al crear un nuevo evento para las 8:00 AM, el registro de la base de datos debe reflejar las 8:00 AM en la hora local del usuario traducido adecuadamente a UTC (ej. 14:00 UTC si el usuario está en CST/UTC-6).
-   Al cargar y editar un evento existente programado a las 8:00 AM (local), el formulario debe pre-cargar y mostrar las 8:00 AM del día correspondiente, sin importar cuántas veces se guarde el borrador o se edite.
-   El deadline de registro (`registrationDeadline`) debe operar con el mismo comportamiento con preservación de zona horaria local.

**Pruebas de no-regresión:**
-   Asegurar que los eventos con fechas pasadas o sin fecha de deadline no experimenten crashes al cargarse en el formulario.

## 5. Despliegue
-   Integración mediante Pull Request normal a la rama `develop`. No requiere scripts de migración de datos ni índices nuevos en Firestore, ya que el tipo de datos se mantiene idéntico (`string` formateado en ISO).
