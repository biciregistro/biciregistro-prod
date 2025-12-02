import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Nosotros | BiciRegistro',
  description: 'Conoce nuestra misión de transformar el anonimato en identidad y al equipo de expertos detrás de BiciRegistro.',
};

export default function AboutPage() {
  return (
    <div className="container max-w-5xl mx-auto py-12 px-4 space-y-16">
      
      {/* Hero Section */}
      <section className="text-center space-y-6">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          ¿Qué es Biciregistro?
        </h1>
        <div className="max-w-3xl mx-auto text-lg text-muted-foreground space-y-4 leading-relaxed text-justify">
          <p>
            En Biciregistro, creemos que la bicicleta es mucho más que un vehículo; es una herramienta de libertad, salud y transformación social. Sin embargo, sabemos que esa libertad se ve amenazada por el miedo constante al robo y la inseguridad. Creemos firmemente que la mejor forma de proteger a la comunidad no es solo con candados más fuertes, sino con una identidad inquebrantable y una red de colaboración unida.
          </p>
          <p>
            Por eso transformamos el anonimato en identidad. Utilizamos tecnología escalable para crear el "ADN Digital" de cada bicicleta, vinculándola de manera única con su dueño. Pero la tecnología por sí sola no basta. Construimos alianzas estratégicas con organizadores de eventos, asociaciones civiles y autoridades para crear un ecosistema donde una bicicleta robada sea imposible de vender y fácil de identificar. Fomentamos la cultura de la legalidad a través de la tecnologia, transparencia y la cooperación.
          </p>
        </div>
      </section>

      {/* Mission Highlight */}
      <section className="bg-muted/50 rounded-2xl p-8 md:p-12 text-center border">
        <h2 className="text-2xl font-bold mb-4">Nuestra Promesa</h2>
        <p className="text-lg md:text-xl font-medium text-foreground max-w-4xl mx-auto">
          "Biciregistro es la plataforma integral de gestión de identidad vehicular para bicicletas y el centro de comando para eventos ciclistas seguros. Ofrecemos herramientas gratuitas de protección patrimonial para el usuario y soluciones de logística automatizada para organizadores, todo bajo un modelo sostenible diseñado para blindar a la comunidad ciclista de México y LATAM."
        </p>
      </section>

      {/* Team Section */}
      <section className="space-y-10">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold">Nuestro Equipo</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Detrás de la tecnología, somos un equipo multidisciplinario de expertos con décadas de experiencia en desarrollo de software, transformación ágil y gestión financiera de alto nivel. Unimos nuestra experiencia corporativa con nuestra pasión por el ciclismo para construir una solución robusta y escalable.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Braulio Rivera */}
          <Card className="text-center hover:shadow-lg transition-shadow border-t-4 border-t-primary">
            <CardHeader className="flex flex-col items-center pb-2">
              <Avatar className="w-32 h-32 mb-4 border-4 border-background shadow-md">
                {/* SUBIR FOTO: public/team/braulio.jpg */}
                <AvatarImage src="/team/braulio.jpg" alt="Braulio Rivera" />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">BR</AvatarFallback>
              </Avatar>
              <CardTitle className="text-xl font-bold">Braulio Rivera</CardTitle>
              <p className="text-sm font-semibold text-primary uppercase tracking-wide">Founder & Head of Operations</p>
              <p className="text-xs text-muted-foreground font-medium">La Estrategia y Visión Ágil</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-justify leading-relaxed">
                Con más de una década liderando transformaciones organizacionales en sectores críticos como la banca, retail y seguros, Braulio aporta la visión estratégica y la metodología Ágil al corazón de Biciregistro. Experto en construir ecosistemas de alto rendimiento y modelos de madurez operativa, su enfoque se centra en poner al usuario y al equipo en el centro de la ecuación. Braulio no solo dirige la operación; diseña la experiencia para que sea humana, eficiente y de alto impacto. Su liderazgo asegura que Biciregistro no sea solo una app, sino un movimiento organizado capaz de escalar y adaptarse a las necesidades reales de la comunidad ciclista.
              </p>
              <div className="pt-2">
                <Button variant="outline" size="sm" asChild className="gap-2 text-blue-700 hover:text-blue-800 hover:bg-blue-50">
                  <Link href="https://www.linkedin.com/in/braulio-rivera-b6504828/" target="_blank" rel="noopener noreferrer">
                    <Linkedin className="h-4 w-4" /> Conectar en LinkedIn
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Carlos Guevara */}
          <Card className="text-center hover:shadow-lg transition-shadow border-t-4 border-t-blue-500">
            <CardHeader className="flex flex-col items-center pb-2">
              <Avatar className="w-32 h-32 mb-4 border-4 border-background shadow-md">
                {/* SUBIR FOTO: public/team/carlos.jpg */}
                <AvatarImage src="/team/carlos.jpg" alt="Carlos Guevara" />
                <AvatarFallback className="text-2xl bg-blue-100 text-blue-600">CG</AvatarFallback>
              </Avatar>
              <CardTitle className="text-xl font-bold">Carlos Guevara</CardTitle>
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Co-Founder & Tech Leader</p>
              <p className="text-xs text-muted-foreground font-medium">El Arquitecto del Ecosistema</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-justify leading-relaxed">
                Carlos es el cerebro detrás de la infraestructura tecnológica de Biciregistro. Desarrollador Fullstack apasionado, se especializa en crear aplicaciones web inteligentes y escalables que resuelven problemas reales. Su experiencia abarca desde el desarrollo de productos SaaS complejos hasta la implementación de Inteligencia Artificial y APIs avanzadas. En Biciregistro, Carlos traduce nuestra visión de seguridad en código robusto, asegurando que cada registro, cada validación y cada dato esté protegido con los más altos estándares de la industria. Su filosofía es clara: la tecnología solo es valiosa si sirve a las personas.
              </p>
              <div className="pt-2">
                <Button variant="outline" size="sm" asChild className="gap-2 text-blue-700 hover:text-blue-800 hover:bg-blue-50">
                  <Link href="https://www.linkedin.com/in/dejitaru/" target="_blank" rel="noopener noreferrer">
                    <Linkedin className="h-4 w-4" /> Conectar en LinkedIn
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Erika López */}
          <Card className="text-center hover:shadow-lg transition-shadow border-t-4 border-t-purple-500">
            <CardHeader className="flex flex-col items-center pb-2">
              <Avatar className="w-32 h-32 mb-4 border-4 border-background shadow-md">
                {/* SUBIR FOTO: public/team/erika.jpg */}
                <AvatarImage src="/team/erika.jpg" alt="Erika López" />
                <AvatarFallback className="text-2xl bg-purple-100 text-purple-600">EL</AvatarFallback>
              </Avatar>
              <CardTitle className="text-xl font-bold">Erika López</CardTitle>
              <p className="text-sm font-semibold text-purple-600 uppercase tracking-wide">Co-Founder & Head of Finance</p>
              <p className="text-xs text-muted-foreground font-medium">El Pilar de Sostenibilidad</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-justify leading-relaxed">
                Erika aporta la solidez institucional al proyecto. Con 14 años de trayectoria gestionando portafolios de proyectos en telecomunicaciones, banca y desarrollo de software, Erika es experta en marcos de trabajo internacionales como PMI e ITIL. Su capacidad para gestionar equipos multidisciplinarios y negociar a nivel estratégico es vital para nuestra operación. Ella es la guardiana de la viabilidad financiera y administrativa de Biciregistro. Su visión asegura que nuestra estructura de negocio sea transparente, sostenible y esté lista para crecer, garantizando a nuestros aliados y usuarios que somos una empresa construida para durar.
              </p>
              <div className="pt-2">
                <Button variant="outline" size="sm" asChild className="gap-2 text-blue-700 hover:text-blue-800 hover:bg-blue-50">
                  <Link href="https://www.linkedin.com/in/erika-l%C3%B3pez-b3969075/" target="_blank" rel="noopener noreferrer">
                    <Linkedin className="h-4 w-4" /> Conectar en LinkedIn
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </section>
    </div>
  );
}
