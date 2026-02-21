import { Suspense } from 'react';
import { WidgetReportFlow } from '@/components/widget/widget-report-flow';
import { Loader2 } from 'lucide-react';
import { Metadata } from 'next';

// Asegurar URL base válida en tiempo de build/runtime
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
  ? new URL(process.env.NEXT_PUBLIC_BASE_URL) 
  : new URL('https://biciregistro.mx');

export const metadata: Metadata = {
  metadataBase: baseUrl, // Definición explícita aquí
  title: '¡ALERTA DE ROBO! Reporta tu bicicleta inmediatamente | BiciRegistro',
  description: 'Si te robaron tu bicicleta, repórtala aquí para activar la alerta en la comunidad de BiciRegistro y aumentar las posibilidades de recuperarla.',
  openGraph: {
    title: '¡ALERTA DE ROBO! Reporta tu bicicleta inmediatamente',
    description: 'Si te robaron tu bicicleta, repórtala aquí para activar la alerta en la comunidad de BiciRegistro y aumentar las posibilidades de recuperarla.',
    url: '/reportar-robo', // Relativo + metadataBase = Absoluto
    siteName: 'BiciRegistro',
    images: [
      {
        url: '/og-report-robo.png', // Relativo + metadataBase = Absoluto
        width: 1200,
        height: 630,
        alt: 'Reportar Robo de Bicicleta - Alerta a la comunidad',
      },
    ],
    locale: 'es_MX',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '¡ALERTA DE ROBO! Reporta tu bicicleta',
    description: 'Activa la alerta de robo en la comunidad de BiciRegistro.',
    images: ['/og-report-robo.png'], // Relativo + metadataBase = Absoluto
  },
};

export default function ReportarRoboPage() {
  return (
    <div className="container max-w-lg mx-auto py-10 px-4 min-h-[80vh]">
      <div className="bg-white rounded-xl shadow-lg border p-1">
        <Suspense fallback={<div className="flex justify-center items-center p-10 h-40"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>}>
            <WidgetReportFlow />
        </Suspense>
      </div>
    </div>
  );
}
