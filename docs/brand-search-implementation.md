# Mejora de UI: Búsqueda en Selección de Marca y Sincronización del Bluebook (Valuation Widget)

## 📋 Descripción del Requerimiento
Actualmente, el widget de valuación utiliza un componente `<Popover>` y `<Command>` para seleccionar la marca con buscador integrado. Sin embargo, existe un problema técnico en la sincronización con los datos del "Libro Azul" (Blue Book) alojados en Firestore.

### 🐛 Problema Detectado (Bug)
Cuando el script de ingesta del Blue Book guarda los registros, acorta el `brandId` a la primera palabra de la marca (Ej. "Honey Whale" se guarda como `honey`, "Pivot Cycles" como `pivot`). Al consultar desde el Widget, el cliente enviaba el ID normalizado completo (`honey_whale`), lo que causaba que la consulta en la base de datos no encontrara coincidencias y devolviera un arreglo vacío. 

## 🚀 Cambios Realizados

### Backend Action `getModelsByBrandAction` (en `src/lib/actions.ts`)
- Se actualizó la función para implementar un **Mecanismo de Búsqueda Resiliente (Fallback)**.
- **Paso 1:** Se importó e implementó la función centralizada `normalizeBrand` de `utils.ts` para estandarizar la entrada.
- **Paso 2:** La función realiza una primera consulta usando la marca normalizada completa (`normBrand`).
- **Paso 3 (Fallback):** Si la primera consulta falla (el snapshot está vacío), la función extrae la primera palabra de la marca original, la normaliza, y realiza una segunda consulta.
- Este mecanismo asegura que funcionen tanto las marcas registradas erróneamente en el script (con una palabra) como posibles arreglos futuros donde la marca se guarde completa.

### Componente `valuation-widget.tsx`
- Se reemplazó el componente `<Select>` de Radix/Shadcn por una implementación de `<Popover>` y `<Command>`. (Implementación Previa).
- Mantiene la consistencia de limpiar el campo `model` cuando cambia `brand`.

## 🛠️ Detalles Técnicos
- **Archivo modificado:** `src/lib/actions.ts`
- **Función modificada:** `getModelsByBrandAction`
- **Impacto:** Restaura el autocompletado de modelos en el Valuation Widget para decenas de marcas con nombres compuestos.

## 🧪 Plan de Pruebas
1. **Prueba Nombres Compuestos (Resolución del Bug):** Seleccionar "Honey Whale" o "GT Bicycles". Debe desplegar la lista de modelos.
2. **Prueba Búsqueda Positiva Normal:** Escribir "Trek" o "Specialized" (una palabra) debe mostrar su respectiva lista de modelos.
3. **Búsqueda Negativa:** Escribir una marca inexistente como "MarcaFicticia", debe permitir hacer clic en el botón de fallback "Usar 'MarcaFicticia'" en la UI.
