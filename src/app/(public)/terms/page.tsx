import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

export const metadata = {
  title: "Términos y Condiciones | BiciRegistro",
  description: "Términos y condiciones de uso de la plataforma BiciRegistro.",
};

export default function TermsPage() {
  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <Card className="shadow-lg border-t-4 border-t-primary">
        <CardHeader className="text-center pb-2">
            <h1 className="text-3xl font-bold tracking-tight text-primary">TÉRMINOS Y CONDICIONES DE USO</h1>
            <p className="text-muted-foreground">Última actualización: 26 Noviembre de 2025</p>
        </CardHeader>
        <CardContent className="space-y-8 p-6 md:p-10 text-justify">
            
            <section className="space-y-4">
                <p>
                    Bienvenido a <strong>Biciregistro</strong>. A continuación, se describen los términos y condiciones (en adelante los "Términos") que rigen el uso del sitio web, la aplicación móvil, la plataforma tecnológica y los servicios ofrecidos por <strong>Braulio Rivera Dominguez</strong>, quien opera comercialmente bajo la denominación "Biciregistro" (en adelante "LA PLATAFORMA" o "NOSOTROS").
                </p>
                <p>
                    Al crear una cuenta, registrar una bicicleta o inscribirse a un evento a través de nuestro sistema, usted (el "USUARIO") acepta someterse a estos Términos. <strong>Si no está de acuerdo con ellos, deberá abstenerse de utilizar nuestros servicios.</strong>
                </p>
            </section>

            <Separator />

            <section className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">1. NATURALEZA DEL SERVICIO Y DESLINDE DE ASEGURAMIENTO</h2>
                <p>Biciregistro es una plataforma tecnológica de intermediación y base de datos. El USUARIO reconoce y acepta expresamente que:</p>
                
                <div className="space-y-4 pl-4 border-l-4 border-primary/20">
                    <div>
                        <h3 className="font-bold text-primary inline">NO SOMOS UNA ASEGURADORA:</h3>
                        <p className="inline"> El registro de la bicicleta en la plataforma genera una "Identidad Digital" disuasiva y de control, pero <strong>NO constituye una póliza de seguro</strong>. "LA PLATAFORMA" NO reembolsará, indemnizará ni pagará suma alguna en caso de robo, extravío, daño parcial o total de la bicicleta, ni cubrirá gastos médicos o responsabilidad civil derivados de su uso.</p>
                    </div>
                    <div>
                        <h3 className="font-bold text-primary inline">NO SOMOS AUTORIDAD NI PERITOS:</h3>
                        <p className="inline"> La validación que realiza el sistema se basa en la información y fotografías proporcionadas por el USUARIO bajo protesta de decir verdad. "LA PLATAFORMA" no realiza inspecciones físicas ni peritajes forenses a las bicicletas, por lo que no garantizamos la autenticidad mecánica ni legal absoluta de los bienes registrados.</p>
                    </div>
                    <div>
                        <h3 className="font-bold text-primary inline">SOMOS INTERMEDIARIOS:</h3>
                        <p className="inline"> En la gestión de eventos, "LA PLATAFORMA" actúa únicamente como proveedor de tecnología y comisionista mercantil de cobranza. <strong>NOSOTROS NO ORGANIZAMOS LOS EVENTOS</strong> (salvo que se indique expresamente lo contrario), ni somos responsables de la logística, seguridad física en la ruta, abasto de hidratación, o entrega de kits de los eventos publicados por terceros ("ORGANIZADORES").</p>
                    </div>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">2. CUENTA DE USUARIO Y VERACIDAD DE DATOS</h2>
                <p>El USUARIO se compromete a proporcionar información veraz, exacta y actualizada.</p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li><strong>Registro de Bicicletas:</strong> Queda estrictamente prohibido registrar bicicletas con reporte de robo vigente, alterar números de serie o adjudicarse la propiedad de bienes ajenos.</li>
                    <li><strong>Consecuencias:</strong> Si "LA PLATAFORMA" detecta o recibe pruebas de que una bicicleta registrada tiene un origen ilícito, nos reservamos el derecho de suspender la cuenta del USUARIO de forma inmediata, cancelar sus inscripciones vigentes y compartir la información con las autoridades competentes.</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">3. INSCRIPCIONES A EVENTOS Y PAGOS</h2>
                <p>Al inscribirse a un evento a través de BICIREGISTRO, el USUARIO acepta pagar el "Precio Total", el cual se compone de:</p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li><strong>Costo de Inscripción:</strong> El monto fijado por el ORGANIZADOR.</li>
                    <li><strong>Gestión de Inscripción (Cargo por Servicio):</strong> Una tarifa adicional cobrada por "LA PLATAFORMA" que cubre el uso de la tecnología, la validación de seguridad ("Rodada Segura"), el procesamiento bancario y la emisión del boleto digital.</li>
                </ul>
                <p className="text-sm bg-muted p-3 rounded-md">
                    El cargo de "Gestión de Inscripción" incluye el Impuesto al Valor Agregado (IVA) y se mostrará desglosado antes de finalizar la compra.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">4. POLÍTICA DE REEMBOLSOS Y CANCELACIONES</h2>
                <p>Esta es una parte esencial de nuestro servicio. Al aceptar estos términos, el USUARIO reconoce que:</p>
                <div className="space-y-4">
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900 p-4 rounded-md">
                        <h3 className="font-bold text-red-800 dark:text-red-200">El Cargo por Gestión NO es Reembolsable:</h3>
                        <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                            El cargo por "Gestión de Inscripción" corresponde a un servicio digital, administrativo y de verificación que se considera ejecutado y consumado en el momento en que la plataforma procesa el registro y asegura el lugar del USUARIO. Por lo tanto, incluso si el USUARIO decide no asistir o cancela su participación, dicha comisión no será devuelta.
                        </p>
                    </div>
                    <div>
                        <h3 className="font-bold">Cancelación del Evento por el Organizador:</h3>
                        <p>Si el evento es cancelado o pospuesto por causas imputables al ORGANIZADOR o por fuerza mayor (clima, permisos, etc.), la responsabilidad de reembolsar el "Costo de Inscripción" (el valor del boleto) recae 100% en el ORGANIZADOR. "LA PLATAFORMA" coadyuvará en el proceso de comunicación, pero no resguarda los fondos del evento una vez dispersados al ORGANIZADOR.</p>
                    </div>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">5. REGLAS DE ACCESO "RODADA SEGURA"</h2>
                <p>Para garantizar la seguridad de la comunidad, los eventos marcados con el distintivo "Rodada Segura" requieren obligatoriamente que cada bicicleta participante esté registrada y validada en nuestro sistema.</p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li><strong>Condición de Acceso:</strong> El USUARIO acepta que para descargar su Código QR de acceso o recibir su kit de participante, deberá asignar una bicicleta válida a su inscripción.</li>
                    <li><strong>Derecho de Admisión:</strong> El ORGANIZADOR se reserva el derecho de negar el acceso a participantes que se presenten con bicicletas no registradas o que presenten anomalías en sus números de serie, sin derecho a reembolso.</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">6. VOLUNTARIEDAD Y LIMITACIÓN DE RESPONSABILIDAD</h2>
                <div className="space-y-3">
                    <p><strong>6.1. Voluntariedad:</strong> El uso de "LA PLATAFORMA" y el registro de bicicletas es un acto totalmente voluntario del USUARIO. Sin embargo, el USUARIO reconoce que ciertos servicios prestados por terceros (como la participación en eventos con distintivo "Rodada Segura") pueden establecer el registro en BICIREGISTRO como un requisito indispensable de acceso privado. En tal caso, si el USUARIO decide no registrar su bicicleta, entiende que se le podrá negar el servicio o acceso al evento sin responsabilidad para "LA PLATAFORMA".</p>
                    
                    <p><strong>6.2. Liberación de Responsabilidad sobre el Bien:</strong> "LA PLATAFORMA" funciona como un repositorio de información proporcionada por terceros. Por lo tanto, "LA PLATAFORMA" se libera de toda responsabilidad civil, penal o administrativa relacionada con:</p>
                    <ul className="list-disc pl-10 space-y-1 text-muted-foreground">
                        <li>La tenencia legal de la bicicleta (si resulta que el usuario registró una bici robada, la responsabilidad es 100% del usuario).</li>
                        <li>El estado mecánico de la bicicleta.</li>
                        <li>El uso que el USUARIO dé a la bicicleta registrada.</li>
                    </ul>

                    <p><strong>6.3. Fallas en el Evento:</strong> "LA PLATAFORMA" no controla la logística de los ORGANIZADORES. No somos responsables por accidentes, caídas, lesiones, fallecimientos, robos durante el evento, o cualquier incumplimiento por parte del ORGANIZADOR respecto a lo prometido en su convocatoria.</p>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">7. PROPIEDAD INTELECTUAL</h2>
                <p>El software, código fuente, diseño, logotipos y base de datos de "Biciregistro" son propiedad exclusiva de BiciRegistro. Queda prohibida su reproducción, ingeniería inversa o uso no autorizado con fines de lucro.</p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">8. AVISO DE PRIVACIDAD</h2>
                <p>El tratamiento de sus datos personales se rige por nuestro Aviso de Privacidad Integral, el cual forma parte integral de estos Términos y puede ser consultado en <Link href="/privacy" className="text-primary hover:underline font-medium">nuestra página de Aviso de Privacidad</Link>.</p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">9. JURISDICCIÓN Y LEGISLACIÓN APLICABLE</h2>
                <p>Para la interpretación y cumplimiento de los presentes Términos, así como para cualquier controversia que pudiera derivarse del uso de la plataforma, las partes se someten a las leyes vigentes en los Estados Unidos Mexicanos y a la jurisdicción de los tribunales competentes en la ciudad de Querétaro, renunciando a cualquier otro fuero que pudiera corresponderles por razón de sus domicilios presentes o futuros.</p>
            </section>

        </CardContent>
      </Card>
    </div>
  );
}
