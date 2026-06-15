# Bug Resolution: Estandarización de Permisos de Administrador en Gamificación

## 1. Contexto de Negocio
**Historia de Usuario:** Como administrador, al intentar guardar cambios en las reglas de gamificación en los entornos remotos (Staging/Producción), la aplicación arrojaba el error genérico "No se pudieron guardar las reglas", impidiendo la operación de la plataforma de economía virtual (B-coins).
**Problema:** Una condición de seguridad residual validaba erróneamente la existencia del rol de administrador leyendo los Custom Claims del Token de Sesión (`session.role`), los cuales en el entorno remoto no estaban poblados con esta estructura. Al fallar esta primera condición estricta, la función devolvía error sin ejecutar la validación secundaria contra la base de datos (que es el estándar que sí funciona en el resto de la app).

## 2. Diseño Técnico
- Se eliminó el uso de los Custom Claims (`session.role`) en las funciones de mutación administrativa dentro de `src/lib/actions/gamification-actions.ts`.
- Se adoptó y estandarizó la validación empleada por otros módulos seguros (ej. `campaign-actions.ts`), la cual evalúa directamente el documento de Firestore (`users/{uid}`) buscando la propiedad en plano `role === 'admin'`.

## 3. Detalles de Implementación
**Archivos Modificados:**
- `src/lib/actions/gamification-actions.ts`:
  - `updateGamificationRules` (línea ~231): Sustitución del bloque de validación por chequeo a Firestore `db.collection('users').doc(session.uid).get()`.
  - `updateStravaSettings` (línea ~266): Misma sustitución y alineación de permisos.

## 4. QA
**Criterios de Aceptación:**
- Administradores con el campo `role: "admin"` en su documento de Firestore pueden modificar las reglas de B-coins en cualquier ambiente.
- Cuentas no-administrativas siguen recibiendo rechazo silente por permisos (`Unauthorized`).
**Pruebas de no-regresión:**
- Asegurar que la creación de cuenta, guardado regular de usuarios y la suma de kilómetros de ciclistas mantenga el comportamiento esperado sin verse afectados por estos candados restrictivos de administrador.

## 5. Despliegue
- Integración normal vía PR. No requiere manipulaciones de comandos CLI de Firebase (claims).