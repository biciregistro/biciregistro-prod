# Especificación Funcional (FRD): Motor de Seriales y Campeonatos

**Módulo:** Motor de Seriales y Campeonatos para Biciregistro.mx
**Versión:** 2.2 (Simplificación Arquitectónica: Unificación de Asignación de Placas)
**Rol:** Product Owner / Business Analyst / Technical Architect

---

## 1. Introducción y Arquitectura del Sistema

### 1.1 Objetivo del Módulo
El objetivo principal de este módulo es robustecer la arquitectura actual del "Event Manager" para permitir la agrupación de eventos independientes en "Seriales" o "Campeonatos" estructurados. El sistema debe automatizar la asignación de números de corredor permanentes, implementar tablas de clasificación globales (Leaderboards) calculadas por puntos por categoría, y generar una Landing Page Pública del serial que muestre Detalles, Carreras y Tabla de resultados. El propósito técnico y de negocio es optimizar la interfaz móvil del ciclista para maximizar el engagement, la competitividad y la retención de usuarios activos mensuales (MAU).

### 1.2 Patrón de Arquitectura: Wrapper (Agrupador Ligero)
Para implementar esta funcionalidad sin saturar ni comprometer el desempeño de la base de datos de Firestore actual de eventos individuales, se diseñará un patrón de arquitectura tipo Wrapper (Agrupador Ligero).
Un evento individual seguirá operando de forma totalmente autónoma en su lógica interna (basado en la entidad `Event` de `src/lib/types.ts`), pero responderá a las restricciones de una entidad jerárquica superior llamada `Serial`.

* **Autonomía:** La creación de un registro en la tabla de un evento individual (Hijo) no se verá afectada ni requerirá parámetros obligatorios si este no pertenece a ningún campeonato.
* **Restricción de Asociación:** El backend debe restringir que un mismo evento esté asociado a más de un Serial de forma simultánea.

---

## 2. Estrategia de Lanzamiento: MVP vs Incrementales

Para mitigar riesgos técnicos y entregar valor rápido a los usuarios, el desarrollo se segmentará en las siguientes fases de despliegue continuo:

**MVP (Minimum Viable Product)**
* **Etapa 1:** Panel Autogestionable de Creación de Seriales (UX/UI B2B) - Creación de la Entidad Wrapper y generación masiva de Eventos Hijos reutilizando el actual `EventWizard`.
* **Etapa 3:** Interfaz del Ciclista (PWA UX/UI B2C) - Creación del carril "Mis Seriales" en el Dashboard y asignación del "Número Único Permanente". Leaderboard funcional (actualización inicial mediante tablas estáticas/manuales o CSV simple).
* **Etapa 7:** Reglas del Sistema y Blindaje - Criterios de desempate y lógica de estados especiales.

**Incrementales (Post-MVP)**
* **Etapa 2:** Gestión de Co-Organizadores (Gobernanza B2B) - Sistema de permisos granulares para ligas locales.
* **Etapa 4:** Procesamiento de Resultados por IA y Asignación de Puntos - Ingesta automatizada de PDF/Imágenes, Match Cruzado y Background Worker para el Leaderboard dinámico y en tiempo real.
* **Etapa 5:** Motor de Gamificación e Interacción - Integración con el sistema de B-Coins y efectos visuales de Confetti en la PWA.

---

## 3. Etapa 1: Panel Autogestionable de Creación de Seriales (UX/UI B2B) [MVP]

El sistema debe habilitar el panel autogestionable de creación de Seriales dentro de la pestaña "Eventos" en el perfil del usuario ONG (`src/components/ong/ong-dashboard-tabs.tsx`), aprovechando de forma nativa la herramienta de clonación y creación de eventos existentes.

### 3.1 Flujo del Usuario ONG
1.  El usuario administrador de la ONG ingresa a su Dashboard principal (`/dashboard/ong`).
2.  Navega e ingresa a la pestaña "Eventos".
3.  Visualiza un botón destacado con la etiqueta **“Crear Campeonato”**.
4.  Al hacer clic, se despliega un Wizard (asistente guiado por pasos) interactivo: `[Paso 1: Información General] ---> [Paso 2: Detalles y Reglas] ---> [Paso 3: Confirmación y Despliegue]`.

### 3.2 Especificación de Campos del Wizard

**Paso 1: Nombre e información del serial**
* **Imagen Hero:** Componente de carga de arrastrar y soltar (`ImageUpload`) para la imagen de portada del serial.
* **Nombre del Serial:** Campo de texto obligatorio.
* **Descripción del Serial:** Área de texto enriquecido para los detalles del campeonato.
* **Ubicación:** Selector de País y selector de estado (reutilizando la lógica y librerías definidas del proyecto: `src/lib/countries.ts` y `src/lib/cities.ts`).
* **Guía del Corredor:** Carga obligatoria del archivo PDF con el reglamento técnico.
* **Logos de Patrocinadores:** Componente de carga múltiple de imágenes para marcas patrocinadoras.
* **Co-Organizadores [Incremental]:** Campo de vinculación mediante correo electrónico. El usuario co-organizador seleccionado deberá contar con una cuenta activa de Biciregistro con el rol de ONG creada previamente. Esto otorgará permisos para que visualicen y editen los eventos asignados dentro de su propia sección.

**Paso 2: Detalles del serial**
* **Cantidad de Fechas (Estructura de Carreras):** Interfaz con opción “+” para añadir etapas secuenciales. El sistema asignará un nombre genérico automático bajo la nomenclatura: `Fecha {Consecutivo} - {Nombre del serial}`. Para cada fecha, el organizador elegirá obligatoriamente: fecha, hora y precio individual.
* **Transparencia de Costos:** El cálculo del fee de Biciregistro debe desglosarse por separado de manera explícita (reutilizando el esquema `CostSection`).
* **Cupo Máximo Global:** Campo numérico para definir el límite total de participantes únicos que el campeonato puede albergar en toda su duración.
* **Puntos por Posición:** Matriz de configuración para definir el puntaje otorgado por lugar de llegada (1er lugar, 2° lugar, etc.).
* **Categorías:** Lista de selección múltiple que reutiliza el configurador de categorías preexistente en los eventos del sistema.
* **ID de Afiliación Requerido:** Switch de activación booleana. Si se encuentra activo (True), el formulario de inscripción pública de cada evento hijo habilitará obligatoriamente un campo para capturar el "Número de afiliación del corredor".

**Paso 3: Creación de evento**
Al completar los pasos anteriores, se habilitará el botón final “Crear Campeonato”. Al accionarlo, el sistema ejecutará en backend la creación de la entidad `Serial` (en Firestore) y persistirá de forma automática los eventos hijos vinculados (tipo `Event`), replicando la información base configurada de manera masiva (Nombre genérico, categorías y precios).

### 3.3 Reglas de Negocio del Organizador
* **Regla de Desconexión de Eventos:** Si el organizador remueve una carrera de un Serial, el sistema debe limpiar la asociación en todos los boletos emitidos para esa fecha, pero bajo ninguna circunstancia debe eliminar los registros de inscripción individuales ni borrar la carrera del Event Manager. El evento volverá a operar como una carrera independiente suelta.

### 3.4 Landing Page del Serial (`/serial/{FriendlyURL}`)
Al guardarse el campeonato, el sistema creará una URL amigable (Friendly URL) optimizada para SEO de manera automática (Ejemplo: `/serial/campeonato-nacional-gravel`). El diseño visual heredará el mismo Layout del perfil público de la ONG (`/join/ong`) y se estructurará de la siguiente forma:

* **Hero Banner:** Muestra el Nombre del campeonato, Nombre de la ONG organizadora y las Fechas globales de inicio y finalización del serial (calculadas dinámicamente tomando la fecha de la primera y última carrera asociada).
* **Tira de Patrocinadores:** Carrusel horizontal de logos institucionales, reutilizando el componente nativo de patrocinadores del sitio (`SponsorsCarousel`).
* **Cronograma Dinámico (Feed de Carreras):** Listado vertical o carrusel de las etapas hijas (`EventCard`) ordenadas cronológicamente por fecha. Cada tarjeta de carrera mostrará los detalles básicos del evento, un botón directo de inscripción individual para esa fecha específica, y un badge visual que indique el estado de la carrera (Finalizado o Próximamente).
* **Sección de Leaderboard Global:** Renderizado en tiempo real de la tabla general de posiciones por puntos acumulados. La navegación se organizará mediante pestañas por categorías. Mostrará el avatar del ciclista, categoría, puntaje total acumulado y su posición general dentro del campeonato. Los primeros 3 lugares de la tabla general deberán contar con un badge destacado de medalla o copa en su color correspondiente (oro, plata o bronce).
* **Sincronización en Tiempo Real:** Los datos de fechas, ubicaciones y guías de competidor desplegados en la Landing Page del Serial deben actualizarse automáticamente y en tiempo real al modificarse los datos origen en los eventos hijos.
* **Inscripción y Pago (Flujo Individual):** El usuario se inscribirá y pagará de forma individual carrera por carrera bajo el motor de pagos actual (integrado 100% con MercadoPago). No existen transacciones multi-evento simultáneas.

#### Criterios de Aceptación (Etapa 1 - BDD)

```gherkin
Escenario: Creación exitosa de un Serial y replicación de eventos hijos
  Dado que un usuario ONG con sesión activa ingresa a la sección "Eventos"
  Cuando hace clic en "Crear Campeonato" y completa los 3 pasos del Wizard con datos válidos
  Y confirma la creación presionando el botón "Crear Campeonato"
  Entonces el sistema debe guardar la entidad Serial en la base de datos (Firestore)
  Y generar automáticamente N eventos hijos con el formato "Fecha {N} - {Nombre Serial}"
  Y exponer públicamente la Landing Page en la ruta indexada `/serial/{friendly-url}`
```

## 4. Etapa 2: Gestión de Co-Organizadores (Gobernanza B2B) [Incremental]

Esta funcionalidad permite que los co-organizadores seleccionados por el creador del serial puedan visualizar y editar un evento específico del campeonato, atendiendo la necesidad operativa de las ligas donde la gestión global pertenece a una entidad pero la logística en campo depende de un organizador local.

### 4.1 Flujo del Co-Organizador
* El usuario co-organizador inicia sesión en su cuenta de Biciregistro.
* Se dirige a la pestaña de "Eventos" de su panel.
* Visualiza exclusivamente las carreras del serial a las cuales fue asignado explícitamente como co-organizador por el creador del campeonato.
* Al ingresar a "Gestionar Evento", la herramienta se comportará como un evento independiente regular sujeto a la matriz de permisos.

### 4.2 Matriz de Permisos y Restricciones del Co-Organizador
El co-organizador tiene acceso total para auditar y controlar la operación en campo del evento asignado, pero el sistema aplicará bloqueos duros en los campos que rompan la consistencia del campeonato.

| Módulo / Función del Evento | Permiso | Restricción / Comportamiento del Sistema |
| :--- | :--- | :--- |
| **Lista de Participantes** | READ / WRITE | Visualización completa, descarga de reportes y asignaciones locales. |
| **Documentos y Responsivas** | READ / WRITE | Carga, edición y validación de formatos de deslinde legal en campo. |
| **Estatus de Pago** | READ / WRITE | Monitoreo del flujo de transacciones de sus inscritos individuales. |
| **Detalles Logísticos** | WRITE | Modificación de descripciones, ubicación, rutas de Strava y horarios. |
| **Categorías de Competencia** | BLOQUEADO | Deshabilitado. Están configuradas estrictamente por el organizador del serial. |
| **Precios de Inscripción** | BLOQUEADO | Deshabilitado. El costo está bloqueado por el creador del campeonato. |
| **Asignación de Números** | BLOQUEADO | Deshabilitado. Responde a la estrategia estructural centralizada del Serial padre. |

## 5. Etapa 3: Interfaz del Ciclista (PWA UX/UI B2C) [MVP]

Diseñar e integrar el centro de control competitivo del usuario dentro de la aplicación móvil (PWA) y de escritorio de Biciregistro (`/dashboard`), estructurando un ecosistema dinámico que explote el deseo de superación y el FOMO (Fear of Missing Out).

### 5.1 Flujo de Descubrimiento e Inscripción
* En la sección general de "Eventos" (filtrados por la ciudad del ciclista), se indexarán las tarjetas visuales de los Seriales activos junto a los eventos tradicionales.
* Al explorar un serial en el que no está inscrito, el ciclista visualizará los detalles del campeonato configurados por el organizador y la lista de carreras ordenadas por fecha con sus respectivos badges de estado (Próximamente o Finalizado).
* El proceso de inscripción a una carrera del serial se ejecutará bajo el mismo flujo individual existente para un evento normal.
* **Regla de Oro del Número Único:** Al completar la inscripción para la primera carrera del serial en la que participe el ciclista, el número de placa/bib asignado automáticamente por el motor se convertirá en su número permanente e idéntico para todos los eventos restantes de ese campeonato.

### 5.2 El Carril "Mis Seriales"
En el momento en que un ciclista se inscribe a al menos una carrera que forme parte de un campeonato, la sección "Eventos" de su PWA habilitará un nuevo carril prioritario con desplazamiento horizontal (en ambiente móvil) denominado "Mis Seriales".

### 5.3 Anatomía de la Ventana del Serial Activo
Al ingresar a un campeonato del carril "Mis Seriales", la pantalla se dividirá en dos zonas de interacción controladas:

#### A. Cabecera Fija: Ficha del Competidor
Despliega el perfil del usuario adaptado al campeonato de forma estática en la parte superior:
* **Número de Placa Permanente:** Renderizado en un contenedor destacado de alta visibilidad visual.
* **Categoría de Competencia:** La categoría oficial en la que se encuentra registrado en el serial.
* **Posición Actual en el Campeonato:** Puesto en el ranking global calculada en tiempo real (Ejemplo: 🏆 4º Lugar).
* **Puntos Acumulados:** Sumatoria total de los puntos obtenidos en las etapas procesadas.
* **Descarga de Guía:** Botón de acción directa para descargar el PDF de la Guía del Corredor del serial.

#### B. Cuerpo de la Ventana: Carriles de Progresión Horizontal
Debajo de la ficha fija, las etapas del campeonato se organizarán dinámicamente en carriles horizontales según sus estados lógicos:
* **Carril 1: Etapas Completadas:** Muestra las carreras finalizadas por el usuario. Cada tarjeta detalla la Posición Lograda en la carrera, su Tiempo Oficial de Chip, la diferencia de tiempo respecto al 1er lugar de la categoría y los Puntos netos ganados en esa fecha específica.
* **Carril 2: Etapas Próximas (Inscrito):** Muestra las carreras futuras donde el usuario ya completó su pago individual. Detalla la fecha del evento, botón de acceso al mapa de ruta de Strava y el link de descarga de la Guía del Competidor específica de la etapa.
* **Carril 3: Etapas Faltantes (No Inscrito):** Muestra las carreras del serial donde el ciclista no se ha registrado. El sistema bloqueará los accesos de la carrera y mostrará un botón de compra directo y contextualizado con el texto: "Asegura tus puntos e inscríbete a esta etapa aquí" para incentivar la venta cruzada.

#### C. Acceso al Leaderboard de la Categoría
La ventana incluirá el botón "Ver Tabla General". Al ser accionado, abrirá una vista de pantalla completa (Modal) que cargará el Leaderboard de la categoría del ciclista, resaltando la fila de su perfil con un color de contraste distintivo para permitirle evaluar de forma inmediata la brecha de puntos respecto a sus rivales directos.

## 6. Etapa 4: Procesamiento de Resultados por IA y Asignación de Puntos [Incremental]

El sistema automatizará la ingesta de archivos de cronometraje independientes mediante un motor de Inteligencia Artificial para procesarlos, descomponerlos y mapear los resultados generales del campeonato de forma agnóstica.

### 6.1 Flujo de Ingesta y Extracción de Datos
* El organizador puede cargar cualquier tipo de archivo de resultados provisto por la empresa de cronometraje, soportando formatos CSV, Excel, PDF o archivos de Imagen.
* El motor de IA extraerá de forma autónoma e identificará los siguientes campos normalizados: Número de Placa (Bib/Placa), Nombre del Corredor, Categoría, Género / Rama y Tiempo de Chip.
* **Match Cruzado del Ecosistema:** El backend leerá el "Número de Placa" extraído por la IA y buscará al usuario de Biciregistro propietario de ese número dentro de la base de datos de inscritos del Serial.
* **Pantalla de Validación de Resultados (Fallback Mechanism):** Al concluir el procesamiento, el sistema pintará una pantalla intermedia de auditoría que mostrará las posiciones emparejadas y la asignación de puntos propuesta. Si existen errores de chip (Ej. #422 en vez de #42), se habilitará la corrección manual. El organizador revisará que no existan inconsistencias y presionará el botón "Validar y Publicar".

### 6.2 Procesamiento en Segundo Plano (Background Worker)
En el instante en que el organizador cambie el estatus de los resultados de un evento hijo a "Publicados", se gatillará un proceso en segundo plano (Background Worker). Este proceso recalculará las posiciones globales del campeonato, convertirá los lugares de la etapa en puntos de acuerdo con la matriz configurada en el Serial y refrescará el Leaderboard general en un tiempo máximo de 30 segundos.
Una vez completado el procesamiento, la app actualizará la Ficha del Competidor en la vista del ciclista con los nuevos valores históricos.

### 6.3 Reglas de Negocio del Puntaje por Categoría
* **Llave de Vinculación Inmutable:** Los puntos acumulados en el campeonato se encuentran vinculados estrictamente a la llave compuesta formada por Usuario_ID + Categoria_ID.
* **Regla de Congelamiento por Cambio de Categoría:** Si un ciclista decide cambiar de categoría a mitad de la temporada, los puntos obtenidos en las etapas anteriores quedarán completamente congelados en la tabla de la categoría previa. El usuario comenzará con 0 puntos en la tabla de la nueva categoría elegida, pero conservará su número de placa original asignado al inicio del Serial.

#### Criterios de Aceptación (Etapa 4 - BDD)

```gherkin
Escenario: Publicación de resultados y actualización del Leaderboard en segundo plano
  Dado que un organizador ha cargado un archivo PDF de tiempos y la IA ha procesado los campos básicos
  Cuando el organizador presiona el botón "Validar y Publicar"
  Entonces el sistema debe cambiar el estado del evento hijo a "Publicados"
  Y activar el Background Worker nativo para calcular los puntos del Serial
  Y actualizar la tabla global del Leaderboard en un tiempo menor a 30 segundos
  Y actualizar la Ficha del Competidor de los ciclistas vinculados de forma inmediata
```

## 7. Etapa 5: Motor de Gamificación e Interacción (B-Coins) [Incremental]

Permitir que los ganadores de las etapas del serial obtengan B-Coins para canjear dentro del mercado interno de recompensas de Biciregistro, celebrando el rendimiento deportivo con componentes interactivos en la UI.

### 7.1 Configuración de la Recompensa
Desde el panel de administración de gamificación del sistema, el superadministrador configurará la cantidad exacta de B-Coins a otorgar para los primeros tres lugares ganadores de una carrera del serial (1er lugar, 2° lugar y 3er lugar).

### 7.2 Activación del Efecto Confetti en la UI (`src/lib/confetti.ts`)
* **Ganadores del Podio:** Los usuarios que se posicionen en el 1er, 2° o 3er lugar de su categoría en una carrera de serial recibirán la asignación automática de los B-Coins configurados en su wallet. El sistema disparará una animación interactiva de efecto confetti a pantalla completa en la PWA.
* **Disparador del Efecto (Trigger):** La animación de confetti y la notificación de abono de monedas se activarán de manera exacta en el momento en que el ciclista ingrese a la aplicación a consultar sus resultados validados.
* **Reconocimiento al Esfuerzo General:** Para mantener la motivación y aumentar la retención (MAU) de toda la comunidad, los ciclistas que finalicen la carrera fuera de las posiciones de podio (lugar 4 en adelante) también recibirán una animación de confetti en la pantalla al consultar sus resultados, acompañada de un mensaje de reconocimiento a su esfuerzo y participación en la etapa.

#### Criterios de Aceptación (Etapa 5 - BDD)

```gherkin
Escenario: Ciclista del podio consulta sus resultados oficiales
  Dado que los resultados de una carrera han sido publicados y el ciclista obtuvo el 2° lugar de su categoría
  Cuando el ciclista inicia sesión en la PWA y navega a la sección de resultados de la etapa
  Entonces el sistema debe abonar la cantidad de B-Coins correspondiente a su Wallet
  Y renderizar la animación de confetti en la pantalla como recompensa visual

Escenario: Ciclista fuera del podio consulta sus resultados oficiales
  Dado que un ciclista finalizó en la posición 15 de su categoría
  Cuando el ciclista ingresa a la vista de resultados oficiales de la etapa en la PWA
  Entonces el sistema no debe acreditar B-Coins de podio en su cuenta
  Y debe disparar la animación de confetti de esfuerzo junto con el texto de reconocimiento de participación
```

## 8. Reglas del Sistema y Casos de Excepción (Blindaje de Producción) [MVP]

Esta sección consolida las restricciones técnicas y lógica matemática necesaria para resolver escenarios ambiguos en producción, asegurando la consistencia e integridad de los datos de la plataforma.

### 8.1 Criterios de Desempate en el Leaderboard Global (Tie-breaker Rules)
A igualdad de puntos acumulados en la misma categoría al finalizar una etapa o campeonato, el sistema resolverá de forma jerárquica el orden de los ciclistas en la tabla general bajo la siguiente lógica matemática:
* **Criterio Primario:** Tendrá prioridad el corredor que haya obtenido la mejor posición en la última fecha cronológica disputada del serial.
* **Criterio Secundario:** En caso de persistir el empate, el sistema calculará la sumatoria del tiempo total de chip de las etapas donde ambos ciclistas hayan cruzado la meta. El ciclista con el menor tiempo acumulado obtendrá la posición superior en el ranking.

### 8.2 Gestión de Estados Especiales: DNF, DNS y DSQ
Cuando el motor de IA extraiga del archivo de cronometraje registros con marcas de estado alfa en lugar de tiempos numéricos, el backend operará de la siguiente forma:
* Los estados DNF (Did Not Finish), DNS (Did Not Start) y DSQ (Disqualified) acumularán 0 puntos en la etapa correspondiente.
* **Renderizado en UI B2C:** En el carril de "Etapas Completadas" de la ventana del serial del ciclista, la tarjeta del evento de la PWA mostrará el badge visual del estado de carrera correspondiente (DNF/DNS/DSQ) con el campo de tiempo y posición numérica vacíos, asegurando que el usuario identifique el procesamiento de su estatus.

### 8.3 Mecanismo de Corrección Manual en el Match de la IA (Fallback Mechanism)
En caso de que el archivo del proveedor de chips contenga errores tipográficos (Ejemplo: placa #42 registrada como #422 inexistente) que impidan el match automático con el usuario de la plataforma:
* La pantalla intermedia de auditoría de resultados desplegará una alerta visual indicando las filas sin correlación de usuario encontrada.
* Se habilitará un botón de "Acción Manual" para que el organizador pueda editar la celda del número de placa o asociar directamente el ID del ciclista mediante un buscador predictivo antes de proceder con el botón final "Validar y Publicar".

#### Criterios de Aceptación (Etapa 8 - BDD)

```gherkin
Escenario: Empate exacto de puntos en la tabla general al término del serial
  Dado que el Ciclista A y el Ciclista B finalizan el campeonato con 350 puntos en la categoría "Master"
  Y el Ciclista A obtuvo la posición 3 en la última carrera y el Ciclista B obtuvo la posición 5
  Cuando el backend procesa el Leaderboard global
  Entonces el Ciclista A debe ser posicionado en el ranking por encima del Ciclista B
```