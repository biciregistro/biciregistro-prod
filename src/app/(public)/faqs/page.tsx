import { Metadata } from 'next';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MessageCircle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: 'Preguntas Frecuentes | BiciRegistro',
  description: 'Todo lo que necesitas saber para rodar protegido y sin dudas sobre el registro de tu bicicleta, eventos y seguridad.',
};

const faqs = [
  {
    category: "🚲 Sobre Biciregistro",
    items: [
      {
        question: "¿Qué es exactamente Biciregistro?",
        answer: "No somos un seguro ni una tienda de candados. Somos la plataforma nacional que genera la Identidad Digital de tu bicicleta. Vinculamos legalmente tu bicicleta contigo a través de su número de serie, fotografías y documentos, creando un registro único que te ayuda a demostrar tu propiedad, combatir el robo y participar en eventos seguros."
      },
      {
        question: "¿Tiene costo registrar mi bicicleta?",
        answer: "¡Es 100% GRATIS! Creemos que la seguridad es un derecho. Registrar tu bicicleta, subir tus fotos, generar tu certificado de propiedad y usar el botón de alerta de robo no tiene ningún costo para ti."
      },
      {
        question: "¿Biciregistro funciona como un seguro contra robo?",
        answer: "No. Biciregistro es una herramienta de prevención, disuasión y recuperación, pero no es una póliza de seguro financiero. Si roban tu bicicleta, nosotros no te reembolsamos el dinero, pero te damos todas las herramientas tecnológicas (alertas masivas, rastreo en red, expediente legal) para maximizar las posibilidades de recuperarla con las autoridades."
      }
    ]
  },
  {
    category: "🔐 Registro y Seguridad",
    items: [
      {
        question: "¿Dónde encuentro el número de serie de mi bicicleta?",
        answer: "En el 90% de las bicicletas, el número de serie está grabado en el metal debajo de la caja del pedalier (la parte más baja del cuadro, donde se unen los pedales). Dale la vuelta a tu bici y búscalo ahí. También puede estar en el tubo frontal (donde va el manubrio) o en la vaina trasera cerca de la llanta."
      },
      {
        question: "¿Qué pasa si mi bicicleta no tiene número de serie?",
        answer: "Si tu bici es muy antigua o fue repintada y perdió el número, te recomendamos grabarle un código personal o acudir a un taller especializado para que lo hagan. Sin un número de serie o una marca única, es imposible crear una Identidad Digital válida."
      },
      {
        question: "¿Mis datos personales son públicos?",
        answer: "Absolutamente no. Tu dirección, teléfono y nombre están encriptados y protegidos. Lo único que es público es la información de la bicicleta (Marca, Modelo, Color y Estatus). Si alguien busca tu número de serie en nuestro sistema, solo verá si la bici está \"EN REGLA\" o tiene \"REPORTE DE ROBO\", pero nunca verá quién es el dueño ni dónde vive."
      }
    ]
  },
  {
    category: "🏁 Eventos y \"Rodada Segura\"",
    items: [
      {
        question: "¿Qué es el distintivo \"Rodada Segura\"?",
        answer: "Es un sello de garantía que otorgamos a los eventos que utilizan nuestra tecnología para validar a sus participantes. Significa que en ese evento, todas las bicicletas han sido verificadas para asegurar que no tienen reporte de robo. Al participar ahí, ruedas en un entorno de legalidad y confianza."
      },
      {
        question: "¿Por qué hay un \"Cargo por Gestión\" al inscribirme a un evento?",
        answer: "Biciregistro es gratuito para el uso cotidiano, pero para mantener esta tecnología operando y ofrecer servicios avanzados a los organizadores (como validación de seguridad, check-in digital y protección de datos), aplicamos una pequeña cuota de servicio en las inscripciones de pago. Este monto garantiza que tu experiencia sea segura, rápida y profesional."
      },
      {
        question: "Si ya tengo cuenta, ¿tengo que llenar mis datos de nuevo para cada carrera?",
        answer: "¡No! Esa es la magia de Biciregistro. Una vez que tienes tu perfil, inscribirte a cualquier evento de nuestra red es cuestión de un par de clics. Tus datos y los de tu bici se cargan automáticamente."
      }
    ]
  },
  {
    category: "🚨 En caso de Robo",
    items: [
      {
        question: "Me robaron la bicicleta, ¿qué hago?",
        answer: "Actúa rápido (tienes la \"Hora Dorada\"). Entra a tu perfil en Biciregistro y presiona el botón REPORTAR ROBO. Esto cambia el estatus de tu bici a rojo (ROBADA) en todo el sistema y alerta a la comunidad cercana. Descarga desde la app tu Expediente de Denuncia (PDF), que incluye fotos, factura y datos técnicos, y preséntalo inmediatamente ante el Ministerio Público."
      },
      {
        question: "Encontré mi bici robada en venta en internet, ¿ustedes la recuperan?",
        answer: "Por tu seguridad, nunca intentes recuperarla solo. Biciregistro te ayuda a detectarla y probar que es tuya, pero la recuperación física es trabajo de la policía. Usa tu Certificado de Propiedad Digital como prueba irrefutable ante las autoridades para que ellos procedan al aseguramiento."
      }
    ]
  },
  {
    category: "🛒 Compra y Venta",
    items: [
      {
        question: "Voy a comprar una bici usada, ¿cómo sé si no es robada?",
        answer: "Antes de soltar el dinero, pide al vendedor el número de serie de la bicicleta. Ingresa ese número en el Buscador Público de nuestra página principal. Si aparece Verde (En Regla): Es segura. Si aparece Rojo (Robada): ¡Aléjate y no compres problemas! Si no aparece: Ten precaución y pide la factura original."
      },
      {
        question: "Vendí mi bicicleta, ¿cómo se la paso al nuevo dueño?",
        answer: "Es muy fácil. Entra a \"Mi Garaje\", selecciona la bicicleta y elige la opción \"Transferir Propiedad\". Ingresa el correo electrónico del nuevo dueño (debe tener cuenta en Biciregistro). Al aceptar, la bicicleta desaparece de tu perfil y aparece en el suyo, manteniendo el historial de legalidad intacto."
      }
    ]
  }
];

export default function FAQPage() {
  return (
    <div className="container max-w-4xl mx-auto py-12 px-4 space-y-12">
      
      {/* Hero Section */}
      <section className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 text-primary mb-4">
          <HelpCircle className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          Preguntas Frecuentes
        </h1>
        <p className="text-xl text-muted-foreground">
          Todo lo que necesitas saber para rodar protegido y sin dudas.
        </p>
      </section>

      {/* FAQs Sections */}
      <div className="space-y-8">
        {faqs.map((section, idx) => (
          <section key={idx} className="space-y-4">
            <h2 className="text-2xl font-bold border-b pb-2">{section.category}</h2>
            <Accordion type="single" collapsible className="w-full">
              {section.items.map((item, itemIdx) => (
                <AccordionItem key={itemIdx} value={`item-${idx}-${itemIdx}`}>
                  <AccordionTrigger className="text-left font-medium text-lg hover:no-underline hover:text-primary">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}
      </div>

      {/* Support Section */}
      <section className="bg-muted/50 rounded-2xl p-8 border text-center space-y-6">
        <div>
          <h2 className="text-2xl font-bold">¿No encontraste tu respuesta?</h2>
          <p className="text-muted-foreground mt-2">
            Nuestro equipo de soporte (que también son ciclistas) está listo para ayudarte.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button variant="outline" size="lg" asChild className="gap-2 h-14 text-base">
            <Link href="mailto:hola@biciregistro.mx">
              <Mail className="h-5 w-5" />
              hola@biciregistro.mx
            </Link>
          </Button>
          <Button size="lg" asChild className="gap-2 h-14 text-base bg-green-600 hover:bg-green-700">
            <Link href="https://wa.me/525569691709" target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-5 w-5" />
              WhatsApp: 55 6969 1709
            </Link>
          </Button>
        </div>
      </section>

    </div>
  );
}
