# Especificación de Requerimientos Funcionales (PRODUCT SPEC - REVISIÓN FINAL)

## Fase 1: UX/UI & Agile

### Historias de Usuario

*   **HU-01: Configuración Manual de Matriz de Puntuación (COMPLETADA)**
    *   **Como** Administrador de ONG,
    *   **Quiero** ingresar y personalizar manualmente la cantidad de puntos asignados a cada posición de llegada dentro del Paso 1 del Wizard de Seriales,
    *   **Para** adaptar el sistema de puntuación del campeonato a la normativa oficial de mi liga o disciplina.
    *   **Criterios de Aceptación:**
        *   **Dado que** estoy en la "Sección 2: Estructura Competitiva Global" del wizard,
        *   **Cuando** cargo la vista,
        *   **Entonces** el sistema me presenta una tabla pre-poblada con 10 posiciones y sus puntos por defecto (100, 80, 60...).
        *   **Dado que** necesito ajustar la puntuación,
        *   **Cuando** hago clic en "Agregar posición" o en el ícono de basura,
        *   **Entonces** puedo añadir o eliminar filas de la matriz de puntuación dinámicamente.
        *   **Dado que** he configurado la matriz,
        *   **Cuando** guardo el serial,
        *   **Entonces** la configuración de `pointMatrix` se persiste correctamente en Firestore.

*   **HU-02: Habilitación Global de Menores de Edad**
    *   **Como** Organizador de ONG,
    *   **Quiero** definir desde el Paso 1 del Wizard si el campeonato permite la participación de menores de edad,
    *   **Para** que esta configuración se herede de forma automatizada y obligatoria a todas las etapas (eventos) asociadas.
    *   **Criterios de Aceptación:**
        *   **Dado que** estoy en la "Sección 3: Reglas de Negocio y Límites",
        *   **Cuando** activo el switch "Permitir inscripción de menores de edad",
        *   **Entonces** el campo `allowsMinors` se establece en `true`.
        *   **Dado que** guardo el serial con la opción de menores activada,
        *   **Cuando** el sistema crea las etapas (eventos),
        *   **Entonces** cada documento de evento en Firestore tiene la propiedad `allowsMinors` en `true`.
        *   **Dado que** un usuario visita la página de una etapa que permite menores,
        *   **Cuando** abre el widget de inscripción,
        *   **Entonces** la opción "Inscribir a un menor" está visible y habilitada.

*   **HU-03: Botón de Cancelación y Salida Segura**
    *   **Como** Usuario ONG,
    *   **Quiero** disponer de un botón de "Cancelar" en la barra de navegación del Wizard,
    *   **Para** salir del flujo de creación de forma segura descartando los datos no guardados.
    *   **Criterios de Aceptación:**
        *   **Dado que** estoy en cualquier paso del wizard de creación de seriales,
        *   **Cuando** hago clic en el botón "Cancelar",
        *   **Entonces** se despliega un diálogo de confirmación preguntando si estoy seguro de salir.
        *   **Dado que** confirmo la cancelación,
        *   **Cuando** hago clic en "Sí, cancelar y salir",
        *   **Entonces** soy redirigido a la URL `/dashboard/ong?tab=events`.

*   **HU-04: Desacoplamiento de Identidad Competitiva para Menores**
    *   **Como** Motor del Campeonato,
    *   **Quiero** identificar a los participantes (adultos y menores) por una clave única,
    *   **Para** que los números de placa, tiempos y puntos se asignen individualmente sin ambigüedad.
    *   **Criterios de Aceptación:**
        *   **Dado que** un adulto inscribe a un menor en una etapa,
        *   **Cuando** se genera el boleto (ticket),
        *   **Entonces** el documento contiene el `userId` del padre y el `dependentId` del hijo.
        *   **Dado que** se asigna un número de placa para el serial,
        *   **Cuando** la función `assignSerialBibNumber` se ejecuta,
        *   **Entonces** utiliza el `dependentId` como clave si existe; de lo contrario, usa el `userId`.
        *   **Dado que** se procesa el leaderboard del serial,
        *   **Cuando** se calculan los puntos,
        *   **Entonces** los puntos de un menor se asocian a su `dependentId` y se reflejan en su categoría, separados de los del padre.

*   **HU-05: Estilo y Legibilidad del Título en Hero Banner**
    *   **Como** Visitante del Campeonato,
    *   **Quiero** que el nombre del serial en el banner principal (Hero) se renderice en color blanco con sombra,
    *   **Para** garantizar una legibilidad óptima sobre cualquier imagen de fondo.
    *   **Criterios de Aceptación:**
        *   **Dado que** visito la página pública de un serial,
        *   **Cuando** se renderiza el banner principal,
        *   **Entonces** el título `<h1>` tiene el texto en blanco y con sombra (`drop-shadow-md`).
        *   **Dado que** la imagen de fondo puede ser clara,
        *   **Cuando** se muestra el banner,
        *   **Entonces** una capa semitransparente (`bg-black/50`) se superpone a la imagen para asegurar el contraste.

### Psicología UX

El flujo propuesto minimiza la carga cognitiva al agrupar lógicamente los campos en secciones claras dentro del wizard. La inclusión de valores por defecto para la matriz de puntos (HU-01) reduce la fricción inicial, ofreciendo una base estándar que el usuario puede ajustar en lugar de empezar de cero. El diálogo de confirmación para cancelar (HU-03) es una red de seguridad crucial que previene la pérdida accidental de datos, un patrón de diseño fundamental para la usabilidad en formularios largos.

---

## Fase 2: Arquitectura y Análisis Técnico

### Impacto Tecnológico

*   **Modelos de Datos:**
    *   **Colección `serials`:** Se añadirá el campo `pointMatrix` (Array de `Objetos { position: number, points: number }`) y `allowsMinors` (boolean).
    *   **Colección `events`:** Se añadirá el campo `allowsMinors` (boolean), heredado del serial.
    *   **Colección `tickets`:** No hay cambios estructurales, pero se refuerza la lógica de negocio sobre los campos `userId` y `dependentId`.
    *   **`types.ts`:** Se crearán de forma aditiva las siguientes interfaces para garantizar el tipado estricto sin modificar las existentes:
        ```typescript
        export interface PointMatrixItem {
          position: number;
          points: number;
        }

        export interface SerialExtended extends Serial {
          pointMatrix: PointMatrixItem[];
          allowsMinors: boolean;
        }
        ```

*   **Flujo de Ejecución:**
    *   La `Server Action` `createSerialWithStagesAction` (`src/lib/actions/serial-actions.ts`) será el punto central de la lógica. Orquestará la escritura del nuevo documento en `serials` (con `pointMatrix` y `allowsMinors`) y propagará `allowsMinors` a cada uno de los eventos creados en la transacción batch.
    *   La función `assignSerialBibNumber` (`src/lib/actions/serial-bib-service.ts`) modificará su lógica de clave para usar `dependentId` si está presente.
    *   La función de agregación en `serial-leaderboard-actions.ts` (`src/lib/actions/serial-leaderboard-actions.ts`) deberá ser actualizada para agrupar los resultados por `dependentId` cuando corresponda.

### Mapeo de Archivos

*   **Archivos a Modificar (Edición Quirúrgica):**
    1.  `src/components/ong/serial-wizard/step-serial-general-info.tsx`
    2.  `src/components/ong/serial-wizard/serial-wizard.tsx`
    3.  `src/lib/actions/serial-actions.ts`
    4.  `src/lib/actions/serial-bib-service.ts`
    5.  `src/lib/actions/serial-leaderboard-actions.ts`
    6.  `src/components/public/serial/hero-banner-serial.tsx`
    7.  `src/lib/types.ts` (solo para añadir nuevos tipos)
    8.  `src/lib/schemas.ts` (para el nuevo esquema de Zod)

*   **Archivos Nuevos:**
    *   Ninguno.

### Comando Git

```bash
git checkout -b feature/serial-scoring-minor-management
```

---

## Fase 3: QA & Zero-Regressions

### Plan de Pruebas

| Escenario (HU) | Pasos a Seguir | Resultado Esperado |
| :--- | :--- | :--- |
| **HU-01** | 1. Navegar al wizard de seriales. 2. En el paso 1, verificar la tabla de puntos por defecto. 3. Añadir 2 posiciones, eliminar 1. 4. Completar el wizard. 5. Verificar en Firestore que el documento del serial tiene el `pointMatrix` correcto. | La matriz de puntos se guarda con los valores exactos configurados por el usuario. |
| **HU-02** | 1. Crear un serial activando "Permitir menores". 2. Verificar en Firestore que el serial y sus eventos tienen `allowsMinors: true`. 3. Ir a la landing de una etapa y abrir el widget de registro. | La opción "Inscribir a un menor" debe estar visible. |
| **HU-03** | 1. En el paso 2 del wizard, hacer clic en "Cancelar". 2. En el modal, hacer clic en "Continuar configurando". 3. Volver a hacer clic en "Cancelar" y luego en "Sí, cancelar y salir". | 1. El modal se cierra, el wizard sigue activo. 2. El usuario es redirigido a `/dashboard/ong?tab=events`. |
| **HU-04** | 1. Con una cuenta de adulto, inscribirse a sí mismo y a un menor en un evento de un serial. 2. Verificar la colección `tickets` en Firestore. 3. Verificar en la sección de "Administrar Serial" que se asignaron dos números de placa distintos. 4. Simular resultados y correr el proceso del leaderboard. | 1. Se crean dos boletos (uno con `dependentId`, otro nulo). 2. El padre y el hijo aparecen en el leaderboard en sus respectivas categorías con puntos separados. |
| **HU-05** | 1. Navegar a la página pública de cualquier serial. | El título del serial debe ser blanco, con sombra y superpuesto a un overlay oscuro que cubre la imagen de fondo. |

### No-Regresión

1.  **Flujo de Creación de Evento Único:** Verificar que la creación de un evento individual (fuera de un serial) no se vea afectada y funcione correctamente.
2.  **Inscripción a Evento sin Serial:** Probar el flujo de inscripción de un adulto y un menor a un evento que no pertenece a ningún campeonato.
3.  **Leaderboard de Evento Único:** Asegurarse de que la tabla de posiciones de un evento individual siga funcionando correctamente.
4.  **Wizard de Edición de Evento:** Comprobar que el formulario para editar un evento existente no presente errores y guarde los cambios.
5.  **Permisos de ONG:** Validar que solo los administradores de la ONG pueden ver y acceder al wizard de creación de seriales.

---

## Fase 4: Blueprint de Documentación

### Ruta del Archivo

`docs/features/serial-scoring-minor-management.md`

### Contenido del Documento

#### 1. Contexto de Negocio
Este documento detalla la implementación de nuevas funcionalidades críticas para la gestión de campeonatos (seriales) en la plataforma. Las historias de usuario clave incluyen la capacidad de los organizadores para personalizar la puntuación por posición (HU-01), habilitar la participación de menores de edad a nivel de todo el campeonato (HU-02), y un mecanismo de salida segura del wizard de creación (HU-03). Adicionalmente, se robustece el sistema de identidad competitiva para asegurar que los menores sean tratados como participantes únicos e independientes de sus tutores (HU-04) y se mejora la visibilidad del título en la landing page del serial (HU-05).

#### 2. Arquitectura y Diseño Técnico
El núcleo de la implementación reside en la modificación de la `Server Action` `createSerialWithStagesAction`. Esta acción recibirá los nuevos campos `pointMatrix` y `allowsMinors` desde el formulario del wizard. Persistirá estos datos en el nuevo documento de la colección `serials` y, crucialmente, propagará el valor de `allowsMinors` a todos los eventos que se creen en lote para ese serial, asegurando la herencia de la configuración.

La lógica de asignación de dorsales (`serial-bib-service.ts`) y el cálculo de la tabla de posiciones (`serial-leaderboard-actions.ts`) se modificarán para utilizar una clave de atleta condicional: `ticket.dependentId` si existe, o `ticket.userId` en caso contrario. Esto desacopla la identidad competitiva del menor de la cuenta de su tutor.

El esquema de Zod en `src/lib/schemas.ts` se extenderá para validar la nueva estructura de `pointMatrix`.

#### 3. Detalles de Implementación (El Bisturí)

*   **`src/lib/schemas.ts` (Adición):**
    *   Se añadirá un nuevo esquema para la matriz de puntos que valide que `position` sea un entero positivo y `points` sea un número no negativo.

*   **`src/components/ong/serial-wizard/step-serial-general-info.tsx` (Modificación):**
    *   **HU-01 (Inicialización de Estado):** La llamada a `useForm` se inicializará con los valores por defecto para `pointMatrix`.
        ```typescript
        const form = useForm<z.infer<typeof a>>({
          // ... resolver,
          defaultValues: {
            // ... otros valores
            pointMatrix: [
              { position: 1, points: 100 },
              { position: 2, points: 80 },
              { position: 3, points: 60 },
              { position: 4, points: 50 },
              { position: 5, points: 40 },
              { position: 6, points: 30 },
              { position: 7, points: 25 },
              { position: 8, points: 20 },
              { position: 9, points: 15 },
              { position: 10, points: 10 },
            ],
            allowsMinors: false,
          },
        });
        ```
    *   **HU-02 (Control de UI):** Se agregará un componente `<Switch />` de `shadcn/ui` en la sección 3.
        ```tsx
        <FormField
          control={form.control}
          name="allowsMinors"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Menores de Edad</FormLabel>
                <FormDescription>
                  Permitir inscripción de menores de edad en este campeonato.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        ```

*   **`src/components/ong/serial-wizard/serial-wizard.tsx` (Modificación):**
    *   **HU-03 (Botón y Diálogo):** Se añadirá un componente `<AlertDialog>` y el botón de "Cancelar".
        ```tsx
        <div className="flex justify-between pt-6 border-t mt-8">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-red-600">Cancelar</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Cancelar creación del campeonato?</AlertDialogTitle>
                <AlertDialogDescription>
                  Todos los datos capturados en el formulario se perderán. ¿Estás seguro de que deseas salir?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Continuar configurando</AlertDialogCancel>
                <AlertDialogAction onClick={() => router.push('/dashboard/ong?tab=events')}>
                  Sí, cancelar y salir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {/* ... Botones Siguiente/Anterior */}
        </div>
        ```

*   **`src/lib/actions/serial-bib-service.ts` (Modificación):**
    *   **HU-04 (Clave de Atleta):** Se inyectará la lógica de clave condicional.
        ```typescript
        // Dentro de la función assignSerialBibNumber, al procesar cada ticket
        const athleteKey = ticket.dependentId ? ticket.dependentId : ticket.userId;
        // ... usar athleteKey para buscar si ya tiene un bib asignado
        ```

*   **`src/components/public/serial/hero-banner-serial.tsx` (Modificación):**
    *   **HU-05 (Estilos):** Se aplicarán las clases de Tailwind exactas.
        ```tsx
        <div className="relative h-[40vh] w-full">
          {/* ... Imagen de fondo */}
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 flex items-center justify-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white drop-shadow-md tracking-tight">
              {serial.name}
            </h1>
          </div>
        </div>
        ```

#### 4. Impacto en UI/UX y Casos Borde
La principal mejora de UX es la reducción de la fricción en la configuración del serial. Un caso borde a considerar es la edición de un serial ya existente: la lógica deberá manejar la actualización de `allowsMinors` en los eventos futuros, pero no en los que ya han ocurrido. Otro caso es si un usuario intenta ingresar puntos negativos o posiciones duplicadas en la matriz; el esquema Zod debe prevenirlos eficazmente.

#### 5. QA y Zero-Regressions
El plan de pruebas se centra en validar cada historia de usuario de forma aislada y luego en conjunto. Las pruebas de no regresión son cruciales para garantizar que los flujos de eventos únicos (la funcionalidad original) no se vean comprometidos por la nueva lógica de seriales. Se debe prestar especial atención a la correcta asignación de puntos en el leaderboard, tanto para adultos como para menores.

#### 6. Rollout y Rollback
*   **Rollout:** El despliegue se realizará fusionando la rama `feature/serial-scoring-minor-management` en `develop` y posteriormente en `main`, siguiendo el flujo de Gitflow definido en `DEVELOPMENT_GUIDELINES.md`. No se requieren migraciones de datos complejas, ya que los nuevos campos son aditivos.
*   **Rollback:** En caso de un fallo crítico, se puede revertir el commit de la fusión en la rama `main`. Dado que los cambios son aditivos, la reversión no debería causar pérdida de datos en las estructuras existentes.

---
Análisis completado. ¿Autorizas la creación de la rama, documentación del requerimiento y el inicio de la implementación quirúrgica, Product Owner?
