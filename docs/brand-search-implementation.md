# Mejora de UI: Búsqueda en Selección de Marca (Valuation Widget)

## 📋 Descripción del Requerimiento
Actualmente, el widget de valuación utiliza un componente `Select` simple para la marca. Esto dificulta la experiencia del usuario cuando la lista de marcas es extensa. Se requiere transformar este campo en un dropdown con buscador integrado (similar a un Combobox), que permita filtrar marcas y ofrezca la opción "Otra" si no hay coincidencias.

## 🚀 Cambios Realizados

### Componente `valuation-widget.tsx`
- Se reemplazó el componente `<Select>` de Radix/Shadcn por una implementación de `<Popover>` y `<Command>`.
- **Buscador Integrado:** Se añadió un input de búsqueda que filtra en tiempo real la lista proveniente de `bikeBrands`.
- **Opción "Otra":** 
    - Se incluyó una validación en el estado de búsqueda vacía (`CommandEmpty`).
    - Si no hay resultados que coincidan con la búsqueda, el usuario puede seleccionar "Otra".
- **UX Consistente:** Se mantuvo el estilo visual (bordes, alturas, fuentes) para que coincida con el campo de "Modelo".

## 🛠️ Detalles Técnicos
- **Dependencias de UI:** `Popover`, `Command`, `CommandInput`, `CommandList`, `CommandItem`, `CommandEmpty`.
- **Lógica de Estado:** Se utiliza el estado `brand` existente para no romper la integración con `valuateBikeAction`.
- **Accesibilidad:** Se añadieron roles de accesibilidad y estados de apertura/cierre gestionados por el Popover.

## 🧪 Plan de Pruebas
1. **Búsqueda Positiva:** Escribir "Trek" debe mostrar únicamente "Trek".
2. **Búsqueda Negativa:** Escribir "MarcaFicticia" debe mostrar el mensaje "No se encontró la marca." junto con la opción de seleccionar "Otra".
3. **Persistencia:** Al seleccionar una marca, el popover debe cerrarse y el nombre debe aparecer en el trigger.
4. **Limpieza:** Cambiar la marca debe seguir limpiando el campo de modelo (lógica de `useEffect` preexistente).
