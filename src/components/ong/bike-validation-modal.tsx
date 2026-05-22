'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, AlertTriangle, ShieldCheck, Clock, MapPin, ExternalLink, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { validateBikeStatusAction, sendShopSightingAlertAction } from '@/lib/actions/ong-actions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function BikeValidationModal() {
  const [open, setOpen] = useState(false);
  const [serialNumber, setSerialNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendingAlert, setSendingAlert] = useState(false);
  const { toast } = useToast();

  const handleSearch = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!serialNumber.trim()) return;

      setLoading(true);
      setError(null);
      setResult(null);

      try {
          const res = await validateBikeStatusAction(serialNumber);
          
          if (res.success && res.bike) {
              setResult(res.bike);
          } else {
              setError(res.message || res.error || 'No se pudo consultar el registro.');
          }
      } catch (err: any) {
          console.error("Error validando bici:", err);
          setError("Ocurrió un error inesperado al consultar el servidor.");
      } finally {
          setLoading(false);
      }
  };

  const handleNotifyOwner = async () => {
      if (!result?.ownerId) return;
      
      setSendingAlert(true);
      try {
          const res = await sendShopSightingAlertAction(result.ownerId, result.make, result.model);
          
          if (res.success) {
              toast({ title: '¡Alerta Enviada!', description: 'El propietario ha sido notificado con los datos de tu tienda.', className: 'bg-green-600 text-white' });
              setOpen(false);
          } else {
              toast({ variant: 'destructive', title: 'Error al enviar alerta', description: res.error });
          }
      } catch (err: any) {
           console.error("Error notificando:", err);
           toast({ variant: 'destructive', title: 'Error', description: 'Error al comunicarse con el servidor.' });
      } finally {
          setSendingAlert(false);
      }
  };

  const resetState = (isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen) {
          setTimeout(() => {
              setSerialNumber('');
              setResult(null);
              setError(null);
              setLoading(false);
              setSendingAlert(false);
          }, 300);
      } else {
          setLoading(false);
          setSerialNumber('');
          setResult(null);
          setError(null);
      }
  };

  return (
    <Dialog open={open} onOpenChange={resetState}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="h-14 px-6 rounded-xl border border-primary/20 shadow-sm flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            <span className="font-bold">Validar Número de Serie</span>
          </div>
        </Button>
      </DialogTrigger>
      
      <DialogContent className={cn("sm:max-w-xl transition-all duration-500 max-h-[90vh] overflow-y-auto", result?.status === 'stolen' ? 'border-red-500 border-2 shadow-2xl shadow-red-500/20' : '')}>
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                    <Search className="h-6 w-6 text-primary" /> {result ? 'Detalles de Validación' : 'Búsqueda y Validación'}
                </DialogTitle>
                <DialogDescription className="text-base">
                    {result ? `Resultado para el serial: ${serialNumber}` : 'Ingresa el número de serie de la bicicleta que quieres validar.'}
                </DialogDescription>
            </div>
            {result && (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {setResult(null); setError(null); setSerialNumber('');}}
                    className="h-10 w-10 rounded-full hover:bg-slate-100 shrink-0"
                    title="Nueva búsqueda"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
            
            {/* INPUT SECTION - Solo mostrar si NO hay resultados */}
            {!result && (
                <form onSubmit={handleSearch} className="flex gap-2 animate-in fade-in slide-in-from-top-2">
                    <Input 
                        placeholder="Ingresa el Numero de serie de la bicicleta a consultar"
                        value={serialNumber}
                        onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                        className="h-12 text-lg font-mono uppercase"
                        autoFocus
                    />
                    <Button type="submit" className="h-12 px-8" disabled={loading || !serialNumber.trim()}>
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Buscar'}
                    </Button>
                </form>
            )}

            {/* ERROR SECTION */}
            {error && (
                <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl text-center animate-in fade-in zoom-in">
                    <ShieldCheck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-bold text-slate-700">{error}</p>
                    <p className="text-sm text-slate-500 mt-1">Puedes ofrecerle a tu cliente registrarla ahora mismo.</p>
                    <Button 
                        variant="link" 
                        onClick={() => {setError(null); setSerialNumber('');}} 
                        className="mt-2 text-primary font-bold"
                    >
                        Intentar con otro número
                    </Button>
                </div>
            )}

            {/* RESULT SECTION */}
            {result && (
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                    
                    {/* STOLEN SCENARIO */}
                    {result.status === 'stolen' ? (
                        <div className="space-y-4">
                            <div className="bg-red-600 text-white p-4 rounded-t-xl text-center relative">
                                {result.isExternal && (
                                    <Badge variant="outline" className="absolute top-2 right-2 border-white/50 bg-white/20 text-white text-[10px]">
                                        Reporte Internacional
                                    </Badge>
                                )}
                                <AlertTriangle className="h-12 w-12 mx-auto mb-2 animate-pulse" />
                                <h3 className="text-xl font-black uppercase tracking-widest">Alerta de Robo Activa</h3>
                                <p className="text-sm opacity-90 font-medium">Esta bicicleta fue reportada como robada por su dueño legítimo.</p>
                            </div>
                            
                            <Card className="border-red-200 bg-red-50 rounded-b-xl rounded-t-none border-t-0 shadow-inner">
                                <CardContent className="pt-6 space-y-4">
                                    <div className="flex justify-between items-start border-b border-red-200 pb-4">
                                        <div>
                                            <p className="text-xs font-bold text-red-800 uppercase">Vehículo</p>
                                            <p className="text-lg font-black text-red-950 leading-tight">{result.make} {result.model}</p>
                                            <p className="text-xs font-medium text-red-700 mt-0.5">Registrado a nombre de: <span className="font-bold uppercase">{result.ownerName || 'Usuario Registrado'}</span></p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-red-800 uppercase mb-1">Color</p>
                                            <p className="text-sm font-black text-red-900 uppercase">{result.color}</p>
                                        </div>
                                    </div>
                                    
                                    {result.theftReport && (
                                        <div className="space-y-3">
                                            <p className="text-xs font-bold text-red-800 uppercase flex items-center gap-1"><MapPin className="h-3 w-3"/> Detalles del Incidente</p>
                                            <div className="grid grid-cols-2 gap-2 text-sm text-red-900">
                                                <div><span className="font-bold">Fecha:</span> {result.theftReport.date ? new Date(result.theftReport.date).toLocaleDateString() : 'Desconocida'}</div>
                                                <div><span className="font-bold">Lugar:</span> {result.theftReport.city}, {result.theftReport.state}</div>
                                            </div>
                                            <div className="bg-white/50 p-3 rounded text-sm text-red-950 italic">
                                                "{result.theftReport.details}"
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-4 mt-4 border-t border-red-200 space-y-4">
                                        <div className="bg-red-100/50 p-4 rounded-lg border border-red-200 space-y-2">
                                            <p className="text-sm font-bold text-red-900 leading-snug">
                                                Recomendamos NO procesar la compra ni brindar servicio a esta unidad, para tu seguridad, coméntale a la persona:
                                            </p>
                                            <p className="text-sm font-black text-red-950 italic bg-white p-2 rounded border border-red-300">
                                                "El sistema arrojó una restricción en el número de serie. Por políticas de la empresa, no podemos darle atención."
                                            </p>
                                        </div>
                                        
                                        {result.isExternal ? (
                                            <Button 
                                                asChild
                                                className="w-full h-12 bg-slate-800 hover:bg-slate-900 text-white font-bold text-lg shadow-xl"
                                            >
                                                <Link href={result.biUrl || 'https://bikeindex.org'} target="_blank" rel="noopener noreferrer">
                                                    Ver Reporte Original en Bike Index <ExternalLink className="ml-2 h-4 w-4" />
                                                </Link>
                                            </Button>
                                        ) : (
                                            <Button 
                                                onClick={handleNotifyOwner} 
                                                disabled={sendingAlert}
                                                className="w-full h-12 bg-red-700 hover:bg-red-800 text-white font-bold text-lg shadow-xl"
                                            >
                                                {sendingAlert ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <AlertTriangle className="h-5 w-5 mr-2" />}
                                                Notificar Avistamiento al Dueño
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        /* SAFE / INVENTORY SCENARIO */
                        <div className="space-y-4">
                            <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-start gap-4">
                                <ShieldCheck className="h-10 w-10 text-green-600 shrink-0" />
                                <div>
                                    <h3 className="font-bold text-green-800 text-lg leading-tight">Bicicleta en Regla</h3>
                                    <p className="text-sm text-green-700">No existen reportes de robo activos para esta unidad.</p>
                                </div>
                                <Badge className="ml-auto bg-green-100 text-green-800 border-green-300">
                                    {result.status === 'inventory' ? 'En Inventario B2B' : 'Activa'}
                                </Badge>
                            </div>

                            <Card className="shadow-sm">
                                <CardContent className="pt-6">
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div><p className="text-xs text-muted-foreground uppercase font-bold">Marca</p><p className="font-semibold">{result.make}</p></div>
                                        <div><p className="text-xs text-muted-foreground uppercase font-bold">Modelo</p><p className="font-semibold">{result.model}</p></div>
                                        <div><p className="text-xs text-muted-foreground uppercase font-bold">Color</p><p className="font-semibold">{result.color}</p></div>
                                        <div><p className="text-xs text-muted-foreground uppercase font-bold">Modalidad</p><p className="font-semibold">{result.modality}</p></div>
                                    </div>

                                    <div className="space-y-3 border-t pt-4">
                                        <p className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1"><Clock className="h-3 w-3"/> Historial de Trazabilidad</p>
                                        <div className="relative pl-4 border-l-2 border-slate-200 space-y-4">
                                            {result.history.map((h: any, i: number) => (
                                                <div key={i} className="relative">
                                                    <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-slate-200 border-2 border-white"></div>
                                                    <p className="text-xs font-bold text-slate-500">{new Date(h.date).toLocaleDateString()}</p>
                                                    <p className="text-sm text-slate-700">{h.event}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
