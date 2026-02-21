import { Suspense } from 'react';
import { WidgetReportFlow } from '@/components/widget/widget-report-flow';
import { Loader2 } from 'lucide-react';
import { Metadata } from 'next';

// --- Open Graph Metadata Generation ---
export async function generateMetadata(): Promise<Metadata> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://biciregistro.mx';
    const imageUrl = `${baseUrl}/og-report-robo.png`;
    const canonicalUrl = `${baseUrl}/reportar-robo`;

    const title = '¡ALERTA DE ROBO! Reporta tu bicicleta inmediatamente | BiciRegistro';
    const description = 'Si te robaron tu bicicleta, repórtala aquí para activar la alerta en la comunidad de BiciRegistro y aumentar las posibilidades de recuperarla.';

    return {
        title: title,
        description: description,
        openGraph: {
            title: title,
            description: description,
            url: canonicalUrl,
            siteName: 'BiciRegistro',
            images: [
                {
                    url: imageUrl,
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
            title: title,
            description: description,
            images: [imageUrl],
        },
    };
}

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
