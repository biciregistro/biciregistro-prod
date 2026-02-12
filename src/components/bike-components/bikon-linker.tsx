'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { linkBikonToBike } from '@/lib/actions/bikon-actions';
import { Bike } from '@/lib/types';
import { Loader2, ShieldCheck, MapPin, ScanBarcode, Smartphone, Apple, CheckCircle2, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BikonLinkerProps {
  bike: Bike;
  userId: string;
}

type Step = 'input' | 'instructions';
type OS = 'android' | 'ios';

export function BikonLinker({ bike, userId }: BikonLinkerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>('input');
  const [os, setOs] = useState<OS>('android');
  const [serialNumber, setSerialNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Detectar OS al montar
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      setOs('ios');
    } else {
      setOs('android'); // Default a Android para otros también
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase();
    let rawValue = value.replace(/[^A-Z0-9]/g, '');

    if (rawValue.length > 13) {
      rawValue = rawValue.slice(0, 13);
    }

    let formattedValue = rawValue;
    if (rawValue.length > 2) {
      formattedValue = rawValue.slice(0, 2) + '-' + rawValue.slice(2);
    }
    if (rawValue.length > 8) {
      formattedValue = rawValue.slice(0, 2) + '-' + rawValue.slice(2, 8) + '-' + rawValue.slice(8);
    }

    setSerialNumber(formattedValue);
  };

  const handleLink = async () => {
    if (!serialNumber.trim() || serialNumber.length < 10) {
      toast({
        title: 'Código incompleto',
        description: 'El número de serie parece estar incompleto. Debe tener el formato BK-XXXXXX-XXXXX.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await linkBikonToBike(bike.id, userId, serialNumber.trim());
      
      if (result.success) {
        toast({
          title: '¡Código vinculado!',
          description: 'Ahora procede a conectar el dispositivo con tu teléfono.',
        });
        setStep('instructions'); // Cambiar a paso de instrucciones
      } else {
        toast({
          title: 'Error de vinculación',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Ocurrió un error inesperado al intentar vincular.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    setIsOpen(false);
    window.location.reload();
  };

  const openInstructions = () => {
    setStep('instructions');
    setIsOpen(true);
  };

  const openTracker = () => {
    if (os === 'ios') {
      window.location.href = 'findmy://items';
    } else {
      window.open('https://www.google.com/android/find', '_blank');
    }
  };

  // Contenido de Instrucciones
  const InstructionsContent = () => (
    <div className="space-y-4 py-2">
      <Tabs defaultValue={os} onValueChange={(val) => setOs(val as OS)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="android" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" /> Android
          </TabsTrigger>
          <TabsTrigger value="ios" className="flex items-center gap-2">
            <Apple className="h-4 w-4" /> iPhone (iOS)
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="android" className="mt-4 space-y-4 animate-in fade-in-50 slide-in-from-left-1 duration-300">
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-100 dark:border-slate-800">
            <ol className="list-decimal list-inside space-y-3 text-sm text-foreground">
              <li className="pl-1"><span className="font-medium">Enciende el dispositivo:</span> Escucharás un pitido de confirmación.</li>
              <li className="pl-1"><span className="font-medium">Emparejamiento:</span> Espera a que aparezca la ventana emergente en tu celular y sigue las instrucciones.</li>
              <li className="pl-1"><span className="font-medium">Instalación:</span> Adhiere el dispositivo de forma escondida en tu bicicleta. Utiliza cinta adhesiva fuerte o cinchos.</li>
            </ol>
          </div>
          <div className="text-xs text-muted-foreground text-center bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded text-yellow-800 dark:text-yellow-200">
            Asegúrate de tener el Bluetooth encendido.
          </div>
        </TabsContent>

        <TabsContent value="ios" className="mt-4 space-y-4 animate-in fade-in-50 slide-in-from-right-1 duration-300">
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-100 dark:border-slate-800">
            <ol className="list-decimal list-inside space-y-3 text-sm text-foreground">
              <li className="pl-1"><span className="font-medium">Abre "Buscar" (Find My):</span> Ve a la app oficial de Apple y pulsa el icono "+".</li>
              <li className="pl-1"><span className="font-medium">Añadir otro:</span> Pulsa "Añadir otro objeto" (Add Other Item).</li>
              <li className="pl-1"><span className="font-medium">Conexión:</span> Espera a que aparezca "OTAG" o "Bikon", pulsa conectar y sigue los pasos.</li>
              <li className="pl-1"><span className="font-medium">Instalación:</span> Adhiere el dispositivo de forma escondida en tu bicicleta.</li>
            </ol>
          </div>
          <div className="text-xs text-muted-foreground text-center bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded text-yellow-800 dark:text-yellow-200">
            Necesitas iOS 14.5 o superior.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  // ------------------------------------------------
  // ESTADO 1: DISPOSITIVO VINCULADO
  // ------------------------------------------------
  if (bike.bikonId) {
    return (
      <div className="w-full rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm">Protección Activa</span>
                <span className="text-xs text-muted-foreground font-mono">ID: {bike.bikonId}</span>
              </div>
            </div>
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          </div>

          <Button 
            onClick={openTracker}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
          >
            <MapPin className="mr-2 h-4 w-4" />
            Rastrear ubicación
          </Button>

          {/* Botón para ver instrucciones nuevamente */}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs text-muted-foreground hover:text-primary h-auto py-1"
                onClick={openInstructions}
              >
                <HelpCircle className="mr-1 h-3 w-3" />
                Ver instrucciones de instalación
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Instrucciones de Conexión
                </DialogTitle>
                <DialogDescription>
                  Sigue estos pasos para conectar tu Bikon con tu smartphone.
                </DialogDescription>
              </DialogHeader>
              <InstructionsContent />
              <DialogFooter>
                <Button onClick={() => setIsOpen(false)} className="w-full sm:w-auto">
                  Entendido
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <p className="text-[10px] text-center text-muted-foreground">
            Funciona con la red de Apple Find My™ y Google Find My Device™
          </p>
        </div>
      </div>
    );
  }

  // ------------------------------------------------
  // ESTADO 2: NO VINCULADO (Flujo Completo)
  // ------------------------------------------------
  return (
    <Dialog open={isOpen} onOpenChange={(val) => {
      // Si se cierra manualmente, reseteamos al paso 1
      if (!val) setTimeout(() => setStep('input'), 300);
      setIsOpen(val);
    }}>
      <DialogTrigger asChild>
        <div 
          className={cn(
            "w-full rounded-xl border-2 border-dashed border-muted-foreground/25 p-4",
            "hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer group"
          )}
        >
          <div className="flex items-center gap-4">
            <div className="bg-muted group-hover:bg-primary/10 p-3 rounded-full transition-colors">
              <ScanBarcode className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="flex flex-col flex-1">
              <span className="font-semibold text-sm group-hover:text-primary transition-colors">Vincular Bikon</span>
              <span className="text-xs text-muted-foreground">¿Tienes un rastreador? Vincúlalo aquí.</span>
            </div>
          </div>
        </div>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[450px]">
        {step === 'input' ? (
          <>
            <DialogHeader>
              <div className="mx-auto bg-primary/10 p-3 rounded-full mb-2 w-fit">
                <ScanBarcode className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-center">Vincular Bikon</DialogTitle>
              <DialogDescription className="text-center">
                Introduce el código que encontrarás en la etiqueta del dispositivo o en su caja.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <label htmlFor="serial" className="text-xs font-medium uppercase tracking-wider text-muted-foreground text-center block">
                  Número de Serie (ID)
                </label>
                <Input
                  id="serial"
                  placeholder="BK-159176-PLWJQ"
                  className="text-center font-mono text-lg uppercase tracking-widest h-14 border-2 focus-visible:ring-primary/20"
                  value={serialNumber}
                  onChange={handleInputChange}
                  maxLength={15}
                />
                 <p className="text-[10px] text-center text-muted-foreground">
                  El sistema agregará los guiones automáticamente.
                </p>
              </div>
              
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-xs text-blue-800 dark:text-blue-300 space-y-1">
                 <p className="font-medium flex items-center gap-1">
                   <ShieldCheck className="h-3 w-3" />
                   Información importante:
                 </p>
                 <p>Este paso vincula el número de serie a nuestra base de datos. En el siguiente paso te enseñaremos a conectarlo a tu celular.</p>
              </div>
            </div>
            
            <DialogFooter>
              <Button onClick={handleLink} disabled={loading || serialNumber.length < 12} className="w-full" size="lg">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Validar y Vincular'
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="mx-auto bg-green-100 p-3 rounded-full mb-2 w-fit">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <DialogTitle className="text-center">¡Número de Serie Vinculado!</DialogTitle>
              <DialogDescription className="text-center">
                Ahora conecta el dispositivo físico a tu teléfono siguiendo estos pasos.
              </DialogDescription>
            </DialogHeader>

            <InstructionsContent />

            <DialogFooter>
              <Button onClick={handleFinish} className="w-full bg-green-600 hover:bg-green-700 text-white" size="lg">
                He completado la vinculación
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
