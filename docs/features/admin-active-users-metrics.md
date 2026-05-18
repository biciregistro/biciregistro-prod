# Admin Active Users Metrics

## Objetivo de la Funcionalidad
Implementar la visualización del KPI "Usuarios Activos" en el dashboard de administración. Esto permite a los administradores medir el nivel de engagement e interacción real de la plataforma (usuarios que inician sesión o interactúan), más allá de la métrica estática de "Usuarios Registrados".

## Estructura de Datos
Se ha actualizado el modelo de datos de `User` en `src/lib/types.ts` para documentar la existencia del campo `lastLoginAt`.

*   `lastLoginAt?: string;`: (ISO string) Almacena el timestamp del último inicio de sesión o interacción significativa del usuario. Este campo es el motor para calcular la métrica de usuarios activos.

## Lógica Analítica
La recolección y cálculo de datos se realiza en la función `getGeneralStats` dentro de `src/lib/analytics-data.ts`.

1.  **Extracción de Datos:** Se modificó la proyección (select) de la consulta de usuarios a Firestore (`allUsersSnapshot`) para incluir el campo `lastLoginAt` además de `createdAt`.
2.  **Cálculo en Memoria:**
    *   Se itera sobre todos los usuarios y se parsea `lastLoginAt`.
    *   Si `lastLoginAt` es mayor o igual a hace 30 días (`thirtyDaysAgo`), se incrementa un contador global `totalActiveUsersLast30Days` para la tarjeta de resumen.
    *   Al mismo tiempo, se agrupa la fecha diaria de actividad y se incrementa el contador `activeUsersCount` dentro de la estructura `dailyCounts[date]` para alimentar la gráfica histórica.

*Nota:* Esta lógica se procesa en memoria en el servidor (Node.js/Next.js backend) para esquivar la limitación de Firestore de no poder usar múltiples rangos/desigualdades (inequalities) o cruces complejos en una sola consulta.

## Impacto en UI
Se actualizó el componente `src/components/admin/charts/general-stats-section.tsx`:

*   **Interfaz de Datos:** La interfaz `GeneralStatsData` se actualizó para que `dailyGrowth` incluya `activeUsersCount: number`.
*   **Tarjeta de Resumen (StatCard):** La tarjeta de "Usuarios Activos" ahora muestra el valor real calculado (`data.activeUsers`) en lugar de estar hardcodeado en `0`.
*   **Gráfico (AreaChart):** Se agregó un tercer componente `<Area>` a la gráfica `recharts` de "Crecimiento de Ecosistema".
    *   Se asignó la llave de datos `dataKey="activeUsersCount"`.
    *   Se le dio un nombre descriptivo `name="Usuarios Activos"`.
    *   Se le asignó un color ámbar (`#f59e0b`) para que contraste visualmente con el color primario (usuarios) y verde (bicicletas).
    *   El tooltip y la leyenda se actualizan automáticamente gracias a la integración nativa de `recharts`.

## Notas de Despliegue
*   **Datos Históricos:** Si el backend de autenticación no registraba previamente el campo `lastLoginAt` en la base de datos de Firestore, la gráfica histórica y la tarjeta mostrarán valores en cero (`0`) o muy bajos inicialmente hasta que los usuarios comiencen a iniciar sesión de nuevo y se pueble el campo. No es un error, sino el comportamiento esperado de una nueva métrica.
*   **Tracking Futuro:** Es responsabilidad del flujo de autenticación (Login Actions, Session refresh) asegurar que el campo `lastLoginAt` del usuario en Firestore se actualice cada vez que inicie una nueva sesión activa en la plataforma para mantener este indicador vivo.

---

## Actualización (Tracking en Login)
Posteriormente a la creación del panel, se modificó el endpoint de sesión `src/app/api/auth/session/route.ts`.

Cada vez que un usuario (ya sea nuevo registro o login habitual, redes sociales o email) genera exitosamente una cookie de sesión con su Token JWT de Firebase, se despacha en el backend de forma asíncrona ("fire and forget") un Update a su documento de `User` actualizando la propiedad `lastLoginAt` con el Timestamp ISO actual.

Esto garantiza que las analíticas comiencen a reflejar y contabilizar usuarios reales activos en los últimos 30 días automáticamente.