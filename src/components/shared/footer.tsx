import Link from 'next/link';
import { Logo } from '@/components/icons/logo';

export function Footer() {
  return (
    <footer className="border-t">
      <div className="container flex flex-col items-center justify-between gap-4 py-10 px-8 md:h-24 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-2">
          <Logo />
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © {new Date().getFullYear()} Biciregistro. Todos los derechos reservados.
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap justify-center">
          <Link href="/about" className="hover:text-foreground transition-colors">Nosotros</Link>
          <Link href="/faqs" className="hover:text-foreground transition-colors">Preguntas Frecuentes</Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">Política de Privacidad</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Términos de Servicio</Link>
        </div>
      </div>
    </footer>
  );
}
