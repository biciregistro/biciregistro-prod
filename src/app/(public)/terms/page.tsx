import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata = {
  title: "Términos y Condiciones | BiciRegistro",
  description: "Términos y condiciones integrales de uso y contrato de comisión mercantil y prestación de servicios digitales – BiciRegistro.",
};

export default function TermsPage() {
  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <Card className="shadow-lg border-t-4 border-t-primary">
        <CardHeader className="text-center pb-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary uppercase">
                TÉRMINOS Y CONDICIONES INTEGRALES DE USO Y CONTRATO DE COMISIÓN MERCANTIL Y PRESTACIÓN DE SERVICIOS DIGITALES – BICIREGISTRO
            </h1>
            <p className="text-muted-foreground mt-2">Última actualización: 31 de Enero de 2026</p>
        </CardHeader>
        <CardContent className="space-y-8 p-6 md:p-10 text-justify">
            
            <section className="space-y-4">
                <p>
                    Este documento constituye un Acuerdo Legal Vinculante y un CONTRATO DE ADHESIÓN celebrado por una parte por Braulio Rivera Dominguez, persona física con actividad empresarial que opera comercialmente bajo la denominación "BICIREGISTRO" (en adelante "LA PLATAFORMA" o "NOSOTROS"), con domicilio fiscal en Mirador de San Juan 9 Int 5, El Mirador, El Marqués, Querétaro, y RFC RIDB8609192X0; y por la otra parte, el usuario que accede, navega o utiliza los servicios (en adelante "EL USUARIO", quien podrá actuar en calidad de "CICLISTA" o de "ORGANIZADOR").
                </p>
                <p className="font-bold">
                    AL HACER CLIC EN "ACEPTAR", CREAR UNA CUENTA, REGISTRAR UN BIEN O PUBLICAR UN EVENTO, USTED MANIFIESTA SU CONSENTIMIENTO EXPRESO POR MEDIOS ELECTRÓNICOS EN TÉRMINOS DE LOS ARTÍCULOS 1803 DEL CÓDIGO CIVIL FEDERAL Y 93 DEL CÓDIGO DE COMERCIO, ACEPTANDO SOMETERSE A LA TOTALIDAD DE LAS SIGUIENTES CLÁUSULAS:
                </p>
            </section>

            <Separator />

            <section className="space-y-6">
                <h2 className="text-xl font-bold text-foreground uppercase">TÍTULO I: DISPOSICIONES GENERALES Y USUARIO FINAL (CICLISTA)</h2>
                
                <div className="space-y-4">
                    <h3 className="font-bold text-lg">1. DEFINICIÓN DEL SERVICIO Y LIMITACIÓN DE NATURALEZA JURÍDICA</h3>
                    <p>BICIREGISTRO es una plataforma tecnológica privada de intermediación, gestión de bases de datos y validación de identidad digital. EL USUARIO reconoce y acepta irrevocablemente que:</p>
                    <p>A. INEXISTENCIA DE SEGURO: El registro de una bicicleta en LA PLATAFORMA genera una "Identidad Digital" con fines disuasivos y de control administrativo. ESTO NO CONSTITUYE UNA PÓLIZA DE SEGURO NI GARANTÍA DE RECUPERACIÓN. LA PLATAFORMA no reembolsará, indemnizará, ni pagará suma alguna por robo, extravío, daño parcial o total, responsabilidad civil o gastos médicos.</p>
                    <p>B. CARÁCTER PRIVADO DEL REGISTRO (NO ES REPUVE): BICIREGISTRO es una base de datos de carácter privado. No somos una autoridad gubernamental ni sustituimos las funciones del Registro Público Vehicular (REPUVE) ni de las Fiscalías. La validación "RODADA SEGURA" es un filtro de seguridad privado basado en la buena fe y la documentación digital aportada; no constituye un peritaje forense ni una certificación de propiedad con fe pública.</p>
                    <p>C. ROL DE INTERMEDIARIO TECNOLÓGICO: En la venta de accesos a eventos, LA PLATAFORMA actúa exclusivamente como comisionista mercantil y proveedor de tecnología. NOSOTROS NO ORGANIZAMOS LOS EVENTOS, no trazamos las rutas, no proveemos la seguridad física ni la hidratación. La relación contractual del servicio del evento es directa y exclusiva entre el USUARIO y el ORGANIZADOR.</p>
                </div>

                <div className="space-y-4">
                    <h3 className="font-bold text-lg">2. VERACIDAD DE DATOS Y "DECLARACIÓN BAJO PROTESTA"</h3>
                    <p>El USUARIO declara bajo protesta de decir verdad que es el legítimo propietario o poseedor legal de la bicicleta registrada.</p>
                    <p>2.1. Prohibición de Ilícitos: Queda estrictamente prohibido registrar bienes con reporte de robo, números de serie alterados o de procedencia ilícita.</p>
                    <p>2.2. Facultad de Auditoría y Bloqueo: LA PLATAFORMA se reserva el derecho de realizar cruces de información con bases de datos públicas o privadas. En caso de detectar inconsistencias o reportes de robo, LA PLATAFORMA suspenderá la cuenta inmediatamente, inhabilitará el código QR de acceso y colaborará proactivamente con las autoridades competentes, entregando la información del usuario conforme al Artículo 189 de la Ley Federal de Telecomunicaciones y Radiodifusión.</p>
                </div>

                <div className="space-y-4">
                    <h3 className="font-bold text-lg">3. PRECIO, TARIFAS Y SEPARACIÓN DE CONCEPTOS (MODELO FISCAL)</h3>
                    <p>El USUARIO acepta que al adquirir un acceso, está pagando dos servicios independientes con regímenes fiscales distintos:</p>
                    <p>Costo de Inscripción (Ingreso del Organizador): Monto fijado por el tercero organizador por el servicio recreativo/deportivo.</p>
                    <p>Cargo por Servicio Digital (Ingreso de la Plataforma): Tarifa cobrada por BICIREGISTRO por el uso de la licencia de software, procesamiento bancario 24/7, validación de seguridad y emisión de boleto digital.</p>
                    <p>Nota Fiscal: El "Cargo por Servicio Digital" incluye el IVA correspondiente. El USUARIO recibirá, si así lo solicita, dos comprobantes fiscales (CFDI) distintos: uno emitido por el ORGANIZADOR (por la inscripción) y otro por LA PLATAFORMA (por el cargo de servicio).</p>
                </div>

                <div className="space-y-4">
                    <h3 className="font-bold text-lg">4. POLÍTICA DE EJECUCIÓN INMEDIATA Y NO REEMBOLSOS</h3>
                    <p>En cumplimiento con la Ley Federal de Protección al Consumidor, se informa al USUARIO:</p>
                    <p>4.1. Consumación del Servicio Digital: El "Cargo por Servicio Digital" corresponde a un servicio de ejecución inmediata. En el momento en que la plataforma procesa el pago, valida la base de datos y genera el código QR/Boleto, el servicio digital de LA PLATAFORMA se considera plenamente prestado y consumado, independientemente de si el usuario asiste o no al evento posteriormente. Por ende, este cargo NO es reembolsable, salvo error técnico imputable directamente al software de LA PLATAFORMA.</p>
                    <p>4.2. Cancelación del Evento: Si el evento es cancelado, pospuesto o modificado sustancialmente por el ORGANIZADOR, este último es el único responsable de reembolsar el "Costo de Inscripción" (valor nominal del boleto) al 100%, así como cualquier bonificación que marque la ley. LA PLATAFORMA coadyuvará en la gestión, pero no garantiza el reembolso con fondos propios una vez que estos han sido dispersados al ORGANIZADOR.</p>
                </div>

                <div className="space-y-4">
                    <h3 className="font-bold text-lg">5. CONSENTIMIENTO PARA EL TRATAMIENTO DE DATOS SENSIBLES</h3>
                    <p>Al inscribirse a eventos deportivos, el USUARIO puede proporcionar datos de salud (tipo de sangre, alergias). El USUARIO otorga su CONSENTIMIENTO EXPRESO para que dichos datos sean tratados y transferidos al ORGANIZADOR y servicios de emergencia exclusivamente con la finalidad de salvaguardar su integridad vital en caso de accidente, conforme a lo estipulado en nuestro Aviso de Privacidad Integral.</p>
                </div>
            </section>

            <Separator />

            <section className="space-y-6">
                <h2 className="text-xl font-bold text-foreground uppercase">TÍTULO II: TÉRMINOS COMERCIALES Y FISCALES PARA EL ORGANIZADOR (B2B)</h2>
                <p>Al publicar un evento, el ORGANIZADOR acepta este contrato de prestación de servicios y mandato de cobro bajo las siguientes cláusulas estrictas:</p>

                <div className="space-y-4">
                    <h3 className="font-bold text-lg">6. MANDATO DE COBRO Y LICENCIA</h3>
                    <p>EL ORGANIZADOR confiere a LA PLATAFORMA un mandato irrevocable para cobrar en su nombre y representación las inscripciones a través de la pasarela de pagos del sistema. LA PLATAFORMA custodiará dichos fondos ("Fondos en Garantía") hasta su dispersión, descontando las comisiones pactadas.</p>
                </div>

                <div className="space-y-4">
                    <h3 className="font-bold text-lg">7. OBLIGACIONES FISCALES Y RETENCIONES (RÉGIMEN DE PLATAFORMAS DIGITALES)</h3>
                    <p>CLÁUSULA DE BLINDAJE FISCAL: En cumplimiento con la Ley del Impuesto Sobre la Renta (LISR, Título IV, Cap. II, Sec. III) y la Ley del IVA vigentes en 2026 para la enajenación de bienes y prestación de servicios a través de plataformas tecnológicas:</p>
                    <p>7.1. Organizadores Personas Físicas:</p>
                    <p>LA PLATAFORMA fungirá como AGENTE RETENEDOR. Del total de ingresos generados por las inscripciones, se descontarán y enterarán al SAT las tasas vigentes de ISR (Retención) e IVA (Retención del 50% o 100% según corresponda).</p>
                    <p>Si el ORGANIZADOR proporciona su RFC válido en el sistema: Se aplicarán las tasas de retención estándar publicadas en la Resolución Miscelánea Fiscal vigente.</p>
                    <p>Si el ORGANIZADOR NO proporciona RFC: Se aplicará la retención máxima de ley (20% de ISR y 100% del IVA causado).</p>
                    <p>LA PLATAFORMA emitirá mensualmente el CFDI de Retenciones e Información de Pagos correspondiente.</p>
                    <p>7.2. Organizadores Personas Morales:</p>
                    <p>No se aplicarán retenciones de ISR/IVA, siempre y cuando acrediten su personalidad jurídica y entreguen Constancia de Situación Fiscal vigente. En este caso, la Persona Moral recibe el monto (menos comisión de servicio) y es enteramente responsable de declarar sus impuestos.</p>
                    <p>7.3. Lavado de Dinero (LFPIORPI): EL ORGANIZADOR declara que los recursos obtenidos del evento tienen procedencia lícita. LA PLATAFORMA se reserva el derecho de retener fondos y reportar a la UIF cualquier operación inusual o que supere los umbrales de identificación de Actividades Vulnerables.</p>
                </div>

                <div className="space-y-4">
                    <h3 className="font-bold text-lg">8. POLÍTICA "ANTI-ELUSIÓN" Y EVENTOS GRATUITOS</h3>
                    <p>LA PLATAFORMA ofrece tecnología gratuita (Tasa 0%) para eventos sin fines de lucro.</p>
                    <p>Penalización por Taquilla Oculta: Si EL ORGANIZADOR publica un evento como "Gratuito" para evadir comisiones, pero cobra por fuera (efectivo, transferencia personal) condicionando el acceso al registro en la plataforma, se hará acreedor a una Pena Convencional equivalente a $50.00 MXN por cada asistente registrado, más la cancelación inmediata del servicio. EL ORGANIZADOR autoriza el cobro de esta pena de cualquier saldo a favor que tenga en custodia LA PLATAFORMA.</p>
                </div>

                <div className="space-y-4">
                    <h3 className="font-bold text-lg">9. COMPENSACIÓN UNIVERSAL Y CONTRACARGOS</h3>
                    <p>9.1. Responsabilidad por Contracargos: EL ORGANIZADOR asume la responsabilidad total frente a "Contracargos" (desconocimiento de cargo bancario por parte del usuario). Si un banco debita a LA PLATAFORMA un monto por este concepto, EL ORGANIZADOR deberá reembolsarlo de inmediato.</p>
                    <p>9.2. Compensación Automática: EL ORGANIZADOR autoriza expresa e irrevocablemente a LA PLATAFORMA a descontar (compensar) cualquier adeudo, contracargo, reembolso pendiente o pena convencional, de cualquier saldo presente o futuro que LA PLATAFORMA tenga en su poder a favor del ORGANIZADOR, incluso si provienen de eventos distintos.</p>
                </div>

                <div className="space-y-4">
                    <h3 className="font-bold text-lg">10. LIBERACIÓN DE RESPONSABILIDAD Y SACA EN PAZ (INDEMNIDAD)</h3>
                    <p>EL ORGANIZADOR reconoce que él es el único operador del evento. Por lo tanto, se obliga a SACAR EN PAZ Y A SALVO e indemnizar a LA PLATAFORMA (Braulio Rivera Dominguez), sus empleados y aliados, de cualquier demanda, reclamación civil, penal, laboral o administrativa (incluyendo multas de PROFECO o Protección Civil) derivada de:</p>
                    <p>a) Accidentes, lesiones o muerte de participantes.</p>
                    <p>b) Cancelación o incumplimiento del evento.</p>
                    <p>c) Falta de pago de impuestos propios del Organizador.</p>
                    <p>d) Uso indebido de datos personales por parte del Organizador.</p>
                </div>
            </section>

            <Separator />

            <section className="space-y-6">
                <h2 className="text-xl font-bold text-foreground uppercase">TÍTULO III: DISPOSICIONES FINALES</h2>
                
                <div className="space-y-4">
                    <h3 className="font-bold text-lg">11. PROPIEDAD INTELECTUAL</h3>
                    <p>Todo el software, marcas, logotipos y bases de datos son propiedad exclusiva de BICIREGISTRO. Se prohíbe la ingeniería inversa, el "scraping" (extracción automatizada de datos) y el uso no autorizado de la marca.</p>
                </div>

                <div className="space-y-4">
                    <h3 className="font-bold text-lg">12. JURISDICCIÓN Y LEY APLICABLE</h3>
                    <p>Para la interpretación y cumplimiento de este contrato, las partes se someten a las leyes federales de los Estados Unidos Mexicanos (Código de Comercio, CFF, LFPDPPP) y, en caso de controversia, a la jurisdicción exclusiva de los tribunales competentes en la ciudad de Santiago de Querétaro, Querétaro, renunciando expresamente a cualquier otro fuero que pudiera corresponderles por razón de sus domicilios presentes o futuros.</p>
                </div>
            </section>
            
            <Separator />
            
            <footer className="text-center text-sm text-muted-foreground">
                <p>Biciregistro© 2026. Todos los derechos reservados.</p>
            </footer>

        </CardContent>
      </Card>
    </div>
  );
}
