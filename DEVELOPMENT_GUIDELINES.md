# Guía de Desarrollo y Despliegue para BiciRegistro

Este documento contiene las directrices y buenas prácticas esenciales que todo desarrollador debe seguir para asegurar que el código sea consistente, mantenible y, sobre todo, **desplegable sin errores**.

Cada una de estas reglas se basa en problemas reales que hemos resuelto. Seguir estas guías nos ahorrará tiempo y evitará que los mismos errores vuelvan a ocurrir.

---

## 1. Gestión de Variables de Entorno y Secretos

El entorno de despliegue en Firebase App Hosting **NO** lee los archivos \`.env.local\`. Todas las variables de entorno deben ser gestionadas a través de secretos y declaradas en los archivos de configuración de App Hosting.

#### Reglas:

1.  **No subas archivos `.env` al repositorio.** Deben estar siempre en `.gitignore`.
2.  **Cualquier nueva variable de entorno es un secreto.** Tanto las claves de servidor como las variables públicas del cliente (`NEXT_PUBLIC_*`) deben crearse como secretos en Google Secret Manager.
3.  **Usa Firebase CLI para gestionar secretos.** Esto asegura que los permisos de IAM se asignen correctamente.

#### Cómo Añadir una Nueva Variable de Entorno:

**Paso 1: Crear el Secreto**
```bash
# Nombra el secreto con minúsculas y guiones
firebase apphosting:secrets:set [nombre-del-secreto] --project [id-del-proyecto]
```
Cuando te pida el valor, cópialo de tu archivo `.env.local`.

**Paso 2: Declarar la Variable en App Hosting**
Añade una referencia al secreto en `apphosting.dev.yaml` (o `apphosting.prod.yaml`). La variable debe coincidir con la del código (ej. `NEXT_PUBLIC_FIREBASE_API_KEY`).

```yaml
# apphosting.dev.yaml

env:
  # ... otros secretos del servidor
  - variable: FIREBASE_PRIVATE_KEY
    secret: firebase-private-key

  # ✅ BUENA PRÁCTICA: Variables públicas del cliente gestionadas como secretos
  - variable: NEXT_PUBLIC_FIREBASE_API_KEY
    secret: next-public-firebase-api-key
```

---

## 2. Sensibilidad a Mayúsculas y Nombres de Archivos (Case-Sensitivity)

**¡ESTA ES LA CAUSA MÁS COMÚN DE FALLOS DE BUILD!**

El servidor donde se despliega (Linux) es **sensible a mayúsculas y minúsculas**, mientras que tu entorno local (macOS/Windows) probablemente no lo es. Un error de `casing` que funciona en tu máquina **fallará catastróficamente** en el despliegue.

#### Reglas:

1.  **Las importaciones deben coincidir EXACTAMENTE.** La ruta en una declaración `import` debe ser idéntica, carácter por carácter, al nombre del archivo o directorio en el sistema de archivos.

    ```tsx
    // ❌ MAL: El archivo se llama 'card.tsx'
    import { Card } from '@/components/ui/Card';

    // ✅ BIEN: La importación coincide con el nombre del archivo 'card.tsx'
    import { Card } from '@/components/ui/card';
    ```

2.  **No crear conflictos de nombres.** Nunca crees un archivo y un directorio con el mismo nombre base en la misma ruta.

    ```
    // ❌ MAL: Ambigüedad para el compilador
    /components/
      ├── bike-components/
      └── bike-components.tsx

    // ✅ BIEN: Nombres únicos y sin ambigüedad
    /components/
      ├── bike-components/
      └── bike-card.tsx
    ```

#### Prevención a Nivel de Sistema (Recomendado):

Para forzar a tu Git local a comportarse como el servidor, ejecuta este comando una vez en tu terminal:
```bash
git config core.ignorecase false
```
Esto hará que Git detecte los cambios de mayúsculas/minúsculas como modificaciones, evitando la desincronización con el repositorio.

---

## 3. Prácticas Específicas de Next.js

Next.js tiene reglas estrictas sobre cómo se debe estructurar el código para que el `build` de producción funcione.

#### Reglas:

1.  **Importaciones Dinámicas (`next/dynamic`) deben ser de Nivel Superior.**
    El compilador de Next.js necesita ver la llamada a `dynamic()` de forma estática. Nunca la envuelvas en un hook como `useMemo` o la declares dentro del cuerpo de un componente.

    ```tsx
    // ❌ MAL: Oculta la importación al análisis estático del build
    export default function MyComponent() {
      const MyDynamicComponent = useMemo(() => dynamic(...), []);
      // ...
    }

    // ✅ BIEN: Declarado en el nivel superior del módulo
    const MyDynamicComponent = dynamic(...);

    export default function MyComponent() {
      // ...
    }
    ```

2.  **Forzar Renderizado Dinámico cuando sea Necesario.**
    Por defecto, Next.js intenta prerenderizar las páginas de forma estática. Si una página o layout usa funciones que dependen de la solicitud del usuario (como `cookies()` o `headers()`), debes forzar su renderizado dinámico.

    ```tsx
    // src/app/(protected)/layout.tsx

    // ✅ BUENA PRÁCTICA: Asegura que las rutas protegidas no intenten ser estáticas
    export const dynamic = 'force-dynamic';

    export default async function ProtectedLayout({ children }) {
      // ... lógica de autenticación que usa cookies
    }
    ```

3.  **Inicialización de SDKs de Cliente.**
    Cualquier SDK que solo funcione en el navegador (como el SDK de cliente de Firebase) debe tener una lógica que impida su ejecución durante el `build` en el servidor.

    ```typescript
    // src/lib/firebase/client.ts

    let app;

    // ✅ BIEN: Comprobar si estamos en el navegador antes de inicializar
    if (typeof window !== 'undefined') {
      app = initializeApp(firebaseConfig);
    }
    ```

---

## 4. Configuración del Proyecto

Mantén los archivos de configuración limpios y únicos.

1.  **Un solo `tsconfig.json` y `next.config.ts`.** Estos archivos deben existir únicamente en la raíz del proyecto. No crees duplicados en otras carpetas.
2.  **Mantener `baseUrl` en `tsconfig.json`.** Esto asegura que el alias `@/` se resuelva de manera explícita y sin ambigüedades.
    ```json
    {
      "compilerOptions": {
        "baseUrl": ".",
        "paths": {
          "@/*": ["./src/*"]
        }
      }
    }
    ```

---

## 5. Estrategia de Ramas (Git Flow Simplificado)

Para garantizar la estabilidad y un flujo de trabajo ordenado, seguimos una estrategia de dos ramas principales que se corresponden con nuestros entornos desplegados.

### Ramas Principales

*   **`main`**: Rama de **PRODUCCIÓN**.
    *   **Propósito:** Contiene únicamente el código que ha sido probado y está desplegado para los usuarios finales.
    *   **Regla:** **NUNCA** se debe hacer `push` directamente a `main`. El código solo llega a `main` al fusionar `develop`.
    *   **Despliegue Automático:** Un `push` a `main` despliega al proyecto `biciregistro-prod`.

*   **`develop`**: Rama de **DESARROLLO**.
    *   **Propósito:** Es la rama principal de trabajo. Contiene las últimas características listas para ser probadas.
    *   **Regla:** El código solo llega a `develop` al fusionar ramas de características (`feature`).
    *   **Despliegue Automático:** Un `push` a `develop` despliega al proyecto de `dev` (`studio-53517930-fbbb5`).

### Flujo de Trabajo para Nuevas Características

1.  **Crear Rama:** Siempre crea tu rama de característica a partir de la última versión de `develop`.
    ```bash
    git checkout develop
    git pull origin develop
    git checkout -b feature/nombre-descriptivo
    ```

2.  **Desarrollar:** Trabaja y haz `commit` de tus cambios en tu rama `feature`.

3.  **Fusionar a `develop`:** Cuando tu característica esté lista y probada localmente, fusiónala en `develop` para desplegarla en el entorno de pruebas.
    ```bash
    git checkout develop
    git pull origin develop
    git merge feature/nombre-descriptivo
    git push origin develop
    ```

4.  **Verificar en `dev`:** Confirma que tus cambios funcionan como se espera en la URL del ambiente de desarrollo.

### Flujo de Trabajo para Lanzamientos a Producción

Este proceso se realiza únicamente cuando `develop` es estable y está listo para ser lanzado.

1.  **Fusionar a `main`:**
    ```bash
    git checkout main
    git pull origin main
    git merge develop
    git push origin main
    ```
2.  **¡Lanzamiento!** El `push` a `main` activará el despliegue a producción.

### Despliegue de Reglas de Firebase

**IMPORTANTE:** El pipeline de despliegue automático **solo** despliega la aplicación web. Las reglas de seguridad de Firestore (`firestore.rules`) y Storage (`storage.rules`) deben ser desplegadas manualmente.

**Cuándo Desplegar Reglas:**
-   Cada vez que se fusionen cambios de `develop` a `main` que modifiquen los archivos `firestore.rules` o `storage.rules`.
-   Si se sospecha que las reglas entre entornos están desincronizadas.

**Cómo Desplegar:**

1.  **Asegúrate de estar en la rama `main`:**
    ```bash
    git checkout main
    git pull origin main
    ```
2.  **Ejecuta el comando de despliegue de reglas apuntando al proyecto correcto:**
    
    **Para Desarrollo:**
    ```bash
    # Desplegar ambas reglas a DEV
    firebase deploy --only firestore,storage -P studio-535179390-fbbb5
    ```

    **Para Producción:**
    ```bash
    # Desplegar ambas reglas a PROD
    firebase deploy --only firestore,storage -P biciregistro-prod
    ```

### Flujo para Correcciones Urgentes (Hotfix)

Si encuentras un bug crítico en producción:

1.  **Crea una rama `hotfix` desde `main`:**
    ```bash
    git checkout main
    git pull origin main
    git checkout -b hotfix/descripcion-del-bug
    ```
2.  **Aplica y fusiona la corrección en `main`:**
    ```bash
    # Haces el commit con el arreglo...
    git checkout main
    git merge hotfix/descripcion-del-bug
    git push origin main # <-- Despliega la corrección a producción
    ```
3.  **¡IMPORTANTE! Fusiona también en `develop`:**
    Para asegurar que la corrección no se pierda en el próximo ciclo de desarrollo.
    ```bash
    git checkout develop
    git merge hotfix/descripcion-del-bug
    git push origin develop
    ```
