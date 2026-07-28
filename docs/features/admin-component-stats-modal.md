# Reporte de Implementación: Modal de Detalles para Indicadores de Componentes

## Fase 1: UX/UI & Agile
* **Historias de Usuario:**
    *   **HU-1: Visualización Detallada de Agrupaciones en Gráficos y Listas**
        *   **Como:** Administrador del sistema,
        *   **Quiero poder:** Hacer clic en cualquier segmento de un gráfico (ej. la porción "Shimano" en un gráfico de donut) o en un ítem de una lista (ej. "Otros") que represente una agrupación de datos,
        *   **Para:** Visualizar en un modal un desglose detallado de los elementos que componen ese grupo (ej. los modelos de frenos Shimano, o las marcas/modelos dentro de "Otros") y así poder realizar análisis de mercado más profundos.

* **Criterios de Aceptación (Gherkin):**
    *   **Escenario 1: Clic en Gráfico de Donut**
        *   **Dado que** estoy en la pestaña "Indicadores" del panel de administración.
        *   **Y** estoy viendo el gráfico "Distribución de Marcas" para "Frenos".
        *   **Y** el gráfico muestra un segmento para la marca "Shimano".
        *   **Cuando** hago clic en el segmento "Shimano".
        *   **Entonces** se debe abrir un modal titulado 'Detalle de "Shimano" para Distribución de Marcas'.
        *   **Y** el modal debe mostrar una tabla con las columnas "Modelo" y "Cantidad", listando todos los modelos de frenos Shimano registrados.
        *   **Y** debo poder cerrar el modal.
    *   **Escenario 2: Clic en Ítem "Otros" de una Lista**
        *   **Dado que** estoy en la pestaña "Indicadores".
        *   **Y** estoy viendo la lista "Top 5 Modelos" para "Llantas", que incluye un ítem "Otros".
        *   **Cuando** hago clic en el ítem "Otros".
        *   **Entonces** se debe abrir un modal titulado 'Detalle de "Otros" para Top 5 Modelos'.
        *   **Y** el modal debe mostrar una tabla con las columnas "Marca", "Modelo" y "Cantidad" de las llantas agrupadas en esa categoría.
        *   **Y** debo poder cerrar el modal.

* **Psicología UX:**
    1.  **Principio de Mínima Carga Cognitiva:** La interfaz principal se mantiene limpia, mostrando solo datos de alto nivel. Esto evita la sobrecarga de información y permite al usuario enfocarse en los patrones generales primero.
    2.  **Descubrimiento Progresivo (Progressive Disclosure):** La complejidad (el detalle granular) se revela solo bajo demanda. El usuario inicia la exploración, lo que hace que la herramienta se sienta potente y manejable, no abrumadora. El cursor `pointer` sobre los segmentos actuará como una `affordance` (una pista visual) que invita a la interacción.
    3.  **Flujo de Análisis Ininterrumpido:** El uso de un modal mantiene al usuario en el mismo contexto (la página de indicadores). No hay recargas de página ni saltos de navegación, lo que permite un flujo de pensamiento analítico continuo y sin fricción.

---
## Fase 2: Arquitectura y Análisis Técnico
* **Impacto Tecnológico:**
    1.  **Modelos de Datos (`types.ts`):** Se realizará una modificación **aditiva** a la interfaz `ChartDataItem` para no romper contratos existentes (REGLA DE ORO).
        *   Se añadirá la propiedad opcional `detailedData?: { name: string; model?: string; value: number }[]`. Esta propiedad contendrá el desglose de cualquier ítem agrupado.
    2.  **Flujo de Ejecución (Backend - `lib/analytics-data.ts`):** La función `getComponentAnalytics` evolucionará a un sistema de agregación jerárquico. Para cada indicador, realizará una primera agrupación para el gráfico principal y luego, para cada grupo resultante, una sub-agrupación para poblar el `detailedData`.
    3.  **Flujo de Ejecución (Frontend):**
        *   `ComponentStatsSection` se convertirá en un Client Component (`'use client'`) para poder usar el hook `useState` y gestionar el estado del modal (datos, título, visibilidad).
        *   Los componentes de gráficos (`DonutChartIndicator`, etc.) se refactorizarán a sus propios archivos para mejorar la mantenibilidad y se les pasará un callback `onItemClick`.
        *   El callback `onItemClick` comprobará si el ítem de datos recibido tiene la propiedad `detailedData` y, de ser así, actualizará el estado para renderizar el modal con esa información.

* **Mapeo de Archivos:**
    *   **Archivos a Modificar:**
        *   `src/lib/analytics-data.ts`
        *   `src/lib/types.ts`
        *   `src/components/admin/charts/component-stats-section.tsx`
    *   **Archivos a Crear:**
        *   `src/components/admin/charts/AnalyticsDetailModal.tsx`
        *   `src/components/admin/charts/DonutChartIndicator.tsx` (extraído de `component-stats-section`)
        *   `src/components/admin/charts/BarChartIndicator.tsx` (extraído de `component-stats-section`)
        *   `src/components/admin/charts/TopListIndicator.tsx` (extraído de `component-stats-section`)

* **Comando Git:**
    ```bash
    git checkout -b feature/admin-component-stats-modal
    ```

---
## Fase 3: QA & Zero-Regressions
* **Plan de Pruebas (Nuevo Feature):**
    *   **Escenario:** Profundizar en los datos de un segmento de un gráfico y en un ítem "Otros" de una lista.
    *   **Pasos:**
        1.  Ir a "Indicadores" en el panel de admin.
        2.  En el carril "Frenos", hacer clic en el segmento "SRAM" del gráfico de donut.
        3.  **Resultado Esperado:** Se abre un modal con el título 'Detalle de "SRAM" para Distribución de Marcas', mostrando una tabla de modelos y cantidades de SRAM. Cerrar el modal.
        4.  En el carril "Llantas", en la lista "Top 5 Modelos", hacer clic en el ítem "Otros".
        5.  **Resultado Esperado:** Se abre un modal con el título 'Detalle de "Otros" para Top 5 Modelos', mostrando una tabla de marcas, modelos y cantidades de llantas. Cerrar el modal.

* **No-Regresión:**
    1.  **Carga del Dashboard:** Verificar que la pestaña "Indicadores" y todas las demás pestañas del admin carguen correctamente sin errores en la consola.
    2.  **Tooltips de Gráficos:** Pasar el cursor sobre todos los segmentos de los gráficos. Verificar que los `tooltips` de `recharts` sigan apareciendo con la información correcta (`name` y `value`).
    3.  **Filtros Globales:** Aplicar un filtro de país o fecha. Verificar que todos los gráficos se actualicen correctamente y que la funcionalidad de clic para ver detalle siga operativa con los datos filtrados.
    4.  **Renderizado sin Datos:** Forzar (si es posible con filtros) un estado donde un gráfico no tenga datos. Verificar que se muestre el mensaje "Sin datos" en lugar de un error.
    5.  **Responsividad:** Redimensionar la ventana del navegador. Verificar que los gráficos y el layout general se ajusten correctamente y que el modal, al abrirse, sea visible y usable en pantallas pequeñas.

---
## Fase 4: Blueprint de Documentación (Contenido Íntegro)
*   **Ruta del Archivo:**
    `docs/features/admin-component-stats-modal.md`

*   **Contenido Exacto y Final del Documento:**
    ```markdown
    # Funcionalidad: Modal de Detalles para Indicadores de Componentes

    **Autor:** Gemini Architect
    **Fecha:** 27 de julio de 2026
    **Rama:** `feature/admin-component-stats-modal`

    ---

    ### 1. Contexto de Negocio

    #### Historias de Usuario
    *   **Como** Administrador del sistema, **quiero poder** hacer clic en **cualquier** segmento de un gráfico o en un ítem de una lista que represente una agrupación, **para** visualizar en un modal un desglose detallado de los elementos que componen ese grupo y así poder realizar análisis más profundos.

    #### Problema a Resolver
    Los gráficos del dashboard presentan datos de manera agregada, ocultando la composición interna de categorías clave como marcas, modelos o el grupo "Otros". Esto limita la capacidad del administrador para entender la "larga cola" (long-tail) del mercado y la popularidad de ítems específicos, impidiendo un análisis de negocio granular.

    ---

    ### 2. Arquitectura y Diseño Técnico

    #### Flujo de Ejecución
    1.  **Backend (Agregación Multinivel):** La función `getComponentAnalytics` en `src/lib/analytics-data.ts` se modifica para realizar una agregación jerárquica. Primero, agrupa los datos para el gráfico principal (ej. por marca). Luego, para cada grupo resultante, realiza una sub-agrupación (ej. por modelo) para poblar una nueva propiedad `detailedData`.
    2.  **Contrato de Datos:** La interfaz `ChartDataItem` en `src/lib/types.ts` se actualiza de forma aditiva para incluir `detailedData?: { name: string; model?: string; value: number }[]`, que contendrá el desglose detallado.
    3.  **Frontend (Renderizado Interactivo):**
        *   `ComponentStatsSection` se convierte en un Client Component (`'use client'`) para gestionar el estado del modal (datos, título y visibilidad).
        *   Un manejador de clics genérico, `handleItemClick`, comprueba si un ítem de datos clickeado posee la propiedad `detailedData`.
        *   Si existe, se actualiza el estado para renderizar el componente `AnalyticsDetailModal` con los datos del desglose.

    ---

    ### 3. Detalles de Implementación (El Bisturí)

    *   **Archivo:** `src/lib/types.ts`
        *   **Cambio:** Adición a la interfaz `ChartDataItem`.
        *   **Código Exacto:**
            ```typescript
            export interface ChartDataItem {
              name: string;
              value: number;
              // Propiedad para el desglose, poblada por el backend si hay datos detallados.
              detailedData?: { name: string; model?: string; value: number }[];
            }
            ```

    *   **Archivo:** `src/components/admin/charts/component-stats-section.tsx`
        *   **Cambio:** Se convierte a Client Component y se añade la lógica de estado y el manejador.
        *   **Código Exacto a Añadir:**
            ```tsx
            'use client';
            
            import { useState } from 'react';
            import { AnalyticsDetailModal } from './AnalyticsDetailModal';
            import { DonutChartIndicator } from './DonutChartIndicator'; // Y otros indicadores
            // ...

            export function ComponentStatsSection({ data }: { data: ComponentAnalyticsData }) {
              const [modalData, setModalData] = useState<{ title: string; data: any[] } | null>(null);

              const handleItemClick = (item: ChartDataItem, chartTitle: string) => {
                if (item.detailedData && item.detailedData.length > 0) {
                  const modalTitle = `Detalle de "${item.name}" para ${chartTitle}`;
                  setModalData({ title: modalTitle, data: item.detailedData });
                }
              };
              
              // ... dentro del return, al renderizar un indicador:
              // <DonutChartIndicator title={...} data={...} onItemClick={handleItemClick} />

              // ... al final del return:
              {modalData && (
                <AnalyticsDetailModal
                  isOpen={!!modalData}
                  onClose={() => setModalData(null)}
                  title={modalData.title}
                  data={modalData.data}
                />
              )}
            }
            ```

    *   **Nuevo Archivo:** `src/components/admin/charts/AnalyticsDetailModal.tsx`
        *   **Contenido:** Un componente que renderiza un `Dialog` de shadcn/ui. El `DialogContent` contendrá un `DialogHeader` con el `title` y un `Table` que mapea la prop `data` a filas (`TableRow`) y celdas (`TableCell`), mostrando "Marca/Nombre", "Modelo" (si existe) y "Cantidad".

    *   **Nuevo Archivo:** `src/components/admin/charts/DonutChartIndicator.tsx` (Ejemplo de refactorización)
        *   **Contenido:**
            ```tsx
            'use client';
            import { ChartDataItem } from '@/lib/types';
            import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

            const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

            interface DonutChartIndicatorProps {
                title: string;
                data: ChartDataItem[];
                onItemClick: (item: ChartDataItem, title: string) => void;
            }

            export function DonutChartIndicator({ title, data, onItemClick }: DonutChartIndicatorProps) {
                // ... JSX del gráfico ...
                <Pie
                    data={data}
                    // ... otras props ...
                    onClick={(pieData) => onItemClick(pieData.payload as ChartDataItem, title)}
                    cursor="pointer"
                >
                    {data.map((entry, index) => (
                        <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]} 
                        />
                    ))}
                </Pie>
                // ...
            }
            ```

    ---

    ### 4. Impacto en UI/UX y Casos Borde

    *   **Impacto:** El cursor cambiará a `pointer` sobre los elementos interactivos de los gráficos, proveyendo una clara `affordance` visual de que se puede hacer clic para obtener más detalles.
    *   **Caso Borde 1: Sin desglose:** Si un ítem no tiene datos detallados, el backend no enviará la propiedad `detailedData`. El `handleItemClick` no se activará y el elemento no será interactivo.
    *   **Caso Borde 2: Lista larga en modal:** El contenido del modal será escroleable verticalmente para manejar un gran número de ítems sin romper el layout.
    *   **Caso Borde 3: Nombres largos:** Las celdas de la tabla usarán clases de utilidad de Tailwind (`truncate`, `break-words`) para un manejo elegante del desbordamiento de texto.

    ---

    ### 5. QA y Zero-Regressions

    Se aplicará el plan de pruebas completo para validar la nueva funcionalidad de "drill-down" en todos los tipos de gráficos e indicadores de lista. Se realizarán pruebas de no-regresión para asegurar que los filtros del dashboard, los `tooltips` de los gráficos y la responsividad de la página no se vean afectados negativamente.

    ---

    ### 6. Rollout y Rollback

    *   **Rollout:** El proceso sigue el Git Flow estándar del proyecto: fusionar la rama `feature` a `develop`, validar en el entorno de desarrollo y, una vez aprobado, fusionar `develop` a `main` para el despliegue a producción.
    *   **Rollback:** En caso de un incidente crítico, se utilizará la función "Revert" de Git para revertir el commit de merge en la rama afectada (`develop` o `main`), lo que activará un nuevo despliegue con el código anterior.
    ```
