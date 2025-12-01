import { MercadoPagoConfig, Preference } from 'mercadopago';

// Inicializar el cliente de Mercado Pago
// IMPORTANTE: El Access Token debe estar configurado en las variables de entorno (Secret Manager)
// Nunca exponer este token en el cliente.
const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN || '' 
});

/**
 * Crea una preferencia de pago en Mercado Pago
 * @param params Datos necesarios para crear la preferencia
 * @returns La URL de redirección (init_point)
 */
export async function createPreference(params: {
    title: string;
    quantity: number;
    unit_price: number;
    metadata: {
        eventId: string;
        userId: string;
        registrationId: string;
    };
    backUrls: {
        success: string;
        failure: string;
        pending: string;
    };
    payer: {
        email: string;
        name: string;
        surname?: string;
    };
}) {
    if (!process.env.MP_ACCESS_TOKEN) {
        throw new Error("Mercado Pago Access Token no configurado.");
    }

    const preference = new Preference(client);

    try {
        const response = await preference.create({
            body: {
                items: [
                    {
                        id: params.metadata.eventId, // REQUERIDO: ID del producto/servicio
                        title: params.title,
                        quantity: params.quantity,
                        unit_price: params.unit_price,
                        currency_id: 'MXN',
                    }
                ],
                payer: {
                    email: params.payer.email,
                    name: params.payer.name,
                    surname: params.payer.surname,
                },
                back_urls: params.backUrls,
                auto_return: 'approved',
                metadata: params.metadata,
                statement_descriptor: 'BiciRegistro',
                // Excluir pagos en efectivo si se desea confirmación inmediata (Opcional, se deja abierto por ahora)
                // payment_methods: { ... } 
            }
        });

        // Retornamos el init_point para producción o sandbox_init_point según el entorno si fuera necesario,
        // pero el SDK suele manejar esto o se usa init_point que redirige correctamente.
        return response.init_point; 
    } catch (error) {
        console.error('Error creando preferencia en Mercado Pago:', error);
        throw error;
    }
}
