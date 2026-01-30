# Implementación de Preguntas Personalizadas en Eventos

## Resumen
Se ha implementado la funcionalidad que permite a los organizadores (ONGs) agregar preguntas personalizadas al formulario de inscripción de sus eventos.

## Cambios Realizados

### Base de Datos y Tipos (`src/lib/types.ts`)
- Se agregó el tipo `CustomQuestion` con soporte para:
  - Texto Corto (`text`)
  - Opción Única (`radio`)
  - Opción Múltiple (`checkbox`)
- Se actualizó la entidad `Event` para incluir `customQuestions: CustomQuestion[]`.
- Se actualizó la entidad `EventRegistration` y `EventAttendee` para incluir `customAnswers: Record<string, string | string[]>`.

### Formulario de Evento (`src/components/ong/event-form.tsx`)
- Se creó el componente `CustomQuestionsSection` para la gestión dinámica de preguntas y opciones.
- Se integró al esquema de validación `eventFormSchema`.

### Registro de Usuarios (`src/components/event-registration-card.tsx`)
- Se renderizan dinámicamente los inputs basados en la configuración del evento.
- Se implementó validación de campos obligatorios para estas preguntas.
- Se envían las respuestas al `server action` de registro.

### Gestión de Asistentes (`src/components/ong/attendee-management.tsx`)
- Se agregaron columnas dinámicas a la tabla de asistentes.
- Se visualizan las respuestas (con soporte para arrays y truncado de texto largo).

## Flujo de Prueba
1.  **Crear Evento:** Ir a Dashboard > Crear Evento. Agregar una pregunta de cada tipo.
2.  **Registro:** Ir a la página pública del evento. Verificar que las preguntas aparecen y validan requeridos. Completar registro.
3.  **Gestión:** Ir a Dashboard > Evento > Resumen. Verificar que las respuestas aparecen en la tabla.
