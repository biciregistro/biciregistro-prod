# 📑 Guideline: Reportes Ejecutivos de Ecosistema (Sprock AI)

Este documento describe el estándar funcional y técnico para la generación, visualización e impresión de reportes estratégicos dentro de BiciRegistro.

## 1. Visión Funcional (B2B)
El objetivo es transformar los datos vivos del tablero de administración en una **Presentación Ejecutiva** descargable en PDF. Estos reportes están diseñados para ser entregados a aliados comerciales (marcas), organizaciones no gubernamentales (ONGs) e instituciones gubernamentales.

### Características Clave:
*   **Agente Sprock:** La IA actúa como un "Analista Senior de Estrategia". No solo resume números, sino que interpreta tendencias.
*   **Contexto Dinámico:** Los reportes son sensibles a los filtros aplicados (Ubicación, Marca, Género, etc.). Si no hay filtros, el reporte se genera con un enfoque "Panorama Global".
*   **Enfoque Generacional:** El análisis demográfico debe centrarse en los perfiles generacionales (Gen Z, Millennials, Gen X, Boomers) y sus intereses, evitando la lectura plana de edades.
*   **Estructura de 7 Slides:**
    1.  **Portada:** Identidad visual premium y título dinámico.
    2.  **Introducción:** Visión general del segmento y métricas de crecimiento.
    3.  **Distribución Demográfica:** Género, edad promedio y ubicaciones.
    4.  **Perfiles Generacionales:** Análisis profundo del comportamiento por cohorte.
    5.  **Mercado y Valoración:** Valor patrimonial del garaje y marcas líderes.
    6.  **Panorama de Seguridad:** Salud del ecosistema, robos y recuperaciones.
    7.  **Conclusiones Estratégicas:** Puntos accionables derivados de la data.

---

## 2. Arquitectura Técnica

### Orquestación de IA (Sprock)
*   **Modelo:** `gemini-3.1-flash-lite-preview` vía **Genkit**.
*   **Formato de Salida:** JSON Estructurado. Se utiliza `responseMimeType: 'application/json'` para asegurar que la IA entregue un objeto que la UI pueda mapear a los slides.
*   **Restricción de Contenido:** Cada bloque de análisis debe rondar los **500 caracteres** para mantener el equilibrio visual en el slide.
*   **Ubicación:** `src/lib/actions/ai-report-actions.ts`.

### Visualización y Renderizado
*   **Estrategia:** Se abandonó la generación de PDFs binarios en el cliente (`@react-pdf/renderer`) debido a errores de memoria con SVGs complejos. La estrategia ganadora es **Visualización HTML + Impresión Nativa**.
*   **Componentes Reutilizables:** El reporte inyecta directamente los componentes de gráficas del tablero (`Recharts`). Esto garantiza calidad vectorial (SVG) infinita en el PDF final.
*   **Wrapper Dinámico:** El botón generador debe cargarse con `next/dynamic` y `ssr: false` para evitar conflictos de hidratación en componentes de servidor.

---

## 3. Estándares de Diseño y UI

### Formato de Slides
*   **Relación de Aspecto:** 16:9 (Presentación panorámica).
*   **Tipografía:** Variaciones de tamaño dinámicas para evitar cortes. Texto de introducción en `text-xl` (fuente ligera) y análisis de Sprock en `text-lg`.
*   **Identidad de Marca:**
    *   **Fondo de Portada:** `slate-900` con efectos de desenfoque (`blur`) e iluminación indigo.
    *   **Contraste:** Uso de `brightness-0 invert` para el logotipo en fondos oscuros.

### Manejo de Assets (Logotipos)
*   **Archivo:** `public/logo-report.png`.
*   **Requisito:** PNG transparente, alta resolución (>800px ancho), versión blanca o clara.

---

## 4. Estrategia de Impresión (PDF)

El reporte utiliza el motor de impresión del navegador (`window.print()`) con reglas de CSS específicas en el modal:

```css
@media print {
  @page { 
    size: landscape; /* Fuerza la orientación horizontal */
    margin: 0; 
  }
  /* Oculta toda la interfaz de la web excepto el modal activo */
  body > *:not([role="dialog"]) { display: none !important; }
  
  .slide-page { 
    width: 100vw;
    height: 100vh;
    break-after: page; /* Crea un salto de página físico por slide */
    -webkit-print-color-adjust: exact; /* Asegura que se impriman fondos y colores */
  }
}
```

---

## 5. Limitaciones y Buenas Prácticas
1.  **Caché de Datos:** El botón de reporte recibe una "snapshot" de la data que ya fue cargada por el servidor en el dashboard principal. **Prohibido** volver a consultar la base de datos dentro de la lógica del reporte para optimizar costos de Firestore.
2.  **Seguridad:** La función de generación solo debe ejecutarse tras validar que `user.role === 'admin'`.
3.  **Integridad:** Antes de imprimir, el componente verifica que el JSON de Sprock sea válido para evitar pantallas en blanco.
