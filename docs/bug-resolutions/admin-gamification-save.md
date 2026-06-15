# Bug Resolution: Falla Silenciosa al Guardar Reglas de Gamificación

## 1. Contexto de Negocio
**Historia de Usuario:** Como administrador, al intentar actualizar las reglas de Gamificación y los límites de integración de Strava desde la pestaña de administración, el sistema bloqueaba la acción y mostraba un mensaje de error ("No se pudieron guardar las reglas"), impidiendo cambiar las configuraciones globales.
**Problema:** La validación de privilegios administrativos estaba dependiendo exclusivamente de un Custom Claim (`session.role === 'admin'`) inyectado en la sesión de Firebase Auth, el cual en entornos de desarrollo/staging o al recién promover a un usuario, a menudo no se encuentra actualizado o sincronizado.

## 2. Diseño Técnico
- Se cambió el mecanismo de validación de identidad administrativa en las "Server Actions" específicas de configuración de Gamificación.
- **Enfoque de Validación en Base de Datos (Source of Truth):** En lugar de depender de la firma JWT (Custom Claims), el código ahora ejecuta una consulta explícita al documento del usuario (`users/{uid}`) en Firestore para verificar el campo `role` como medida más robusta y en tiempo real.

## 3. Detalles de Implementación
**Archivos Modificados:**
- `src/lib/actions/gamification-actions.ts`:
  - Se modificó `updateGamificationRules` y `updateStravaSettings`.
  - Se reemplazó el check `if (!session || session.role !== 'admin')` por la lectura del documento del usuario (`userDoc = await db.collection('users').doc(session.uid).get()`) y se valida `userDoc.data()?.role !== 'admin'`.

## 4. QA
**Criterios de Aceptación:**
- Administradores legítimos pueden editar el formulario de Gamificación, presionar guardar y el sistema confirma el guardado (Toast de éxito).
- Usuarios normales que intenten ejecutar estas funciones por API de Next.js seguirán recibiendo `{ success: false, error: 'Unauthorized' }`.
**Pruebas de no-regresión:**
- Asegurar que el guardado respeta la estructura JSON y no sobreescribe nodos no enviados gracias a `{ merge: true }`.

## 5. Despliegue
- Integración vía Pull Request estándar, no requiere reinicios de servicios externos ni actualizaciones de índices de base de datos.