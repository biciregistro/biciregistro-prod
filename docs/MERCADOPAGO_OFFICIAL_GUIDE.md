# Documentación de Integración Mercado Pago (Checkout Pro)

Esta documentación recopila los pasos oficiales para integrar Mercado Pago Checkout Pro, cubriendo desde la creación de la aplicación hasta la salida a producción y configuraciones avanzadas.

---

## 1. Crear aplicación

Las aplicaciones son entidades registradas dentro de Mercado Pago que actúan como un identificador único para gestionar la autenticación y autorización de tus integraciones.

Para crear una aplicación:

1. En la esquina superior derecha de **Mercado Pago Developers**, haz clic en **Ingresar** e ingresa los datos de tu cuenta.
2. Accede a "Tus integraciones" y selecciona **Crear aplicación**.
3. Ingresa un nombre para identificar tu aplicación (límite de 50 caracteres alfanuméricos).
4. Selecciona **Pagos online** como el tipo de pago.
5. Selecciona que estás integrando para una tienda hecha con **desarrollo propio**.
6. Selecciona la opción **Checkouts** y luego **Checkout Pro**.
7. Acepta la Declaración de Privacidad y Términos y condiciones, y haz clic en **Confirmar**.

## 2. Acceder a las credenciales de prueba

Después de crear tu aplicación, automáticamente también se crearán las credenciales de prueba. Utilízalas para realizar configuraciones y validaciones en un entorno seguro.

En "Tus integraciones" > "Datos de integración", encontrarás:
*   **Public Key**
*   **Access Token** de prueba

## 3. Configurar ambiente de desarrollo

### Instalar el SDK de Mercado Pago (Server-Side)

Ejecuta el siguiente comando en tu terminal:

```bash
npm install mercadopago
```

### Inicializar biblioteca

Crea un archivo principal en el backend y coloca el siguiente código reemplazando `YOUR_ACCESS_TOKEN`:

```javascript
// SDK de Mercado Pago
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Agrega credenciales
const client = new MercadoPagoConfig({ accessToken: 'YOUR_ACCESS_TOKEN' });
```

## 4. Crear y configurar una preferencia de pago

Una preferencia de pago es un objeto que representa el producto o servicio a cobrar.

```javascript
const preference = new Preference(client);

preference.create({
  body: {
    items: [
      {
        title: 'Mi producto',
        quantity: 1,
        unit_price: 2000
      }
    ],
  }
})
.then(console.log)
.catch(console.log);
```

### Obtener el identificador de la preferencia
En la respuesta, obtendrás el `id` de la preferencia (ej: `"787997534-6dad21a1..."`). Guarda este valor para el frontend.

### Configurar URLs de retorno (Back URLs)

Define a dónde redirigir al usuario al finalizar el pago.

```javascript
const preference = new Preference(client);

preference.create({
  body: {
    // ... items ...
    back_urls: {
      success: "https://www.tu-sitio/success",
      failure: "https://www.tu-sitio/failure",
      pending: "https://www.tu-sitio/pending"
    },
    auto_return: "approved",
  }
})
```

| Atributo | Descripción |
| :--- | :--- |
| `auto_return` | Redirección automática si el pago es aprobado (`approved`). |
| `back_urls` | URLs de retorno para `success`, `pending`, y `failure`. |

## 5. Agregar el SDK al frontend e inicializar el checkout

### Incluir el SDK con HTML

Agrega la etiqueta `<script>` en tu HTML:

```html
<script src="https://sdk.mercadopago.com/js/v2"></script>
```

### Inicializar el checkout

Utiliza tu **Public Key** de prueba y el **ID de la preferencia** generado en el backend.

```html
<script>
  // Configure su clave pública
  const publicKey = "YOUR_PUBLIC_KEY";
  const preferenceId = "YOUR_PREFERENCE_ID";

  // Inicializa el SDK
  const mp = new MercadoPago(publicKey);

  // Crea el botón de pago (Wallet Brick)
  const bricksBuilder = mp.bricks();

  const renderWalletBrick = async (bricksBuilder) => {
    await bricksBuilder.create("wallet", "walletBrick_container", {
      initialization: {
        preferenceId: preferenceId,
      },
    });
  };

  renderWalletBrick(bricksBuilder);
</script>
```

### Crear contenedor HTML

```html
<div id="walletBrick_container"></div>
```

## 6. Configurar notificaciones de pago (Webhooks)

Las notificaciones Webhooks permiten recibir información en tiempo real (HTTP POST) sobre los eventos de tu integración.

### Pasos de configuración:
1. Ingresa a **Tus integraciones**.
2. Ve a **Webhooks > Configurar notificaciones**.
3. Selecciona **Modo productivo** e ingresa la URL HTTPS de tu servidor.
4. Selecciona el evento **Pagos**.
5. Haz clic en **Guardar configuración** (Se generará una clave secreta o "Secret Key").

### Validar origen de la notificación

Mercado Pago envía una firma en el header `x-signature` para verificar que la notificación es legítima.

**Formato del header `x-signature`:**
`ts=1742505638683,v1=ced36ab6d33566bb1e16c125819b8d840d6b8ef136b0b9127c76064466f5229b`

**Pasos de validación:**
1. Extraer `ts` (timestamp) y `v1` (hash) del header.
2. Crear el template: `id:[data.id];request-id:[x-request-id];ts:[ts];`
3. Generar HMAC SHA256 usando tu clave secreta.
4. Comparar el hash generado con `v1`.

**Ejemplo de código (Node.js):**

```javascript
const crypto = require('crypto');

// ... obtener headers y query params ...

const secret = "your_secret_key_here";
const manifest = `id:${dataID};request-id:${xRequestId};ts:${ts};`;

const cyphedSignature = crypto
  .createHmac('sha256', secret)
  .update(manifest)
  .digest('hex');

if (cyphedSignature === hash) {
  console.log("HMAC verification passed");
} else {
  console.log("HMAC verification failed");
}
```

### Respuesta esperada
Tu servidor debe responder con un **HTTP STATUS 200 (OK)** o **201 (CREATED)** para confirmar la recepción.

## 7. Prueba de integración

### Cuentas de prueba
1. Ve a **Tus integraciones** > **Cuentas de prueba**.
2. Crea una cuenta **Vendedor** y una **Comprador**.

### Tarjetas de prueba
Utiliza estas tarjetas para simular pagos.

| Tipo | Número | Cód. Seg. | Vencimiento |
| :--- | :--- | :--- | :--- |
| **Visa** | `4075 5957 1648 3764` | 123 | 11/30 |
| **Mastercard** | `5474 9254 3267 0366` | 123 | 11/30 |
| **Amex** | `3711 803032 57522` | 1234 | 11/30 |

**Escenarios por nombre del titular:**
*   `APRO`: Pago aprobado.
*   `CONT`: Pendiente de pago.
*   `CALL`: Rechazado (validación para autorizar).
*   `FUND`: Rechazado (fondos insuficientes).
*   `SECU`: Rechazado (código seguridad inválido).

## 8. Salir a producción

1. **Activar credenciales**: En "Tus integraciones", ve a **Credenciales** > **Productivas** y completa el formulario de homologación (Industria, Sitio web).
2. **Reemplazar credenciales**: Cambia el `Access Token` y `Public Key` de prueba por los de **Producción** en tu código.
3. **Certificado SSL**: Asegúrate de que tu dominio tenga HTTPS.

## 9. Configuraciones Adicionales

### Excluir medios de pago
Puedes excluir tipos de pago (ej. efectivo) o marcas específicas.

```javascript
preference.create({
  body: {
    // ...
    payment_methods: {
      excluded_payment_methods: [{ id: "master" }],
      excluded_payment_types: [{ id: "ticket" }],
      installments: 12
    }
  }
})
```

### Restringir compras a usuarios registrados
Permite solo usuarios con cuenta de Mercado Pago.

```javascript
preference.create({
  body: {
    // ...
    purpose: "wallet_purchase",
  }
})
```

### Preferencia con múltiples ítems y envíos

```javascript
preference.create({
  body: {
    items: [
      { title: 'Producto 1', quantity: 1, unit_price: 100 },
      { title: 'Producto 2', quantity: 1, unit_price: 150 }
    ],
    shipments: {
      cost: 1000,
      mode: "not_specified",
    }
  }
})
```

### Cambiar fecha de vencimiento
Para pagos offline o links que caducan.

```javascript
"date_of_expiration": "2024-05-30T23:59:59.000-04:00"
```

### Redirect Externo
Para abrir el checkout en una nueva pestaña.

```javascript
mp.bricks().create("wallet", "wallet_container", {
  initialization: {
    preferenceId: "<PREFERENCE_ID>",
    redirectMode: "blank" // "self" es por defecto
  },
});
```

### Descripción de factura
Texto que aparecerá en el resumen de la tarjeta del comprador.

```javascript
"statement_descriptor": "MI NEGOCIO"
```

### Apariencia del botón
Personalización visual del Checkout Brick.

```javascript
customization: {
  visual: {
    buttonBackground: 'black',
    borderRadius: '16px',
  },
  texts: {
    action: 'pay',
    valueProp: 'security_details',
  }
}
```

## 10. Reembolsos y Cancelaciones

*   **Cancelación:** Para pagos en estado `pending` o `in_process`.
*   **Reembolso:** Para pagos `approved` (capturados). Puede ser total o parcial.

## 11. Integración en Marketplace

Si usas el modelo de Marketplace, puedes definir una comisión (`marketplace_fee`) que se descuenta automáticamente del vendedor.

```javascript
// Checkout Pro
{
  "items": [...],
  "marketplace_fee": 10 // Monto de comisión
}
```

---
*Fuente: Documentación Oficial Mercado Pago Developers.*
