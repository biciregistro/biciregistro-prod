# Guía de Integración del Widget BiciRegistro

Este documento contiene las instrucciones y el código necesario para integrar el widget de BiciRegistro en sitios web de aliados.

## Descripción
El widget permite a los usuarios:
1.  Verificar si una bicicleta tiene reporte de robo ingresando su número de serie.
2.  Iniciar el proceso de reporte de robo directamente desde el sitio del aliado.

## Código de Integración (Copiar y Pegar)

Por favor, copia el siguiente bloque de código e insértalo en el HTML de tu sitio web donde desees que aparezca el widget.

```html
<!-- INICIO WIDGET BICIREGISTRO -->
<div style="width: 100%; max-width: 450px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e5e7eb; background: white;">
  <iframe
    id="biciregistro-widget"
    src="https://biciregistro.mx/widget/embed"
    width="100%"
    height="500"
    frameborder="0"
    style="display: block; border: none;"
    title="BiciRegistro: Verificación y Reporte"
    loading="lazy"
  ></iframe>
</div>
<!-- FIN WIDGET BICIREGISTRO -->
```

## Configuración de Entornos

Dependiendo de si estás integrando para pruebas o para producción, debes asegurarte de que la URL en el atributo `src` del `iframe` sea la correcta.

### 1. Entorno de Producción (Sitio Público)
Usa esta URL para el sitio en vivo.
*   **URL:** `https://biciregistro.mx/widget/embed`

### 2. Entorno de Pruebas (Desarrollo)
Usa esta URL si estás realizando pruebas de integración antes de lanzar.
*   **URL:** `https://studio-53517930-fbbb5.web.app/widget/embed`
*   *(Nota: Asegúrate de que el equipo de desarrollo te haya confirmado que esta versión es estable).*

## Requerimientos Técnicos

*   **HTTPS:** El sitio donde se incruste el widget debe funcionar bajo protocolo seguro HTTPS para garantizar el correcto funcionamiento de las características de seguridad.
*   **Dimensiones:** El widget es responsivo (se adapta al ancho), pero recomendamos un contenedor con un ancho máximo de **400px a 500px** para una visualización óptima. La altura recomendada es de **500px**.
*   **Popups:** El proceso de reporte de robo abre una ventana emergente segura. Asegúrate de que tu sitio no bloquee popups legítimos en la interacción del usuario.
