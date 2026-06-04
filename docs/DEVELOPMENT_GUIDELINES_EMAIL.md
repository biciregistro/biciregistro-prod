# Email Design & Development Guidelines

**BiciRegistro** utiliza un sistema de correos electrónicos transaccionales diseñado para garantizar alta entregabilidad, consistencia de marca (Branding) y experiencia de usuario (UX) homogénea a través de todos los clientes de correo.

Cualquier nuevo template de correo que se añada a `src/lib/email/templates/` **debe** cumplir estrictamente con los siguientes lineamientos de diseño y arquitectura.

---

## 1. Arquitectura de Archivos

Cada correo electrónico debe encapsularse en su propio archivo dentro del directorio `templates/`. 

* **Estructura Obligatoria:** Un template debe exportar una función que reciba los parámetros (props) fuertemente tipados (interface) y debe devolver siempre un objeto con tres propiedades clave requeridas por Resend: `{ subject, html, text }`.
* **URLs Base:** Las imágenes y enlaces dinámicos deben construirse utilizando `process.env.NEXT_PUBLIC_BASE_URL` para garantizar su resolución en producción.

Ejemplo de esqueleto:
\`\`\`typescript
export interface MyNewTemplateProps {
    userName: string;
}

export function getMyNewTemplate({ userName }: MyNewTemplateProps) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://biciregistro.mx';
    const logoUrl = \`\${baseUrl}/email/logo-email.png\`;
    const subject = "Asunto del Correo";
    
    const html = \`...\`; // Ver sección de diseño HTML
    const text = \`...\`; // Ver sección de Fallback Texto

    return { subject, html, text };
}
\`\`\`

---

## 2. Lineamientos de Diseño (HTML Email)

Los clientes de correo (Outlook, Gmail, Apple Mail) tienen motores de renderizado HTML muy antiguos y limitados. **No utilices CSS moderno (Flexbox, Grid, variables CSS).** Todo debe basarse en un diseño en Tablas (`<table>`) con estilos en línea (Inline CSS).

### 2.1 Variables de Marca (Color Palette)
Todos los templates deben declarar y utilizar estas constantes de color para asegurar uniformidad:

\`\`\`javascript
const primaryColor = '#0f172a'; // Slate 900 (Títulos principales)
const accentColor = '#2563eb'; // Blue 600 (Botones y enlaces)
const bodyBg = '#f4f4f5'; // Gray 100 (Fondo fuera de la tarjeta)
const footerBg = '#f1f5f9'; // Slate 100 (Fondo del pie de página)
const textColor = '#333333'; // Texto de los párrafos
const lightTextColor = '#64748b'; // Textos secundarios o pie de página
\`\`\`

*(Nota: Se pueden agregar colores de acento específicos de features, por ejemplo `#FC5200` para componentes relacionados con Strava).*

### 2.2 Estructura Base (El Contenedor)
El diseño principal consta de un fondo gris claro con un contenedor tipo "Tarjeta Blanca" centrado de máximo 600px de ancho.

\`\`\`html
<table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: \${bodyBg};">
    <tr>
        <td align="center" style="padding: 20px 0;">
            <!-- Contenedor Principal (Tarjeta Blanca) -->
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                
                <!-- HEADER -->
                <tr>
                    <td align="center" style="background-color: #ffffff; padding: 20px;">
                        <img src="\${logoUrl}" alt="BiciRegistro" style="height: 40px; width: auto; max-width: 180px;">
                    </td>
                </tr>

                <!-- CONTENT -->
                <tr>
                    <td style="padding: 30px; font-size: 16px; line-height: 1.6;">
                        <h2 style="color: \${primaryColor}; margin-top: 0; font-size: 24px;">Hola...</h2>
                        <p>Contenido principal aquí...</p>
                    </td>
                </tr>

                <!-- FOOTER -->
                <tr>
                    <td align="center" style="background-color: \${footerBg}; padding: 20px; font-size: 12px; color: \${lightTextColor}; border-top: 1px solid #e2e8f0;">
                        El equipo de BiciRegistro
                    </td>
                </tr>

            </table>
        </td>
    </tr>
</table>
\`\`\`

### 2.3 Botones (Call to Action - CTA)
Los botones deben ser enlaces (`<a>`) estilizados para parecer botones, con el color de acento. Deben estar envueltos en una tabla centrada para garantizar el renderizado cruzado.

\`\`\`html
<table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
        <td align="center" style="padding: 10px 0 20px 0;">
            <a href="\${actionUrl}" target="_blank" style="display: inline-block; background-color: \${accentColor}; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                TEXTO DEL BOTÓN
            </a>
        </td>
    </tr>
</table>
\`\`\`

### 2.4 Alertas y Cajas de Énfasis
Para resaltar información importante (Advertencias, Check-lists, Confirmaciones Legales), utiliza una caja con fondo gris muy claro y un borde distintivo.

\`\`\`html
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid \${accentColor}; border-radius: 6px; padding: 20px; margin: 25px 0;">
    <h3 style="margin-top: 0; color: \${primaryColor}; font-size: 18px; margin-bottom: 10px;">Título del bloque</h3>
    <p style="margin: 0; font-size: 15px;">
        Contenido a resaltar.
    </p>
</div>
\`\`\`

---

## 3. Fallback a Texto Plano (Plain Text)

Todo correo debe incluir obligatoriamente su contraparte en texto plano (`text`). Esto es crucial por dos motivos:
1.  **Entregabilidad y Anti-Spam:** Los filtros de spam penalizan severamente los correos que solo envían HTML.
2.  **Accesibilidad:** Para usuarios con lectores de pantalla o clientes de correo limitados (ej. Apple Watch).

El formato de texto plano debe limpiar todo el HTML, mantener los enlaces explícitos y seguir una estructura de saludo, cuerpo y despedida legible.

\`\`\`javascript
const text = \`
Hola \${userName},

Te confirmamos oficialmente...

Ir a mi garage: \${dashboardUrl}

El equipo de BiciRegistro
\`.trim();
\`\`\`

## 4. Checklist de Aprobación de Template
Antes de subir un PR con un nuevo template de correo, valida lo siguiente:
- [ ] Retorna un objeto `{ subject, html, text }`.
- [ ] Utiliza las variables de color globales (`primaryColor`, `accentColor`, `bodyBg`).
- [ ] La estructura base utiliza Tablas (`<table>`) en lugar de `div` anidados o Flexbox.
- [ ] La imagen del logotipo se inyecta dinámicamente usando `process.env.NEXT_PUBLIC_BASE_URL`.
- [ ] La versión de texto plano (`text`) no contiene etiquetas HTML ni saltos de línea basura.