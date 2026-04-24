# Mercado Pago - Split de Pagos (Marketplace)

Este documento detalla la investigación y los pasos necesarios para implementar el **Split de Pagos 1:1** en la plataforma BiciRegistro. Esto permitirá que cuando un usuario pague por un evento, el dinero se divida automáticamente entre la ONG (vendedor) y BiciRegistro (marketplace).

## 1. Visión General

El modelo **Split de Pagos 1:1** permite:
- Vincular cuentas de vendedores (ONGs) a nuestra aplicación de Marketplace.
- Cobrar una comisión de plataforma (*marketplace fee* o *application fee*) automáticamente.
- Mercado Pago se encarga de la división del dinero y la gestión de impuestos sobre las comisiones.

## 2. Requisitos Previos

- **Cuenta de Mercado Pago (KYC 6):** BiciRegistro debe tener este nivel de identificación.
- **OAuth:** Es obligatorio para que las ONGs autoricen a BiciRegistro a crear cobros en su nombre.
- **Modelo Marketplace:** La aplicación en el Panel de Desarrolladores de Mercado Pago debe estar configurada como tipo "Marketplace".

## 3. Flujo de Configuración

### 3.1. Configuración de la Aplicación
1. Crear una aplicación en Mercado Pago Developers.
2. Tipo: **Pagos Online**.
3. Modelo de integración: **Marketplace**.
4. Configurar la **Redirect URL**: Es la URL a donde Mercado Pago enviará el `code` de autorización tras el flujo de OAuth.

### 3.2. Proceso de Vinculación (OAuth)
Para que una ONG pueda recibir pagos, primero debe vincular su cuenta:

1. **Redirigir a la ONG a la URL de autorización:**
   ```
   https://auth.mercadopago.com.mx/authorization?client_id=<APP_ID>&response_type=code&platform_id=mp&redirect_uri=<REDIRECT_URI>
   ```
2. **Recibir el código:** Tras autorizar, la ONG vuelve a nuestra `REDIRECT_URI` con un parámetro `?code=AUTHORIZATION_CODE`.
3. **Obtener Credenciales:** Intercambiar el código por un `access_token` y `refresh_token` del vendedor:
   ```bash
   curl -X POST \
     -H 'content-type: application/x-www-form-urlencoded' \
     'https://api.mercadopago.com/oauth/token' \
     -d 'client_id=<CLIENT_ID>' \
     -d 'client_secret=<CLIENT_SECRET>' \
     -d 'grant_type=authorization_code' \
     -d 'code=<AUTHORIZATION_CODE>' \
     -d 'redirect_uri=<REDIRECT_URI>'
   ```
4. **Almacenamiento:** Guardar el `access_token`, `refresh_token` y `user_id` de la ONG en nuestra base de datos (relacionado con su perfil de ONG).

## 4. Implementación del Cobro con Split

Existen dos formas dependiendo del checkout utilizado:

### 4.1. Con Checkout Pro (Preferencias)
Al crear la preferencia, se debe usar el `access_token` del **vendedor** (ONG) y especificar el monto de nuestra comisión.

```json
{
  "items": [
    {
      "title": "Inscripción a Evento",
      "quantity": 1,
      "unit_price": 100.00
    }
  ],
  "marketplace_fee": 10.00
}
```
*   **Importante:** El `unit_price` es el total que paga el usuario.
*   **Importante:** El `marketplace_fee` es el monto que se queda BiciRegistro.

### 4.2. Con Checkout API (Pagos Directos)
Se envía el parámetro `application_fee`.

```json
{
  "transaction_amount": 100,
  "application_fee": 10,
  "description": "Pago de evento",
  "payer": { "email": "..." },
  ...
}
```

## 5. Consideraciones Importantes

- **Jerarquía de Comisiones:** Primero se descuenta la comisión de Mercado Pago del monto total. Luego, de lo que queda, se descuenta la comisión del marketplace (nosotros).
- **Reembolsos:** Si se realiza un reembolso, Mercado Pago lo hace de forma **proporcional**. Si la ONG no tiene saldo suficiente, el Marketplace puede devolver su parte, pero el total queda pendiente del saldo del vendedor.
- **Validez de Tokens:** Los tokens de OAuth duran 6 meses. Es necesario implementar un proceso de renovación automática usando el `refresh_token`.
- **Sandbox:** Para probar el flujo de Marketplace, se requieren cuentas de prueba específicas (Vendedor, Comprador y Marketplace).

## 6. Siguientes Pasos para BiciRegistro

1.  **Actualizar el perfil de ONG:** Añadir campos para guardar las credenciales de OAuth (`mp_access_token`, `mp_refresh_token`, `mp_user_id`).
2.  **Interfaz de Vinculación:** Crear un botón en el dashboard de la ONG que inicie el flujo de OAuth.
3.  **Endpoint de Retorno:** Crear la ruta `/api/auth/mercadopago/callback` para procesar el código y guardar los tokens.
4.  **Refactorizar `createPreference`:** Modificar la función para que acepte el `access_token` de la ONG y el `marketplace_fee` dinámico.
