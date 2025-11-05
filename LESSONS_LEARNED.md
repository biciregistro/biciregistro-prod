# Lecciones Aprendidas del Proyecto Biciregistro

Este documento sirve como una base de conocimiento interna para diagnosticar y resolver problemas críticos que han surgido durante el desarrollo. El objetivo es documentar los síntomas, la causa raíz y la solución para acelerar la depuración en el futuro.

---

## Caso 1: Bucle Infinito en la Página de Login sin Errores Visibles

### Problema
Un usuario con credenciales válidas intenta iniciar sesión. Tras introducir el email y la contraseña y hacer clic en "Iniciar Sesión", la página parpadea y se recarga, volviendo a mostrar el formulario de login vacío. El usuario nunca es redirigido al `/dashboard`. No se muestran errores en la consola del navegador.

### Síntomas Clave
- **Comportamiento:** Bucle de redirección `Login -> Dashboard -> Login`.
- **Consola del Navegador:** Sin errores.
- **Terminal del Servidor:** Se observa una secuencia de peticiones exitosas (código 200), lo que hace el problema difícil de detectar:
  ```bash
  POST /api/auth/session 200
  GET /dashboard 200
  GET /login 200
  ```
- **Errores Anteriores (fases de depuración):** Durante el diagnóstico inicial, se presentaron errores como `auth/user-not-found` y errores de `cookies()`, que fueron síntomas intermedios pero no la causa raíz final.

### Proceso de Diagnóstico
1.  **Verificación de Credenciales (Causa Descartada):** Se confirmó que las credenciales del cliente (`.env.local`) y del servidor apuntaban al mismo proyecto de Firebase. Se añadió un `console.log` en `src/lib/firebase/server.ts` para verificar que el `projectId` del Admin SDK se estaba cargando correctamente al recibir una petición.
2.  **Análisis del Flujo de Autenticación:** Se identificó que el problema ocurría *después* de que el endpoint `/api/auth/session` devolviera una respuesta exitosa. Esto centró la investigación en el siguiente paso: la verificación de la sesión en una página protegida.
3.  **Comparación de Código:** Se revisaron los dos archivos clave en el ciclo de vida de la cookie de sesión:
    - El archivo que **crea** la cookie: `src/app/api/auth/session/route.ts`.
    - El archivo que **lee y verifica** la cookie: `src/lib/auth.ts`.
4.  **Descubrimiento:** Al comparar ambos archivos, se encontró una discrepancia crítica:
    - `auth.ts` esperaba una cookie llamada `__session` (con dos guiones bajos).
    - `session/route.ts` estaba creando una cookie llamada `session` (sin guiones bajos).

### Causa Raíz
El servidor creaba una cookie de sesión con un nombre (`session`), pero la lógica de protección de rutas (`ProtectedLayout` que usa `getDecodedSession`) intentaba leer una cookie con un nombre diferente (`__session`). Al no encontrar la cookie que esperaba, el servidor asumía que el usuario no estaba autenticado y lo redirigía silenciosamente a la página de login, resultando en el bucle.

### Solución
Se estandarizó el nombre de la cookie. Se modificó `src/app/api/auth/session/route.ts` para que utilizara el mismo nombre de cookie que `src/lib/auth.ts`, idealmente importando una constante compartida para evitar futuros errores de tipeo.

**Código Corregido en `session/route.ts`:**
```typescript
// Se usa el nombre correcto para la cookie
response.cookies.set('__session', sessionCookie, {
  // ...
});
```

### Lección Aprendida
**Para valores críticos que se comparten entre diferentes partes de la aplicación (como nombres de cookies, claves de local storage, o tipos de eventos), siempre se deben usar constantes compartidas y exportadas desde un único archivo de configuración o de constantes.** Esto previene errores de tipeo y asegura que si el valor necesita cambiar, solo se deba modificar en un único lugar.
