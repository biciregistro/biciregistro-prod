# 🗺️ Guía Técnica: Implementación de Mapas e Inteligencia Geoespacial

Este documento detalla las lecciones aprendidas, soluciones a errores críticos y mejores prácticas adoptadas durante la implementación del Mapa Analítico de Incidentes en BiciRegistro.

## 1. Solución a Errores de Runtime (Leaflet + React 18)

### El Problema: "Map container is already initialized"
Este es el error más común al usar Leaflet con Next.js (App Router) y React 18 en modo estricto (`Strict Mode`). Ocurre porque React monta, desmonta y vuelve a montar los componentes instantáneamente, pero Leaflet muta el DOM inyectando un `_leaflet_id`. Al re-montar, Leaflet detecta el ID y crashea.

### La Solución Definitiva (Monkey Patch)
No basta con usar `useEffect` o `keys` dinámicas en todos los casos. La solución más robusta implementada en `security-map.tsx` es un parche al prototipo de Leaflet:

```typescript
if (typeof window !== 'undefined') {
    const LMap = L.Map as any;
    if (!LMap.prototype._isPatched) {
        const originalInitContainer = LMap.prototype._initContainer;
        LMap.prototype._initContainer = function (id: any) {
            const container = typeof id === 'string' ? document.getElementById(id) : id;
            if (container && (container as any)._leaflet_id) {
                // Limpieza forzada del ID para permitir re-inicialización
                (container as any)._leaflet_id = null;
            }
            originalInitContainer.call(this, id);
        };
        LMap.prototype._isPatched = true;
    }
}
```

## 2. Interactividad y UX (Paneo y Gestos)

### Conflictos con Tailwind y Navegadores
A veces el cursor muestra la "manita" (`grab`), pero el mapa no se desplaza. Esto sucede cuando el CSS (`overflow-hidden`) o los gestos del navegador interceptan los eventos.

**Buenas Prácticas Aplicadas:**
1.  **Bloqueo de Gestos:** Usar la clase `touch-none` (o `touch-action: none`) en el contenedor del mapa para evitar que el navegador intente hacer scroll de la página en lugar de mover el mapa.
2.  **Stacking Context:** Evitar `z-index: 0` en contenedores intermedios que puedan "sordear" los eventos de ratón.
3.  **D-Pad de Navegación:** Como mecanismo de redundancia y accesibilidad, se implementó un control manual de flechas que usa la API `map.panBy([x, y])`. Esto garantiza navegación incluso si el hardware del usuario tiene problemas con el arrastre táctil.

## 3. Optimización de Datos y Filtros

### Actualización de Marcadores (Clustering)
La librería `react-leaflet-cluster` tiene dificultades para detectar cambios en sus hijos si las `keys` son estáticas o solo basadas en IDs de base de datos que se repiten entre filtros.

**Estrategia de Sincronización:**
Para forzar el repintado de los pines al cambiar de ciudad/estado sin parpadeos agresivos, usamos **Keys Híbridas**:
```tsx
key={`incident-${point.id}-${point.lat}-${point.lng}`}
```
Al incluir las coordenadas en la `key`, cualquier cambio de ubicación fuerza a React a tratar el marcador como nuevo, obligando al Cluster a recalcularse correctamente.

## 4. Visualización de Datos (Heatmaps)

Para mapas de calor, se utiliza la carga dinámica de `leaflet.heat` para evitar errores de SSR:
- Siempre verificar `typeof window !== 'undefined'`.
- Usar `import('leaflet.heat')` dentro de un `useEffect`.
- Limpiar las capas en la función de retorno del efecto para evitar fugas de memoria.

## 5. Resumen de Componentes Clave
- **`SecurityMapWrapper`**: Escudo SSR que usa `next/dynamic` con `ssr: false`.
- **`SecurityMap`**: Componente principal con el parche de Leaflet y lógica de D-Pad.
- **`MapBoundsFitter`**: Componente invisible que reacciona a los cambios de datos para re-centrar la cámara suavemente usando un `hash` de coordenadas para evitar loops de renderizado.

---
*Este documento es parte de la estrategia de "Modificaciones Quirúrgicas y Zero-Regressions" de BiciRegistro.*
