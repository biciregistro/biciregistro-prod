'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export function InstallPrompt() {
  const [mounted, setMounted] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // 1. Registrar Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    }

    // 2. Detectar si ya está instalada (Standalone mode)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                             (window.navigator as any).standalone || 
                             document.referrer.includes('android-app://');
    setIsStandalone(isStandaloneMode);

    // 3. Detectar dispositivo iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 4. Escuchar evento de instalación (Android/Chrome)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Solo mostrar si no está instalada ya
      if (!isStandaloneMode) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 5. Lógica para mostrar prompt en iOS (más simple: solo si no es standalone)
    if (isIosDevice && !isStandaloneMode) {
        // Podríamos mostrarlo basado en una cookie o sessionStorage para no ser intrusivos
        // Por ahora lo mostraremos tras unos segundos para no tapar el contenido inicial
        const timer = setTimeout(() => {
            setShowIOSPrompt(true);
        }, 3000);
        return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  // Prevenir Hydration Mismatch: No renderizar nada en el servidor
  if (!mounted) return null;

  // Si ya está en modo standalone, no mostrar nada
  if (isStandalone) return null;

  return (
    <>
      {/* Botón Flotante para Android/Chrome */}
      {showPrompt && (
        <div className="fixed bottom-4 left-4 z-50 md:bottom-8 md:left-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 bg-background border p-4 rounded-lg shadow-lg max-w-sm">
                <div className="flex-1">
                    <p className="font-semibold text-sm">Instalar App</p>
                    <p className="text-xs text-muted-foreground">Añade Biciregistro a tu pantalla principal para un acceso inmediato</p>
                </div>
                <div className="flex gap-2">
                     <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPrompt(false)}>
                        <X className="h-4 w-4" />
                        <span className="sr-only">Cerrar</span>
                    </Button>
                    <Button size="sm" onClick={handleInstallClick} className="gap-2">
                        <Download className="h-4 w-4" />
                        Instalar
                    </Button>
                </div>
            </div>
        </div>
      )}

      {/* Modal Educativo para iOS */}
      <Dialog open={showIOSPrompt} onOpenChange={setShowIOSPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Instalar Biciregistro</DialogTitle>
            <DialogDescription>
              Instala nuestra aplicación en tu iPhone para una mejor experiencia.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-center gap-4">
                <div className="bg-muted p-2 rounded-md">
                    <Share className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm">1. Toca el botón <strong>Compartir</strong> en la barra inferior de Safari.</p>
            </div>
            <div className="flex items-center gap-4">
                <div className="bg-muted p-2 rounded-md">
                    <PlusSquare className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm">2. Desliza hacia abajo y selecciona <strong>"Agregar al inicio"</strong>.</p>
            </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <DialogClose asChild>
              <Button type="button" variant="secondary" className="w-full">
                Entendido
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
