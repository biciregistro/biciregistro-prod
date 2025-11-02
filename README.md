# Proyecto Biciregistro

Biciregistro es una aplicación web moderna construida con Next.js, diseñada para ofrecer una solución centralizada y segura para el registro de bicicletas. La plataforma permite a los ciclistas mantener un inventario detallado de sus bicicletas, reportarlas como robadas para alertar a la comunidad y verificar el estado de una bicicleta antes de una compra de segunda mano.

## Objetivos Principales

- **Proteger la propiedad:** Ofrecer a los ciclistas una herramienta para registrar formalmente sus bicicletas y sus componentes, creando un comprobante de propiedad digital.
- **Combatir el robo:** Facilitar el reporte inmediato de bicicletas robadas, aumentando la visibilidad del incidente y las posibilidades de recuperación.
- **Promover el comercio seguro:** Permitir a compradores potenciales verificar el número de serie de una bicicleta en una base de datos pública para asegurar que no sea robada.
- **Crear comunidad:** Fomentar una red de ciclistas que colaboren para proteger sus bienes y promover un ciclismo más seguro.

## Características

- **Autenticación y Perfiles de Usuario:** Sistema de registro e inicio de sesión para usuarios. Cada ciclista tiene un perfil personalizable.
- **Registro de Bicicletas ("Mi Garaje"):** Los usuarios pueden registrar múltiples bicicletas, añadiendo detalles como:
  - Número de serie, marca, modelo, color y año.
  - Modalidad (Urbana, MTB, Gravel, etc.).
  - Fotografías (vista lateral, número de serie, componentes).
  - Documentos de propiedad (facturas, recibos).
- **Indicador de Perfil Completo:** Una barra de progreso que motiva a los usuarios a completar todos los datos de sus bicicletas.
- **Reporte de Robo:** Funcionalidad para marcar una bicicleta como robada, incluyendo detalles como fecha, ubicación y descripción del incidente.
- **Búsqueda Pública:** Una página de acceso público para consultar el estado de una bicicleta mediante su número de serie.
- **Panel de Administración:** Una sección protegida para que los administradores gestionen el contenido de la página de inicio.

## Arquitectura y Tecnologías

Este proyecto está construido sobre un stack moderno, enfocado en el rendimiento, la escalabilidad y una excelente experiencia de desarrollador.

- **Framework:** [Next.js](https://nextjs.org/) (con App Router)
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
- **Componentes UI:** [ShadCN/UI](https://ui.shadcn.com/)
- **Iconos:** [Lucide React](https://lucide.dev/)
- **Gestión de Formularios:** [React Hook Form](https://react-hook-form.com/)
- **Validación de Esquemas:** [Zod](https://zod.dev/)
- **Backend (Simulado):** La lógica de negocio y la persistencia de datos están simuladas en `src/lib/data.ts` para agilizar el prototipado.

## Estructura del Proyecto

El proyecto sigue las convenciones de Next.js App Router, organizando el código de manera intuitiva.

```
/
├── src/
│   ├── app/                    # Rutas y páginas de la aplicación
│   │   ├── (auth)/             # Rutas de autenticación (login, signup)
│   │   ├── (protected)/        # Rutas protegidas que requieren sesión
│   │   │   └── dashboard/      # Panel del usuario
│   │   ├── (public)/           # Rutas públicas (homepage, search)
│   │   ├── globals.css         # Estilos globales
│   │   └── layout.tsx          # Layout principal de la aplicación
│   ├── components/             # Componentes de React reutilizables
│   │   ├── ui/                 # Componentes base de ShadCN
│   │   ├── shared/             # Componentes compartidos (Header, Footer)
│   │   ├── icons/              # Iconos personalizados (Logo)
│   │   └── ...                 # Componentes específicos por funcionalidad
│   ├── lib/                    # Lógica de negocio, utilidades y datos
│   │   ├── actions.ts          # Server Actions para mutaciones
│   │   ├── data.ts             # Simulación de la base de datos
│   │   ├── types.ts            # Definiciones de tipos de TypeScript
│   │   ├── utils.ts            # Funciones de utilidad
│   │   └── placeholder-images.ts # Gestión de imágenes de ejemplo
│   └── ...
├── public/                     # Archivos estáticos
└── ...                         # Archivos de configuración (tailwind, next, etc.)
```

## Inicio Rápido

Para levantar el entorno de desarrollo local, sigue estos pasos:

1.  **Instalar dependencias:**
    ```bash
    npm install
    ```

2.  **Ejecutar el servidor de desarrollo:**
    ```bash
    npm run dev
    ```

3.  Abre [http://localhost:9002](http://localhost:9002) en tu navegador para ver la aplicación en funcionamiento.
