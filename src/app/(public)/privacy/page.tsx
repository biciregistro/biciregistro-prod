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
            <p className="text-muted-foreground">Última actualización: 31 de Enero de 2026</p>
        </CardHeader>
        <CardContent className="space-y-8 p-6 md:p-10 text-justify">
            
            <section className="space-y-4">
                <p>
                    En cumplimiento con lo dispuesto por la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), su Reglamento y los Lineamientos del Aviso de Privacidad vigentes en México, se emite el presente documento:
                </p>
            </section>

            <Separator />

            <section className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">I. IDENTIDAD Y DOMICILIO DEL RESPONSABLE</h2>
                <p>
                    <strong>Braulio Rivera Dominguez</strong>, quien opera comercialmente bajo la marca "BICIREGISTRO" (en adelante "EL RESPONSABLE"), con domicilio fiscal para oír y recibir notificaciones en <strong>Mirador de San Juan 9 Int 5, El Mirador, El Marqués, Querétaro</strong>, es el responsable del uso, tratamiento y protección de sus datos personales.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">II. DATOS PERSONALES QUE SERÁN RECABADOS</h2>
                <p>Para la prestación de nuestros servicios, recabaremos las siguientes categorías de datos:</p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li><strong>Datos de Identificación y Contacto:</strong> Nombre completo, CURP, domicilio, número de teléfono celular, correo electrónico, imagen de perfil y firma autógrafa digitalizada.</li>
                    <li><strong>Datos Patrimoniales y Financieros:</strong> Información fiscal (RFC, Régimen Fiscal), historial de compras, datos de tarjetas bancarias (procesados y tokenizados vía pasarelas de pago certificadas PCI-DSS), así como información legal y fotográfica de sus bienes muebles (bicicletas: marca, modelo, número de serie, factura de origen).</li>
                    <li><strong>Datos de Geolocalización:</strong> Ubicación aproximada derivada de la dirección IP o ubicación precisa del dispositivo móvil cuando se utiliza para validar asistencia a eventos o reportar robos.</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">III. DATOS PERSONALES SENSIBLES (SALUD)</h2>
                <p>Se hace de su conocimiento que, para la participación en ciertos eventos deportivos de alto rendimiento gestionados a través de la plataforma, podremos recabar datos considerados como SENSIBLES:</p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li><strong>Estado de salud presente:</strong> Tipo de sangre, alergias, padecimientos crónicos y contactos de emergencia.</li>
                </ul>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 text-sm">
                    <strong>CONSENTIMIENTO EXPRESO:</strong> De conformidad con el artículo 9 de la LFPDPPP, el tratamiento de sus datos sensibles requiere de su consentimiento expreso. Al marcar la casilla "Acepto el tratamiento de mis datos médicos para fines de emergencia" en el formulario de inscripción, usted otorga dicho consentimiento de manera electrónica verificable.
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">IV. FINALIDADES DEL TRATAMIENTO</h2>
                <p>Sus datos serán utilizados para las siguientes finalidades:</p>
                
                <div className="pl-4 border-l-4 border-primary/20">
                    <h3 className="font-semibold text-lg mb-2">A. FINALIDADES PRIMARIAS (Necesarias para el servicio y la relación jurídica):</h3>
                    <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                        <li>Verificar su identidad y crear su cuenta de usuario en la plataforma.</li>
                        <li>Generar la "Identidad Digital" de su bicicleta para fines de disuasión de robo y validación de propiedad.</li>
                        <li>Procesar inscripciones, cobros y emitir los comprobantes de operación (boletos digitales/QR).</li>
                        <li><strong>Cumplimiento Fiscal:</strong> Emitir facturas (CFDI) y realizar las retenciones de impuestos (ISR/IVA) correspondientes en caso de que usted actúe como Organizador, reportando dicha información al SAT.</li>
                        <li><strong>Seguridad (Rodada Segura):</strong> Permitir la validación del estatus legal de la bicicleta en puntos de control de eventos.</li>
                        <li><strong>Atención de Emergencias:</strong> Transferir sus datos de salud a servicios médicos o de protección civil únicamente en caso de accidente durante un evento.</li>
                    </ul>
                </div>

                <div className="pl-4 border-l-4 border-muted">
                    <h3 className="font-semibold text-lg mb-2">B. FINALIDADES SECUNDARIAS (Distintas al servicio principal):</h3>
                    <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                        <li>Envío de publicidad, boletines (newsletters) y promociones de nuevos eventos.</li>
                        <li>Prospección comercial y encuestas de calidad.</li>
                        <li><strong>Transferencia a Patrocinadores:</strong> Compartir sus datos de contacto con marcas aliadas para el envío de ofertas comerciales.</li>
                    </ul>
                    <p className="mt-4 text-sm text-muted-foreground italic">
                        <strong>MECANISMO DE NEGATIVA:</strong> En caso de que no desee que sus datos personales sean tratados para estas finalidades secundarias, usted podrá indicarlo en el momento de su registro desmarcando la casilla correspondiente, o bien, enviando un correo a <a href="mailto:hola@biciregistro.mx" className="text-primary hover:underline">hola@biciregistro.mx</a> con el asunto "Negativa Finalidades Secundarias". La negativa para el uso de sus datos para estas finalidades no será motivo para que le neguemos los servicios y productos que solicita.
                    </p>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">V. TRANSFERENCIAS DE DATOS</h2>
                <p>Le informamos que sus datos personales podrán ser transferidos dentro y fuera del país a los siguientes destinatarios:</p>
                
                <div className="rounded-md border overflow-hidden overflow-x-auto">
                    <table className="w-full text-sm text-left min-w-[600px]">
                        <thead className="bg-muted text-muted-foreground font-medium">
                            <tr>
                                <th className="p-3">Destinatario</th>
                                <th className="p-3">Finalidad</th>
                                <th className="p-3">Consentimiento</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            <tr>
                                <td className="p-3 font-medium">Organizadores de Eventos</td>
                                <td className="p-3">Gestión logística del evento al que usted se inscribió, control de acceso y seguridad.</td>
                                <td className="p-3">No Requerido (Necesario para el contrato).</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-medium">SAT / Autoridades Fiscales</td>
                                <td className="p-3">Cumplimiento de obligaciones fiscales, reporte de ingresos y retenciones.</td>
                                <td className="p-3">No Requerido (Obligación Legal).</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-medium">Autoridades (Fiscalía/Policía)</td>
                                <td className="p-3">Coadyuvancia en investigación de robo de bicicletas o delitos cibernéticos.</td>
                                <td className="p-3">No Requerido (Orden Judicial o Ley).</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-medium">Pasarelas de Pago</td>
                                <td className="p-3">Procesamiento y validación de transacciones financieras.</td>
                                <td className="p-3">No Requerido (Necesario para el contrato).</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-medium">Patrocinadores / Aliados</td>
                                <td className="p-3">Ofertas comerciales y marketing.</td>
                                <td className="p-3 font-bold text-primary">REQUERIDO (Vía Opt-in).</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">VI. MEDIOS Y PROCEDIMIENTO PARA EJERCER DERECHOS ARCO</h2>
                <p>
                    Usted tiene derecho a conocer qué datos tenemos de usted, para qué los utilizamos y las condiciones del uso que les damos (Acceso). Asimismo, es su derecho solicitar la corrección de su información personal (Rectificación); que la eliminemos de nuestros registros (Cancelación); así como oponerse al uso de sus datos para fines específicos (Oposición).
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="mb-2">Para ejercer sus derechos ARCO, deberá enviar una solicitud al correo <a href="mailto:hola@biciregistro.mx" className="text-primary font-bold hover:underline">hola@biciregistro.mx</a> conteniendo:</p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-sm">
                        <li>Nombre completo del titular.</li>
                        <li>Copia digitalizada de una identificación oficial vigente (INE o Pasaporte) para acreditar su identidad (medida de seguridad para evitar suplantación).</li>
                        <li>Descripción clara de los datos sobre los que busca ejercer sus derechos.</li>
                    </ul>
                    <p className="mt-2 text-sm font-medium">El plazo de respuesta será de máximo 20 días hábiles.</p>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">VII. USO DE COOKIES Y RASTREADORES</h2>
                <p>
                    Le informamos que en nuestra página de Internet utilizamos cookies, web beacons y otras tecnologías a través de las cuales es posible monitorear su comportamiento como usuario de Internet para brindarle un mejor servicio y experiencia de usuario. Los datos que obtenemos incluyen: dirección IP, tipo de navegador, tiempo de navegación y secciones consultadas. Puede deshabilitar estas tecnologías en la configuración de su navegador.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">VIII. CAMBIOS AL AVISO DE PRIVACIDAD</h2>
                <p>
                    El presente aviso de privacidad puede sufrir modificaciones derivadas de nuevos requerimientos legales o de nuestras propias necesidades. Nos comprometemos a mantenerlo informado sobre los cambios a través de su publicación visible en <strong>biciregistro.mx</strong>.
                </p>
            </section>
            
            <Separator />
            
            <footer className="text-center text-sm text-muted-foreground">
                <p>Biciregistro© 2026 Biciregistro. Todos los derechos reservados.</p>
            </footer>

        </CardContent>
      </Card>
    </div>
  );
}
