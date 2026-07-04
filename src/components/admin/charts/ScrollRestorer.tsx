'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function ScrollRestorer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const scrollPosition = sessionStorage.getItem('scrollPosition');
    if (scrollPosition) {
      // Usamos un micro-timeout para garantizar que Next.js haya completado el renderizado de la página
      const timer = setTimeout(() => {
        window.scrollTo(0, parseInt(scrollPosition, 10));
        sessionStorage.removeItem('scrollPosition');
      }, 0);
      
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]); // Se dispara en cada transición de ruta o cambio de filtros de búsqueda

  return null;
}
