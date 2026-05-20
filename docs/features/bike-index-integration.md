# Integración de Bike Index API

## Propósito
Esta funcionalidad permite a BiciRegistro ampliar su red de detección de bicicletas robadas consultando la API pública global de **Bike Index** (v3). 
El objetivo es alertar a los usuarios y aliados si una bicicleta que están intentando comprar o verificar está reportada como robada internacionalmente o en registros ajenos a BiciRegistro.

## Arquitectura y Flujo de Datos

La integración opera de manera transversal en los tres puntos de búsqueda principales de la plataforma:
1. **Widget de Búsqueda para Aliados** (`src/components/widget/widget-search.tsx`)
2. **Buscador Público Principal** (`src/app/(public)/search/page.tsx`)
3. **Página de Reporte Público Directo (URL Directa)** (`src/app/(public)/bikes/[serial]/page.tsx`)

### 1. Lógica del Backend (`/api/check-serial` y Funciones Mock)
- Cuando se consulta un serial, primero se verifica la unicidad en la base de datos local de Firestore usando la función `isSerialNumberUnique`.
- Si la bicicleta **SÍ es única localmente** (es decir, no ha sido registrada por un usuario en BiciRegistro), el sistema actúa como puente y realiza una petición `GET` a la API de Bike Index:
  `https://bikeindex.org/api/v3/search?serial=[SERIAL_LIMPIO]&stolenness=stolen`
- **Filtro de Coincidencia Exacta (`isExactMatch`):** Dado que la API de Bike Index utiliza búsqueda difusa (*full-text search*) que puede devolver variaciones de un serial, implementamos una función que limpia espacios/guiones y obliga a que el `serial` devuelto por el JSON de Bike Index coincida **al 100%** con el tecleado por el usuario. Esto evita falsos positivos (por ejemplo, evitar que "WSBC-123" haga match con "WSBC-123-X").

### 2. Formateo y Mocking de Datos
- Cuando se encuentra una coincidencia exacta de robo en Bike Index, el JSON original se transforma dinámicamente para adoptar la estructura de la interfaz nativa `Bike` de BiciRegistro.
- Se le inyectan propiedades bandera: `isExternal: true` y `externalSource: 'Bike Index'`.

### 3. Modificaciones en la UI
- **Alertas Visuales:** Los componentes leen la bandera `isExternal` de la bicicleta. Si es `true`, despliegan la tarjeta de "Alerta de Robo".
- **Transparencia (Sello Visual):** Para indicar que el origen de los datos es un tercero, se insertó una insignia indicadora ("Red Global") acompañada del logotipo oficial (SVG) de Bike Index en la cabecera de las tarjetas de reporte.
- **Enlace de Origen:** Se agregó un CTA secundario ("Ver reporte original completo") que redirige al usuario a la página pública oficial del reporte dentro de `bikeindex.org`.

### 4. Configuración de Next.js (`next.config.ts`)
Dado que las fotografías asociadas a los reportes de Bike Index se alojan en sus propios buckets de almacenamiento, fue necesario autorizar el host `files.bikeindex.org` dentro del arreglo `remotePatterns` en la directiva de `images` del archivo `next.config.ts` para que el componente nativo `<Image />` de Next.js no bloquée la renderización del contenido.

## Manejo de Errores y Limitaciones
- **Fail-Soft por Defecto:** La prioridad técnica es la resiliencia del sistema base. Si la API de Bike Index experimenta latencia excesiva, devuelve un error 500, o impone rate-limits, el bloque `try/catch` envuelve el error silenciosamente, asume la ausencia de reporte externo, y la plataforma sigue operando con total normalidad usando su base de datos local.
- **Consultas Públicas Abiertas:** Al emplear el endpoint específico de lectura pública orientado a recuperación de bicicletas robadas, la infraestructura **no requiere la inyección de API Keys**, autenticación Bearer, ni configuración de Google Secret Manager para esta fase, mitigando la complejidad operativa.
