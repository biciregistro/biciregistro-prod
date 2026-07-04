# Technical & UX Spec: Dashboard de Indicadores de Componentes

## 1. 🎯 OBJETIVO DE LA FUNCIONALIDAD
Incorporar una sección de analítica avanzada en el dashboard de Super Admin para visualizar, segmentar y auditar la distribución y popularidad de los componentes de bicicletas en el ecosistema. Esta herramienta permitirá extraer inteligencia de negocio B2B, analizando el mercado desde una perspectiva demográfica (Top-Down) o investigando el perfil de usuarios que poseen un componente específico (Bottom-Up).

## 2. 🧠 DETALLE FUNCIONAL Y PSICOLOGÍA DE UX/UI

### Requerimientos Funcionales y Criterios de Aceptación

**RF-1: Nueva Sección de Componentes**
- **Descripción:** Se creará una nueva sección fija "Indicadores de Componentes en el Mercado" al final del dashboard.
- **Criterios de Aceptación:**
  - **Dado que** el Super Admin navega al dashboard.
  - **Cuando** hace scroll hacia el final de la página.
  - **Entonces** debe visualizar una nueva sección con el título "Indicadores de Componentes en el Mercado" que replica exactamente los estilos de los contenedores existentes.

**RF-2: Selector de Modo (Análisis vs. Auditoría)**
- **Descripción:** Un control de tipo switch (toggle) permitirá cambiar entre "Modo: Análisis de Mercado" y "Modo: Auditoría de Componentes".
- **Criterios de Aceptación:**
  - **Dado que** el Super Admin está en la nueva sección.
  - **Cuando** selecciona "Modo: Auditoría de Componentes".
  - **Entonces** la Barra de Filtros Principal superior se deshabilita (estado `disabled`) y la Barra de Filtros de Componentes se habilita.
  - **Y** cualquier filtro activo en el modo "Análisis de Mercado" se limpia.
  - **Dado que** el Super Admin está en la nueva sección.
  - **Cuando** selecciona "Modo: Análisis de Mercado".
  - **Entonces** la Barra de Filtros de Componentes se deshabilita y la Barra de Filtros Principal superior se habilita.
  - **Y** cualquier filtro activo en el modo "Auditoría de Componentes" se limpia.

**RF-3: Barras de Filtros Fijas (Sticky)**
- **Descripción:** Ambas barras de filtros (Principal y de Componentes) se mantendrán fijas en la parte superior durante el scroll.
- **Criterios de Aceptación:**
  - **Dado que** el Super Admin hace scroll vertical en la página del dashboard.
  - **Cuando** la posición de las barras de filtro alcanzaría el borde superior del viewport.
  - **Entonces** ambas barras deben permanecer apiladas y fijas en la parte superior de la pantalla.

**RF-4: Filtros en Cascada para Componentes**
- **Descripción:** Los dropdowns de la barra de componentes (Categoría, Marca, Modelo) son interdependientes.
- **Criterios de Aceptación:**
  - **Dado que** el admin selecciona una "Categoría" (ej. "Frenos").
  - **Cuando** abre el dropdown de "Marca".
  - **Entonces** solo se listan marcas con componentes en la categoría "Frenos" (ej. "Shimano", "SRAM").
  - **Dado que** el admin selecciona "Puños" o "Sillines".
  - **Cuando** observa el dropdown de "Modelo".
  - **Entonces** este debe estar deshabilitado con el texto "No aplica para esta categoría".

**RF-5: Modo 2 - Lógica de Filtro Inverso (Auditoría)**
- **Descripción:** Al filtrar por un componente, todo el dashboard se recalcula para mostrar el perfil de los dueños de dicho componente.
- **Criterios de Aceptación:**
    - **Dado que** el admin está en "Modo: Auditoría de Componentes".
    - **Cuando** filtra por `Categoría + Marca` (dejando `Modelo` vacío).
    - **Entonces** el Indicador 1 (Dona) de la fila afectada muta para mostrar la distribución porcentual de los modelos internos de esa marca, y el Indicador 2 (Top 5) muestra los modelos más populares de dicha marca.
    - **Cuando** filtra por `Categoría + Marca + Modelo`.
    - **Entonces** los Indicadores 1 y 2 de la fila afectada se fijan en 100% para ese modelo, y el Indicador 3 se ultra-segmenta para mostrar el Top 5 de marcas de bicicletas que equipan de fábrica ese modelo exacto.
    - **Cuando** se audita un componente.
    - **Entonces** la Fila 1 (Material del Cuadro) se recalcula asíncronamente para mostrar en qué tipos de cuadro (Carbono, Aluminio) se monta el componente auditado y qué marcas de bicicleta los usan.
    - **Cuando** se limpia el filtro de componente activo o se cambia de modo.
    - **Entonces** el Dashboard Superior completo regresa a su estado macro global original sin filtros aplicados.

**RF-6: Modo 2 - Resaltado Estadístico (Auditoría por Categoría)**
- **Descripción:** Al filtrar solo por categoría, las otras filas se atenúan visualmente.
- **Criterios de Aceptación:**
  - **Dado que** el admin está en "Modo: Auditoría de Componentes".
  - **Cuando** selecciona solo una "Categoría" (ej. "Transmisión") y deja Marca/Modelo vacíos.
  - **Entonces** las otras 8 filas de componentes adquieren un efecto de opacidad/blur, y la fila "Transmisión" recibe un borde destacado del color primario del tema.
  - **Y** el dashboard superior no sufre ninguna alteración.

**RF-7: Manejo de Estados Vacíos y Lógica de Listas**
- **Descripción:** Si una consulta no devuelve resultados, se debe mostrar un estado vacío estandarizado, y las listas deben ser elásticas.
- **Criterios de Aceptación:**
  - **Dado que** una combinación de filtros en Modo 2 no produce resultados.
  - **Cuando** los datos se cargan.
  - **Entonces** tanto la sección de componentes como el Dashboard Superior suspenden sus gráficos y muestran un contenedor con el texto "Sin registros suficientes para este segmento", previniendo errores de UI.
  - **Dado que** una lista Top 5 se genera.
  - **Cuando** el volumen acumulado de "Otros" supera a un ítem comercial en la lista.
  - **Entonces** "Otros" se inserta en su posición correcta por volumen, desplazando al último ítem para mantener una lista de 5 elementos. En caso de empate en la 5ta posición, la marca comercial tiene prioridad y "Otros" queda por debajo. La etiqueta "Otros" no es clickeable.
  - **Cuando** el universo de datos tiene menos de 5 ítems comerciales.
  - **Entonces** la lista se contrae para mostrar solo los ítems existentes (ej., un Top 3), sin renderizar placeholders vacíos.

### Justificación Psicológica (UX)

- **Ley de Hick:** El cambio de modo (Análisis vs. Auditoría) reduce la complejidad cognitiva al limitar las decisiones del usuario a un solo flujo de pensamiento a la vez (Top-Down o Bottom-Up), en lugar de presentar todos los filtros activos simultáneamente.
- **Ley de Jakob y Consistencia:** Al replicar exactamente los estilos de los `Card` y gráficos existentes (`DonutChart`, listas), reducimos la carga cognitiva. El usuario no necesita aprender nuevos patrones visuales, lo que hace la nueva sección inmediatamente familiar.
- **Principio de Fitts:** Las barras de filtros fijas (`sticky`) mantienen los controles principales siempre al alcance, minimizando el "viaje" del cursor y el esfuerzo de scroll para aplicar cambios, lo que agiliza la exploración de datos.
- **Feedback Inmediato y Scroll Lock:** Evitar el `scroll jump` al recargar datos provee un feedback estable. El usuario mantiene su contexto espacial en la página, lo que previene la desorientación y frustración, un principio clave de usabilidad.
- **Visibilidad del Estado del Sistema:** Deshabilitar la barra de filtros que no está en uso comunica claramente qué modo está activo y qué controles son relevantes, evitando clics inútiles y confusión.

---

### Reglas de Negocio Analíticas y Control de Sesgo

- **Regla Antisesgo para Suspensiones (Filas 4 y 5):** Los algoritmos de cálculo para los Indicadores 1 (Dona de Marcas) y 2 (Top 5 Modelos) deben **EXCLUIR** estrictamente los registros con valor "N/A / No tiene" de su universo de muestra. La etiqueta "No aplica (Rígida)" se reservará de manera única y exclusiva para el cálculo del Indicador 3 de esas filas.
- **Regla de Desempate de Marca Líder Dinámica (Indicador 3):** En las filas basadas en marcas comerciales, si no hay un filtro de componente activo, el Indicador 3 usa la marca líder del universo filtrado actual. En caso de empate numérico exacto en el primer lugar, el sistema seleccionará al líder por estricto **orden alfabético**.

### Matriz Detallada de Indicadores (9 Filas)

**Fila 1: Material del Cuadro**
- **Indicador 1:** Distribución de materiales del cuadro (Gráfico de Dona).
- **Indicador 2:** Top 5 marcas de bicicletas con cuadros de Carbono (Lista).
- **Indicador 3:** Top 5 marcas de bicicletas con cuadros de Aluminio (Lista).

**Fila 2: Frenos**
- **Indicador 1:** Distribución de marcas de frenos (Gráfico de Dona).
- **Indicador 2:** Top 5 modelos de frenos (Lista).
- **Indicador 3:** Top 5 Marcas de Bicicletas que más equipan este componente (Lista).

**Fila 3: Transmisión**
- **Indicador 1:** Distribución de marcas de transmisión (Gráfico de Dona).
- **Indicador 2:** Top 5 modelos de transmisión (Lista).
- **Indicador 3:** Distribución por Categoría de Bicicleta (**Gráfico de Barras Horizontales**).

**Fila 4: Horquilla (Suspensión Delantera)**
- **Indicador 1:** Distribución de marcas de horquillas (Gráfico de Dona).
- **Indicador 2:** Top 5 modelos de horquillas (Lista).
- **Indicador 3:** Comparativa: Suspensión vs. Rígida (Gráfico de Dona).

**Fila 5: Amortiguador Trasero**
- **Indicador 1:** Distribución de marcas de amortiguadores (Gráfico de Dona).
- **Indicador 2:** Top 5 modelos de amortiguadores (Lista).
- **Indicador 3:** Segmentación: Rígidos vs. Doble Suspensión (Gráfico de Dona).

**Fila 6: Llantas (Neumáticos)**
- **Indicador 1:** Distribución de marcas de llantas (Gráfico de Dona).
- **Indicador 2:** Top 5 modelos de llantas (Lista).
- **Indicador 3:** Top 5 Marcas de Bicicletas que más equipan este componente (Lista).

**Fila 7: Puños**
- **Indicador 1:** Distribución de marcas de puños (Gráfico de Dona).
- **Indicador 2:** Top 5 marcas de puños (Lista).
- **Indicador 3:** Distribución por Categoría de Bicicleta (**Gráfico de Dona**).

**Fila 8: Sillines (Asientos)**
- **Indicador 1:** Distribución de marcas de sillines (Gráfico de Dona).
- **Indicador 2:** Top 5 marcas de sillines (Lista).
- **Indicador 3:** Top 5 Marcas de Bicicletas que más equipan estos sillines (Lista).

**Fila 9: Pedales**
- **Indicador 1:** Distribución de marcas de pedales (Gráfico de Dona).
- **Indicador 2:** Top 5 modelos de pedales (Lista).
- **Indicador 3:** Top 5 Marcas de Bicicletas donde se instalan estos pedales (Lista).

---

## 3. 🗂️ MAPA DE ARCHIVOS A MODIFICAR Y CREAR (Corregido)

La implementación se organizará en 3 fases, alineada con la arquitectura SSR y las guías de desarrollo:

**Fase 1: Backend, Tipos y Persistencia en URL**
1.  `src/lib/types.ts` (Modificar): **Adición aditiva** de propiedades opcionales a la interfaz `DashboardFilters` para unificar el estado en la URL.
2.  `src/lib/analytics-data.ts` (Modificar): Crear la nueva función `getComponentAnalytics` en este archivo, optimizada para SSR y prevención de OOM.

**Fase 2: Componentes de UI**
1.  `src/components/admin/charts/component-stats-section.tsx` (Crear): Componente de UI para renderizar los indicadores de componentes. Será un **Server Component** que recibe datos como props.
2.  `src/components/admin/charts/component-filter-bar.tsx` (Crear): **Client Component** (`'use client'`) cuya única responsabilidad es leer los parámetros de la URL (`useSearchParams`) y mutarlos (`router.push`).

**Fase 3: Integración en Arquitectura SSR**
1.  `src/components/admin/stats-tab-content.tsx` (Modificar): Integrar la llamada a `getComponentAnalytics` dentro del `Promise.all` existente para carga paralela de datos en el servidor e inyectar los resultados en `ComponentStatsSection`.

---

## 4. 🩺 EDICIONES QUIRÚRGICAS (Paso a Paso Literales) (Corregido)

### Fase 1: Backend, Tipos y Persistencia en URL

#### Archivo: `src/lib/types.ts`
- **Acción:** **Regla 1: Unificar Tipos.** Modificar la interfaz `DashboardFilters` existente para incluir las nuevas propiedades de forma aditiva. **NO** se deben crear las interfaces `ComponentFilters` o `AnalysisMode`.
- **Justificación:** Se centraliza el estado de todos los filtros en un solo objeto que se propaga desde los `searchParams` de la URL, adhiriéndose a la arquitectura de estado de Next.js App Router.

```typescript
// En src/lib/types.ts, encontrar la interfaz DashboardFilters
export type DashboardFilters = {
    country?: string;
    state?: string;
    city?: string;
    brand?: string;
    modality?: string;
    gender?: string;
    range?: string;
    modelYearBucket?: string;

    // --- INICIO DE ADICIONES QUIRÚRGICAS ---
    analysisMode?: 'market' | 'audit';
    componentCategory?: string;
    componentBrand?: string;
    componentModel?: string;
    // --- FIN DE ADICIONES QUIRÚRGICAS ---
};
```

#### Archivo: `src/lib/analytics-data.ts`
- **Acción:** **Regla 2: Prevenir OOM.** Crear la función `getComponentAnalytics` en `src/lib/analytics-data.ts`.
- **Justificación:** Centraliza la lógica de acceso a datos en un único módulo optimizado para Server Components, separándolo de las `actions` que son para mutaciones.
- **Instrucción Crítica:** La consulta a Firestore **DEBE** incluir `.select()` para proyectar solo los campos necesarios y evitar descargar objetos pesados que causarían un error de Out-Of-Memory (OOM) en el servidor de App Hosting.

```typescript
// En src/lib/analytics-data.ts

import {
  DashboardFilters,
  ComponentAnalyticsData,
} from './types';
import { db } from './firebase/server'; // Asumiendo que así se importa la instancia de Firestore

// ... (otras funciones de analítica)

export async function getComponentAnalytics(
  filters: DashboardFilters
): Promise<ComponentAnalyticsData> {
  'use server';
  
  // 1. Construir una query base a la colección 'bikes'.
  let query = db.collection('bikes');

  // 2. ⚠️ OBLIGATORIO: Aplicar proyección de campos para evitar OOM.
  query = query.select('make', 'modality', 'frameMaterial', 'components', 'ownerCountry', 'ownerState', 'ownerCity', 'gender');
  
  // 3. Aplicar filtros según `filters.analysisMode` ('market' o 'audit').
  //    - Si es 'market', usar los filtros demográficos (filters.country, etc.).
  //    - Si es 'audit', usar los filtros de componentes (filters.componentCategory, etc.).
  
  // 4. Implementar las reglas de negocio (Marca Líder, Antisesgo, etc.).
  
  // 5. Devolver un objeto que cumpla con la interfaz `ComponentAnalyticsData`.

  console.log('Fetching component analytics with filters:', filters);
  
  const mockData: ComponentAnalyticsData = { /* ... datos de ejemplo ... */ };
  return mockData;
}
```

### Fase 2 & 3: Integración en Arquitectura SSR

#### Archivo: `src/components/admin/stats-tab-content.tsx`
- **Acción:** **Regla 3: Carga de Datos en Servidor.** Modificar el Async Server Component para cargar los datos de componentes en paralelo junto con las otras métricas.
- **Justificación:** Se aprovecha el Server-Side Rendering de Next.js para obtener todos los datos necesarios en una sola pasada en el servidor, mejorando el rendimiento y evitando "waterfalls" de peticiones en el cliente. No se usan `useState` o `useEffect` para la carga de datos.

```typescript
// En src/components/admin/stats-tab-content.tsx

// ... (importaciones existentes)
import { getGeneralStats, getTheftStats, getComponentAnalytics } from '@/lib/analytics-data';
import { ComponentStatsSection } from './charts/component-stats-section';
import { ComponentFilterBar } from './charts/component-filter-bar';
import { DashboardFilters } from '@/lib/types';

// Este ya es un Async Server Component.
export async function StatsTabContent({ filters }: { filters: DashboardFilters }) {
  
  // INICIO DE MODIFICACIÓN: Añadir la nueva llamada a Promise.all
  const [generalStats, theftStats, componentAnalytics] = await Promise.all([
    getGeneralStats(filters),
    getTheftStats(filters),
    getComponentAnalytics(filters), // <-- Inyección de la nueva función
  ]);
  // FIN DE MODIFICACIÓN

  return (
    <div className="space-y-8">
      {/* La barra de filtros principal ya existe fuera de este componente */}
      
      {/* El Client Component de la barra de filtros se inserta aquí */}
      <ComponentFilterBar />
      
      {/* ... Secciones existentes que usan `generalStats` y `theftStats` ... */}
      
      {/* Nueva sección de componentes que recibe los datos ya procesados del servidor */}
      <ComponentStatsSection data={componentAnalytics} />
    </div>
  );
}
```

#### Archivo: `src/components/admin/charts/component-filter-bar.tsx`
- **Acción:** **Regla 4: Estado en la URL.** Crear como un Client Component (`'use client'`) cuya única responsabilidad es leer los `searchParams` y mutar la URL.
- **Justificación:** Se delega el manejo de estado de los filtros a la URL. Cuando la URL cambia, Next.js automáticamente vuelve a renderizar los Server Components (`StatsTabContent`) con los nuevos `searchParams`, creando un flujo de datos unidireccional y permitiendo que los estados de filtro sean compartibles por enlace.

```tsx
// src/components/admin/charts/component-filter-bar.tsx
'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { Switch } from '@/components/ui/switch';
import { Select, ... } from '@/components/ui/select'; // Otros componentes de UI

// Este componente es 100% de cliente. Su única función es manipular la URL.
export function ComponentFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createQueryString = useCallback(
    (params: Record<string, string | null>) => {
      const newSearchParams = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(params)) {
        if (value === null) {
          newSearchParams.delete(key);
        } else {
          newSearchParams.set(key, value);
        }
      }
      return newSearchParams.toString();
    },
    [searchParams]
  );
  
  const handleModeChange = (checked: boolean) => {
    const mode = checked ? 'audit' : 'market';
    // Al cambiar de modo, se limpian los filtros del otro modo
    const paramsToClear = {
        analysisMode: mode,
        componentCategory: null, 
        componentBrand: null, 
        componentModel: null,
        country: null,
        state: null,
        city: null,
        brand: null,
        modality: null,
        gender: null,
        range: null
    };
    router.push(`${pathname}?${createQueryString(paramsToClear)}`);
  };

  const handleFilterChange = (name: string, value: string) => {
     router.push(`${pathname}?${createQueryString({ [name]: value || null })}`);
  }

  // El JSX contendrá los componentes de UI (Switch, Selects) que leen su estado de searchParams
  // y llaman a estas funciones para mutar la URL.
  return (
    <div>
        {/* ... JSX para el switch de modo y los dropdowns ... */}
    </div>
  );
}
```

---

## 5. 🧠 IMPACTO EN DATOS Y ENTORNOS (Corregido)

El cambio principal alinea la implementación con la arquitectura SSR y de estado de Next.js App Router, asegurando la persistencia del estado a través de la URL, optimizando la carga de datos en el servidor y previniendo regresiones de rendimiento.

- **Modificación de Interfaz Existente (`src/lib/types.ts`):**
  - La interfaz `DashboardFilters` ha sido extendida de forma aditiva con cuatro propiedades opcionales para manejar el estado de la nueva sección. Se elimina la necesidad de crear interfaces redundantes (`ComponentFilters`, `AnalysisMode`).
    - `analysisMode?: 'market' | 'audit';`
    - `componentCategory?: string;`
    - `componentBrand?: string;`
    - `componentModel?: string;`
- **Flujo de Datos Unidireccional:**
  - El estado de los filtros reside en la URL (`searchParams`).
  - Los Client Components (`ComponentFilterBar`) leen la URL y la modifican.
  - Los Server Components (`StatsTabContent`) reciben los `searchParams` actualizados como props y recargan los datos desde el servidor.
- **Prevención de OOM (Out-of-Memory):**
  - La especificación ahora exige explícitamente el uso de `.select()` en las consultas de Firestore dentro de `analytics-data.ts`, una medida crítica para la estabilidad del servidor en producción al evitar la carga de campos pesados innecesarios.

El Spec ha sido alineado con las `DEVELOPMENT_GUIDELINES.md` y la arquitectura recomendada para Next.js App Router. El uso de Server Components para la carga de datos y Client Components para la interacción asegura un rendimiento óptimo y previene regresiones de SSR. Está listo para pasar a fase de código.