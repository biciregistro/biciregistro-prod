import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata = {
  title: "Aviso de Privacidad | BiciRegistro",
  description: "Aviso de privacidad integral de BiciRegistro. Conoce cómo protegemos tus datos personales.",
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <Card className="shadow-lg border-t-4 border-t-primary">
        <CardHeader className="text-center pb-2">
            <h1 className="text-3xl font-bold tracking-tight text-primary">AVISO DE PRIVACIDAD INTEGRAL</h1>
            <p className="text-muted-foreground">Última actualización: 26 de Noviembre de 2025</p>
        </CardHeader>
        <CardContent className="space-y-8 p-6 md:p-10 text-justify">
            
            <section className="space-y-4">
                <p>
                    <strong>Braulio Rivera Dominguez</strong>, quien opera comercialmente bajo la denominación "BICIREGISTRO", con domicilio fiscal ubicado en <strong>Mirador de San Juan 9, El Mirador, El Marques, Queretaro</strong>, es el Responsable del uso y protección de sus datos personales, y al respecto le informa lo siguiente:
                </p>
            </section>

            <Separator />

            <section className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">1. DATOS PERSONALES QUE RECABAMOS</h2>
                <p>Para llevar a cabo las finalidades descritas en el presente Aviso de Privacidad, utilizaremos los siguientes datos personales:</p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li><strong>Datos de Identificación:</strong> Nombre completo, fotografía de perfil, CURP, fecha de nacimiento.</li>
                    <li><strong>Datos de Contacto:</strong> Correo electrónico, número de teléfono móvil, domicilio.</li>
                    <li><strong>Datos Patrimoniales:</strong> Información relacionada con su bicicleta (Marca, modelo, número de serie, fotografías, color, factura o comprobante de propiedad), así como datos bancarios para el procesamiento de pagos (procesados a través de pasarelas seguras y encriptadas).</li>
                    <li><strong>Datos Sensibles (Salud):</strong> En caso de inscripción a eventos deportivos, podremos recabar: Tipo de sangre, alergias y contacto de emergencia.</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">2. FINALIDADES DEL TRATAMIENTO DE DATOS</h2>
                <p>Los datos personales que recabamos de usted los utilizaremos para las siguientes finalidades que son necesarias para el servicio que solicita:</p>
                
                <div className="pl-4 border-l-4 border-primary/20">
                    <h3 className="font-semibold text-lg mb-2">Finalidades Primarias:</h3>
                    <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                        <li>Crear su cuenta de usuario y generar la "Identidad Digital" de su bicicleta.</li>
                        <li>Validar la propiedad de la bicicleta para otorgar el estatus de verificación en el sistema.</li>
                        <li>Procesar inscripciones, pagos y check-in para eventos organizados por terceros ("Organizadores") dentro de la plataforma.</li>
                        <li>Permitir el funcionamiento del "Buscador Público", donde el número de serie y estatus de robo de la bicicleta son visibles para validar su procedencia (sin revelar sus datos personales de contacto).</li>
                        <li>Generar códigos QR de acceso y seguridad para eventos con el distintivo "Rodada Segura".</li>
                        <li>Contactarlo en caso de reportes de robo, recuperación o situaciones de emergencia durante un evento.</li>
                        <li>Facturación y cobranza de los servicios de gestión digital.</li>
                    </ul>
                </div>

                <div className="pl-4 border-l-4 border-muted">
                    <h3 className="font-semibold text-lg mb-2">Finalidades Secundarias:</h3>
                    <p className="mb-2">De manera adicional, utilizaremos su información personal para las siguientes finalidades que no son necesarias para el servicio solicitado, pero que nos permiten y facilitan brindarle una mejor atención:</p>
                    <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                        <li>Envío de newsletters, promociones y publicidad de nuevos eventos ciclistas.</li>
                        <li>Encuestas de calidad y estudios de mercado sobre la comunidad ciclista.</li>
                    </ul>
                    <p className="mt-4 text-sm text-muted-foreground italic">
                        En caso de que no desee que sus datos personales sean tratados para estos fines secundarios, usted puede presentar desde este momento un escrito vía correo electrónico a <a href="mailto:hola@biciregistro.mx" className="text-primary hover:underline">hola@biciregistro.mx</a>
                    </p>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">3. TRANSFERENCIA DE DATOS PERSONALES</h2>
                <p>Le informamos que sus datos personales son compartidos dentro del país con las siguientes personas, empresas, organizaciones y autoridades distintas a nosotros, para los siguientes fines:</p>
                
                <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted text-muted-foreground font-medium">
                            <tr>
                                <th className="p-3">Destinatario de los Datos</th>
                                <th className="p-3">Finalidad de la Transferencia</th>
                                <th className="p-3">Requiere Consentimiento</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            <tr>
                                <td className="p-3 font-medium">Organizadores de Eventos</td>
                                <td className="p-3">Gestión logística, entrega de kits, cronometraje, seguridad del evento y validación de bicicletas participantes.</td>
                                <td className="p-3">NO (Es necesario para el contrato)</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-medium">Pasarelas de Pago (Stripe/Conekta/Otros)</td>
                                <td className="p-3">Procesamiento de cobros, inscripciones y prevención de fraudes.</td>
                                <td className="p-3">NO</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-medium">Autoridades Competentes</td>
                                <td className="p-3">En caso de reporte de robo de bicicleta, para colaborar en la investigación y recuperación.</td>
                                <td className="p-3">NO</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <p className="text-sm bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200">
                    <strong>Nota Importante:</strong> Al inscribirse a un evento a través de BICIREGISTRO, usted acepta y autoriza que sus datos de identificación, contacto y los detalles de su bicicleta sean transferidos al Organizador de dicho evento para los fines logísticos y de seguridad mencionados.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">4. DERECHOS ARCO</h2>
                <p>
                    Usted tiene derecho a conocer qué datos personales tenemos de usted, para qué los utilizamos y las condiciones del uso que les damos (Acceso). Asimismo, es su derecho solicitar la corrección de su información personal en caso de que esté desactualizada, sea inexacta o incompleta (Rectificación); que la eliminemos de nuestros registros o bases de datos cuando considere que la misma no está siendo utilizada conforme a los principios, deberes y obligaciones previstas en la normativa (Cancelación); así como oponerse al uso de sus datos personales para fines específicos (Oposición). Estos derechos se conocen como derechos ARCO.
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="mb-2">Para el ejercicio de cualquiera de los derechos ARCO, usted deberá presentar la solicitud respectiva enviando un correo electrónico a:</p>
                    <a href="mailto:hola@biciregistro.mx" className="text-primary font-bold hover:underline text-lg">hola@biciregistro.mx</a>
                </div>
                <p>
                    El procedimiento y requisitos para el ejercicio de estos derechos es el siguiente: Enviar un escrito libre detallando su solicitud, acompañado de una identificación oficial digitalizada. Recibirá respuesta en un plazo máximo de 20 días hábiles.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">5. USO DE COOKIES Y TECNOLOGÍAS DE RASTREO</h2>
                <p>
                    Le informamos que en nuestra página de Internet utilizamos cookies, web beacons y otras tecnologías a través de las cuales es posible monitorear su comportamiento como usuario de Internet, brindarle un mejor servicio y experiencia de usuario al navegar en nuestra página.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">6. CAMBIOS AL AVISO DE PRIVACIDAD</h2>
                <p>
                    El presente aviso de privacidad puede sufrir modificaciones, cambios o actualizaciones derivadas de nuevos requerimientos legales; de nuestras propias necesidades por los productos o servicios que ofrecemos; de nuestras prácticas de privacidad; o por otras causas.
                </p>
                <p>
                    Nos comprometemos a mantenerlo informado sobre los cambios que pueda sufrir el presente aviso de privacidad, a través de su publicación en nuestro sitio web <strong>biciregistro.mx</strong>.
                </p>
            </section>

        </CardContent>
      </Card>
    </div>
  );
}
