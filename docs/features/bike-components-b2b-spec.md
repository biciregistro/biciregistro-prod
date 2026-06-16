# Technical Specification: Módulo de Componentes B2B & Perfil 100%

## 1. Contexto de Negocio
**Objetivo Principal:** Habilitar un módulo para que los ciclistas registren los componentes exactos de sus bicicletas (y el material del cuadro). 
**Valor B2B:** Proveer data e insights anonimizados y de alta calidad a los fabricantes de la industria ciclista, potenciando la capacidad de los reportes generados por IA para segmentar audiencias y sugerir marcas afines de forma hiper-precisa.
**Valor B2C:** Aumentar el sentido de pertenencia del usuario mediante la gamificación (B-Coins) y el efecto psicológico de completar el 100% del "ADN" de su máquina.

## 2. Experiencia de Usuario (UX) y Psicología (HCI)

### 2.1 Divulgación Progresiva (Prevención de Fatiga)
Para evitar que el usuario abandone el formulario ante la cantidad de datos, el flujo de registro se divide estratégicamente:
1.  **Starter de Baja Fricción:** La primera pregunta del nuevo flujo será el **Material del Cuadro** (Aluminio, Carbono, Acero, Titanio, Bambú, Otro). Esto activa el sesgo de compromiso (*Sunk Cost Fallacy*).
2.  **Acordeón Inmersivo:** Los componentes se agruparán lógicamente (Frenado, Suspensión, Transmisión, Llantas, Puntos de Contacto).
3.  **Reducción de Alcance (MVP):** Para mantener el registro ágil (< 2 min), se **excluyen temporalmente** Ruedas/Rines y Baterías de E-Bikes.

### 2.2 Definición Estricta del Algoritmo de "Perfil 100%"
El cálculo del progreso de la bicicleta debe ser un algoritmo determinista evaluado sobre el objeto `Bike`. El documento "Factura / Comprobante" queda excluido de este cálculo.

**Grupo 1: Info Base (7 variables obligatorias)**
- `make` (String válido)
- `model` (String válido)
- `modelYear` (String/Number válido)
- `color` (String válido)
- `modality` (String válido)
- `serialNumber` (String válido, excluyendo prefijos `PENDING_`)
- `photos` (Array length >= 1)

**Grupo 2: Componentes Core (9 variables de validación)**
- `frameMaterial` (Debe existir)
- `components.brakes` (Evaluado como lleno si tiene `brand`/`model` OR `isGeneric` OR `isNotApplicable`)
- `components.fork` (Idem)
- `components.shock` (Idem, permitiendo `isNotApplicable` para Rígidas)
- `components.drivetrain` (Idem, permitiendo `isNotApplicable` para Fixies)
- `components.tires` (Idem)
- `components.saddle` (Idem)
- `components.grips` (Idem)
- `components.pedals` (Idem)

**Fórmula de Cálculo:**
`Completitud (%) = ( (Campos Base Llenos + Campos Componentes Llenos) / Total de Campos (16) ) * 100`
*Nota:* El campo `components.motor` solo sumará al denominador si `modality` incluye "E-Bike", ajustando el total de campos a 17.

### 2.3 Casos de Borde (Data Limpia)
Para proteger la integridad de los datos B2B, no obligaremos a los usuarios a mentir:
*   **Opciones "Out-out":** Las categorías incluyen botones explícitos que modifican los booleanos de estado:
    *   *Suspensión/Amortiguador:* `[No Aplica - Bici Rígida]` (`isNotApplicable: true`)
    *   *Transmisión:* `[No Aplica - Fixie / Single Speed]` (`isNotApplicable: true`)
    *   *General:* `[No lo sé / Marca Genérica]` (`isGeneric: true`)

## 3. Modelo de Datos (Data Layer)

### 3.1 Esquema de TypeScript y Firestore (`types.ts`)
Se implementarán adiciones quirúrgicas al contrato `Bike` sin romper la compatibilidad hacia atrás. Se abandonan los strings basura ("N/A") en favor de *flags* booleanos para consultas B2B eficientes:

```typescript
// Adiciones al modelo Bike
export interface Bike {
  // ... campos existentes ...
  
  // Nuevo campo raíz para el material
  frameMaterial?: 'Aluminio' | 'Carbono' | 'Acero' | 'Titanio' | 'Bambú' | 'Otro';
  
  // Nuevo nodo anidado opcional
  components?: BikeComponents;
}

export interface BikeComponents {
  brakes?: ComponentDetail;
  fork?: ComponentDetail;
  shock?: ComponentDetail;
  drivetrain?: ComponentDetail;
  tires?: ComponentDetail;
  motor?: ComponentDetail;
  saddle?: ComponentDetail;
  grips?: ComponentDetail;
  pedals?: ComponentDetail;
}

export interface ComponentDetail {
  brand?: string;
  model?: string;
  isNotApplicable?: boolean; // Flag true para Fixies, Rígidas (Backend B2B descarta este nodo)
  isGeneric?: boolean;       // Flag true para marcas desconocidas/genéricas
}
```

### 3.2 Blindaje de Frontend (Null Pointers y Lazy Migration)
Dado que millones de registros en Firestore no tendrán el nodo `components` al lanzar la feature:
*   **Regla Estricta de Lectura:** El frontend (React) y backend (Server Actions) **DEBEN** acceder a los sub-nodos exclusivamente a través de Optional Chaining (`?.`) y proveer *fallbacks* seguros.
    *   *Ejemplo Correcto:* `const brakeBrand = bike.components?.brakes?.brand ?? 'No registrado';`
    *   *Ejemplo Incorrecto:* `const brakeBrand = bike.components.brakes.brand; // Crash inminente`
*   **UI Resiliente:** Si `bike.components === undefined`, la UI asume estado "Vacío", habilitando los botones de "Agregar Componentes" sin generar errores de renderizado.

### 3.3 Sinergia con IA Genkit B2B
Los datos de `frameMaterial` y `components` (filtrando aquellos con `isNotApplicable: true` o `isGeneric: true`) se inyectarán en el contexto de los prompts (ej. `ai-report-actions.ts`). Esto permite a la IA analizar la correlación real entre el poder adquisitivo (ej. Cuadros de Carbono + Suspensiones Fox) para sugerir campañas de marketing ultra-dirigidas.

## 4. Gamificación (Economía y Gobernanza)

La recompensa de B-Coins será dinámica y gestionable desde el Admin Dashboard.

### 4.1 Nuevas Reglas en el Motor (`gamification-types.ts`)
Se añadirán dos nuevas llaves al catálogo, permitiendo al SuperAdmin ajustar sus valores:
1.  `action_component_completion`: Premia el llenado inicial de la sección de componentes (Ej. +30 B-Coins).
2.  `action_full_profile_100`: Premia alcanzar matemáticamente el 100% del perfil evaluado por el algoritmo (Ej. +50 B-Coins).

### 4.2 Feedback Visual y Protección Anti-Abuso (Idempotencia por Unidad)
Siguiendo la convención establecida (ej. sincronización de Strava), el sistema otorgará feedback visual y recompensas. Sin embargo, para evitar que los usuarios obtengan recompensas infinitas por editar la misma bicicleta repetidamente, pero permitiendo que ganen puntos por *cada* bicicleta nueva que completen, se implementará una validación estricta de idempotencia por unidad.

**Lógica de Validación Transaccional:**
La validación de idempotencia se ejecutará consultando la colección `gamification_history` de Firestore. El Server Action realizará una query que busque un documento donde coincidan los tres siguientes criterios:
1.  `userId` == ID del usuario actual.
2.  `actionId` == La llave de la acción (ej. `action_full_profile_100` o `action_component_completion`).
3.  `metadata.bikeId` == El ID específico de la bicicleta que el usuario está editando.

**Flujo de Ejecución:**
*   **Si la query retorna un documento:** Significa que **ESA** bicicleta específica ya recibió los puntos por este hito. El Server Action actualizará los datos de la bicicleta en la BD (para analítica B2B) pero retornará un "éxito silencioso". La UI mostrará un Toast normal ("Componentes actualizados") sin otorgar B-Coins adicionales ni confeti.
*   **Si la query está vacía:** Es la primera vez que esta bicicleta alcanza el hito. El Server Action otorgará los B-Coins, insertará el nuevo registro histórico (incluyendo el `bikeId` en la `metadata`) y retornará el flag de recompensa. La UI disparará la utilidad de confeti (`src/lib/confetti.ts`) y mostrará el Toast estandarizado ("¡Sumaste X B-Coins por detallar tu máquina!").

## 5. Arquitectura del Catálogo de Componentes (La Tabla)

Para trasladar la matriz de datos B2B proporcionada al ecosistema de la app, se diseñará un archivo maestro de constantes (ej. `src/lib/constants/bike-components.ts`).

### 5.1 Regla 1: Parseo de Arreglos Estrictos
Los campos entregados con separación por comas (ej. `"MT200, MT400, CUES"`) se modelarán explícitamente como `string[]`. Esto permite poblar los `Select` o `Combobox` de la UI sin lógica de parseo en tiempo de ejecución.
```typescript
// Ejemplo de Estructura de Catálogo
export const COMPONENT_CATALOG = {
  brakes: {
    Shimano: ["MT200", "MT400", "CUES", "Deore", "SLX", "XT", "XTR"],
    SRAM: ["Level", "G2", "Code", "Maven", "DB8"]
  }
}
```

### 5.2 Regla 2: Manejo de "Solo Fabricante"
Para las categorías (como Asientos y Puños) o marcas específicas que en la matriz indican "Solo Fabricante":
*   **Comportamiento UI:** Al seleccionar una de estas marcas (ej. `brand: "Selle Italia"`), el frontend detectará que su array de modelos está vacío (`[]`). Automáticamente ocultará el selector de modelo (`Dropdown` de Modelos no se renderiza).
*   **Comportamiento Backend:** El formulario guardará automáticamente un valor por defecto en la base de datos (ej. `model: "Standard"` o dejará el string `model` indefinido según determine el mapper final), asegurando que el nodo se cuente como "Lleno" para el algoritmo del 100% sin exigir un input adicional al usuario.

## 6. Aseguramiento de Calidad (QA) y Criterios de Aceptación

Para garantizar una integración segura sin regresiones funcionales, se establecen los siguientes lineamientos y pruebas a ejecutar antes de cualquier fusión a `develop`.

### 6.1 Casos de Prueba de No-Regresión (Core)
1. **Edición General Preservada:** Editar la información general de la bicicleta (ej. cambiar el color o año) a través del flujo tradicional **no debe** sobrescribir ni vaciar el nodo de `components` en Firestore.
2. **Transferencia de Propiedad:** Si la bicicleta es transferida a otro usuario (Chain of Custody), el nodo `components` y el campo `frameMaterial` **deben persistir** intactos en el documento resultante.
3. **Reporte de Robo:** Generar un reporte de robo debe mantener intacta la nueva estructura B2B; adicionalmente, los detalles (si existen) de componentes pueden mostrarse opcionalmente en la UI del reporte público.

### 6.2 Criterios de Aceptación (Nuevas Funcionalidades)
1. **Idempotencia de B-Coins:** Un usuario registra los frenos y transmisión de su bici -> Gana +30 B-Coins. El mismo usuario entra de nuevo, edita la marca de los frenos y guarda -> **No gana** B-Coins, pero la DB se actualiza exitosamente.
2. **Cálculo Matemático Seguro:** Una bicicleta de modalidad "Urbana" sin motor (`components.motor` omitido deliberadamente) que rellene el resto de su perfil y componentes core **debe alcanzar el 100%** visualmente. Si se le cambia la modalidad a "E-Bike", el % debe retroceder hasta que se capturen los detalles del motor.
3. **Resiliencia ante Datos Legacy:** Un usuario con una bicicleta registrada en 2023, cuya base de datos carece del nodo `components`, accede a su dashboard. La UI no debe arrojar errores de consola (Cannot read property de undefined), debe mostrar el módulo de componentes como "Vacío/Incompleto" e invitarlo a actualizar.

## 7. Estrategia de Rollout y Plan de Rollback

Dado el impacto de este módulo en el algoritmo de cálculo de completitud de perfil ("Efecto Zeigarnik") de miles de usuarios existentes, el despliegue requiere mitigaciones estrictas.

### 7.1 Plan de Rollout (Soft Launch)
1. **Despliegue del Schema y Catálogo (Fase Silenciosa):** Se suben a producción primero las adiciones a `types.ts` y las reglas del panel Admin de gamificación. Esto permite establecer las llaves en la base de datos sin afectar a los usuarios.
2. **Activación de UI Componente (Lanzamiento Funcional):** Se despliega el código del Client UI Component a Producción. A partir de este instante, todos los usuarios verán recalibrada su barra de progreso según el nuevo algoritmo descrito en la sección 2.2 y podrán interactuar con el *Wizard*.

### 7.2 Plan de Rollback (Crisis Mode)
En caso de detectar corrupción de base de datos (ej. borrado accidental del campo `serialNumber` al actualizar componentes) o un colapso masivo en el Client Render por Null Pointers:

1. **Feature Toggling de Emergencia:** Desactivación inmediata de la renderización del componente B2B en el dashboard (comentando el componente hijo en `src/app/(protected)/dashboard/bikes/[id]/page-client.tsx`).
2. **Reversión de UI:** Ejecutar `git revert` del último commit de Front-End en `main` e iniciar un despliegue de emergencia (`hotfix`), ocultando el módulo al usuario final.
3. **Preservación de Datos:** **NO se ejecutará** ningún script masivo para borrar el nodo `components` o `frameMaterial` de Firestore de las personas que sí lograron llenarlo. Esta data quedará "dormida" de forma segura hasta que la UI sea reparada y desplegada nuevamente, respetando la regla "Append-Only" del modelo de datos de la compañía.