# Integración de MercadoPago - BiciRegistro

Este documento detalla la implementación técnica, flujos y configuraciones necesarias para la integración de **MercadoPago Checkout Pro** en la plataforma BiciRegistro.

## 1. Visión General y Modelo de Negocio

El objetivo es permitir a los Organizadores (ONGs) cobrar por inscripciones a eventos, delegando la gestión de cobro a la plataforma.

### Modelo "Gross-up"
La plataforma garantiza que el Organizador reciba íntegramente el monto "Neto" que define. Para ello, se calcula un **Precio Total** al público que incluye:
1.  **Monto Neto:** Lo que recibe el organizador.
2.  **Comisión BiciRegistro:** Tasa variable por uso de plataforma.
3.  **Comisión Pasarela (MercadoPago):** Tasa variable + monto fijo por transacción.
4.  **IVA:** Impuesto sobre las comisiones.

**Fórmula de Cálculo:**
$$PrecioFinal = \frac{Neto + (Neto \times Tasa_{BR} \times IVA) + (Fijo_{MP} \times IVA)}{1 - (Tasa_{MP} \times IVA)}$$

---

## 2. Configuración del Proyecto

### Dependencias
El proyecto utiliza el SDK oficial de Node.js:
- `mercadopago`: `^2.11.0`

### Variables de Entorno y Secretos
La seguridad de las credenciales se maneja mediante Google Cloud Secret Manager y `apphosting.yaml`.

| Variable | Secreto (Google Cloud) | Descripción |
| :--- | :--- | :--- |
| `MP_ACCESS_TOKEN` | `mp-access-token` | Token de acceso (Producción o Pruebas) para crear preferencias. |
| `MERCADOPAGO_WEBHOOK_SECRET` | `mp-webhook-secret` | Clave secreta para validar la firma (`x-signature`) de las notificaciones Webhook. |
| `NEXT_PUBLIC_MP_PUBLIC_KEY` | `next-public-mp-public-key` | Llave pública para el frontend (Checkout Bricks, si se usan). |

---

## 3. Arquitectura de la Solución

### 3.1. Configuración Financiera (Admin)
- **Módulo:** `src/lib/financial-data.ts`
- **Función:** Permite al administrador definir las tasas globales (Comisión, IVA, Tasas MP) en Firestore.
- **UI:** Panel de Administración -> Pestaña "Finanzas".

### 3.2. Creación de Eventos (Organizador)
- **Componente:** `src/components/ong/event-form.tsx`
- **Flujo:**
    1.  El organizador activa "Con Costo".
    2.  Ingresa el **Precio Neto** deseado.
    3.  El sistema calcula en tiempo real el **Precio Total** usando la función `calculateGrossUp` (`src/lib/utils.ts`).
    4.  Al guardar, se persisten ambos valores en Firestore:
        - `price`: Precio Total (el que cobrará MercadoPago).
        - `netPrice`: Precio Neto (referencia para dispersión).
        - `fee`: Diferencia (Ingreso bruto de la plataforma).

### 3.3. Proceso de Pago (Ciclista) - *Pendiente*
- **Componente:** `src/components/event-registration-card.tsx`
- **Acción:** `createPreferenceAction` (Server Action).
- **Flujo:**
    1.  Usuario confirma inscripción.
    2.  Backend crea una `Preference` en MercadoPago con:
        - `items`: Detalle del evento.
        - `payer`: Datos del usuario.
        - `metadata`: `{ eventId, userId, registrationId }` (Crítico para conciliación).
        - `back_urls`: Retorno a `/dashboard`.
    3.  Frontend redirige a la URL devuelta (`init_point`).

### 3.4. Confirmación de Pago (Webhooks) - *Pendiente*
- **Endpoint:** `src/app/api/webhooks/mercadopago/route.ts`
- **Seguridad:** Validación obligatoria de la firma HMAC SHA-256 usando `MERCADOPAGO_WEBHOOK_SECRET`.
- **Lógica:**
    - Escuchar eventos `payment.created` y `payment.updated`.
    - Si `status === 'approved'`: Buscar la inscripción por metadata y actualizar `paymentStatus` a `paid`.
    - Si `status === 'pending'` (OXXO/SPEI): Actualizar a `pending`.

---

## 4. Guía de Implementación para Desarrolladores

### Estructura de Datos (Firestore)

**Colección `settings/financial`:**
```json
{
  "commissionRate": 3.5,
  "pasarelaRate": 3.5,
  "pasarelaFixed": 4.50,
  "ivaRate": 16.0
}
```

**Colección `events` (Campo `costTiers`):**
```json
[
  {
    "id": "uuid",
    "name": "General",
    "price": 1090.07,  // Total a cobrar
    "netPrice": 1000.00, // Neto organizador
    "fee": 90.07,      // Comisión total
    "includes": "Kit"
  }
]
```

### Funciones Clave (`src/lib/utils.ts`)

```typescript
// Calcula el precio total a partir del neto
calculateGrossUp(netAmount: number, settings: FinancialSettings): number
```

### Pasos Restantes para Completar

1.  **Backend de Pagos:** Implementar la acción que instancia `new Preference(client)` y retorna el link.
2.  **Webhook Handler:** Crear la ruta API que procesa la notificación asíncrona.
3.  **UI de Pago:** Conectar el botón "Pagar" en la tarjeta de registro con la acción del backend.
4.  **Perfil Financiero:** Crear formulario para que la ONG guarde su CLABE interbancaria (para futuras dispersiones).

---

## 5. Referencias

- [Documentación Oficial MercadoPago Checkout Pro](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro/landing)
- [Validación de Webhooks (Seguridad)](https://www.mercadopago.com.mx/developers/es/docs/your-integrations/notifications/webhooks#validar-origen-de-la-notificacion)
