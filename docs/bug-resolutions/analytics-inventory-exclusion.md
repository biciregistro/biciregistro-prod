# Exclusión de Inventario B2B en Tableros Analíticos

**Fecha:** 2025-05-22
**Tipo de Cambio:** Bugfix / Refactor Analítico
**Estado:** Implementado

---

## 1. Contexto de Negocio
* **Historia de Usuario:** Como administrador de la plataforma, quiero que el tablero de indicadores excluya las bicicletas en estado "inventario" para que los reportes de volumen y valor de mercado reflejen el parque vehicular real y no se inflen con stock inactivo de las tiendas.
* **El Problema/Necesidad:** Al lanzar la carga masiva B2B, las tiendas inyectan decenas o cientos de bicicletas a la plataforma. Si estas bicicletas se sumaran a los indicadores globales, crearían un sesgo enorme: el valor total del mercado se dispararía, las gráficas de crecimiento se verían alteradas de forma artificial y los porcentajes de distribución de marcas/modalidades representarían "lo que se vende" y no "lo que se usa".

## 2. Arquitectura y Diseño Técnico
* **Flujo de Ejecución:** La recolección de métricas no cambió en su interfaz. La diferencia ocurre en la capa de acceso a datos (`src/lib/analytics-data.ts`). Las funciones ahora traen el campo `status` desde Firestore y realizan un filtro en memoria (`if (data.status === 'inventory') return;`) antes de sumar la bicicleta a los contadores.
* **Limitación de Firestore (Por qué se hace en memoria):** Firestore no permite combinar operadores lógicos como `.where('status', '!=', 'inventory')` junto con operadores `.where('modality', 'in', [...])`. Para preservar la robustez de los filtros demográficos, la exclusión del inventario se ejecuta de forma segura durante la iteración del `snapshot`.

## 3. Detalles de Implementación (El Bisturí)
* **Archivos Modificados:**
  * `src/lib/analytics-data.ts`:
    * `getGeneralStats`: Reemplazo del contador nativo `count()` por `get()` para poder discriminar el estado.
    * `getBikeStatusCounts`: Se agregó una consulta adicional (`residentInventoryQuery`) para calcular correctamente el `safeCount` deduciendo las bicis en inventario.
    * `getMarketMetrics`: Inserción de la regla `if (data.status === 'inventory') return;` antes de procesar el valor monetario (`appraisedValue`), modalidades y marcas.

## 4. Impacto en UI/UX y Reglas de Negocio
* **Cambios Visuales:** Ninguno directo, pero los números mostrados en el dashboard (Total de Bicicletas, Valor del Mercado, etc.) serán más conservadores y precisos.
* **Reglas de Negocio Afectadas:** Las bicicletas `inventory` son funcionalmente "invisibles" para la macroeconomía de la plataforma hasta el momento en que se transfieren a un cliente final (donde cambian a estado `safe`).

## 5. QA y Plan de Pruebas
* **Criterios de Aceptación Cumplidos:**
    * El Total de Bicicletas global no contabiliza el stock de la tienda.
    * El cálculo de la barra de salud del ecosistema ("Bicicletas Seguras") no infla su métrica con inventario inactivo.
    * El Valor de Mercado total excluye los MSRPs de bicicletas no vendidas.
* **Pruebas de No-Regresión (Zero-Regressions):** 
    * Las estadísticas de Robos (`stolen`) y Recuperaciones (`recovered`) continúan intactas ya que manejan su propio query rígido.

## 6. Rollout y Rollback (Despliegue y Reversión)
* **Pasos de Despliegue:** Despliegue estándar. 
* **Plan de Reversión:** Hacer un `git revert` del commit en `src/lib/analytics-data.ts`. La única consecuencia de un rollback es que los indicadores volverían a inflarse, pero no habría pérdida de datos.
