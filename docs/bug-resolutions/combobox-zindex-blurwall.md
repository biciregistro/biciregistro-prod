# Documentación de Resolución: Combobox dentro de Modales (Blur Wall)

## Descripción del Problema
Cuando un usuario intentaba registrar su bicicleta desde el "Blur Wall" (usando el `TicketBlurWall`), el componente selector de modelos (`ModelCombobox`) fallaba de varias formas:
1.  **Barra de desplazamiento bloqueada:** El menú de modelos aparecía, pero no se podía interactuar con el *scroll* lateral de la lista (los clics eran ignorados).
2.  **Buscador inoperativo:** Al intentar escribir en el campo de búsqueda de modelos, el teclado no respondía y no se podía obtener foco en el `<input>`.

## Contexto Técnico (Stack)
*   Modales: `@radix-ui/react-dialog` (vía Shadcn)
*   Popovers (Dropdowns): `@radix-ui/react-popover` (vía Shadcn)
*   Buscador: `cmdk` (vía Shadcn `<Command>`)

## Causa Raíz (RCA) - El conflicto de "Focus Trap" y "Pointer Events"

El problema nace del anidamiento de componentes de *Radix UI*. La estructura actual es:
`Dialog (Modal Registro Bici)` -> `Popover (Menú Modelos)` -> `CommandInput (Buscador)`

1.  **Bloqueo de Interacción (Scroll):** Por defecto, un `<Dialog>` activo de Radix aplica `pointer-events: none` a todo el `document.body` para bloquear interacciones fuera de él. Como el `<Popover>` se renderiza en un Portal (al final del DOM), quedaba sujeto a esta restricción, volviendo la barra de scroll inútil.
2.  **Bloqueo de Teclado (Focus Trap):** Radix UI implementa un estricto `FocusScope`. Cuando hacías clic en el buscador dentro del Popover, el Dialog padre detectaba un evento originado fuera de su DOM inmediato, asumía que el foco se estaba "escapando" e interceptaba la acción ejecutando `event.preventDefault()` (lo cual cancela el enfoque en HTML nativo), devolviendo el foco por la fuerza al Dialog.

## Fase 1: Solución Parcial Implementada (Scroll)

Para resolver el problema de la barra de desplazamiento y los clics "fantasma", se modificó el componente `ModelCombobox`:

```tsx
// src/components/shared/model-combobox.tsx
<Popover open={isOpen} onOpenChange={setIsOpen} modal={true}> 
```

**Resultado:** Al pasar `modal={true}`, Radix le da a este Popover permisos especiales. Quita la restricción de `pointer-events` para su contenido, lo que restauró el funcionamiento de la barra de scroll y la selección de items mediante clics.

*(Nota: En `TicketBlurWall.tsx` se había añadido temporalmente `onInteractOutside` al DialogContent para mitigar esto, pero la propiedad `modal={true}` en el Popover es la solución semánticamente correcta para el manejo del puntero).*