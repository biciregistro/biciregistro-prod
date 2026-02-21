import type {Metadata} from 'next';
import { Toaster } from "@/components/ui/toaster"
import { FeedbackButton } from "@/components/shared/feedback-button";
import { InstallPrompt } from "@/components/shared/install-prompt";
import { GoogleAnalytics } from "@/components/shared/google-analytics";
import { ReferralTracker } from '@/components/shared/referral-tracker';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://biciregistro.mx'),
  title: 'Biciregistro - Registra y Protege Tu Bici',
  description: 'Biciregistro te ayuda a registrar tu bicicleta, reportarla como robada y buscar bicicletas para verificar su propiedad.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        
        {/* PWA Meta Tags */}
        <meta name="theme-color" content="#2563EB" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        {/* Next.js inyectará automáticamente el link al manifest generado por src/app/manifest.ts */}
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <ReferralTracker />
        {children}
        <InstallPrompt />
        <FeedbackButton />
        <Toaster />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
