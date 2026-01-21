'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ShieldAlert, ShieldCheck, Loader2, ExternalLink, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function WidgetSearch() {
  const [serial, setSerial] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ status: 'idle' | 'safe' | 'stolen', data?: any }>({ status: 'idle' });
  const { toast } = useToast();

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!serial || serial.length < 3) return;

    setLoading(true);
    setResult({ status: 'idle' });
    
    try {
      const response = await fetch('/api/check-serial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serialNumber: serial })
      });
      const data = await response.json();

      if (data.isUnique) {
        setResult({ status: 'safe' });
      } else {
        const infoRes = await fetch(`/api/bike-public-info?serial=${serial}`);
        const info = await infoRes.json();
        
        if (info.status === 'stolen') {
            setResult({ status: 'stolen', data: info });
        } else {
            // Existe pero no está robada (o está recuperada/safe)
            setResult({ status: 'safe' });
        }
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo consultar el número de serie." });
    } finally {
      setLoading(false);
    }
  };

  const handleReportClick = () => {
    const width = 500;
    const height = 700;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    
    window.open(
      '/widget/popup',
      'ReportarBicicleta',
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
    );
  };

  return (
    <div className="flex flex-col h-full p-6 space-y-6 bg-white">
      {/* Sección Reporte */}
      <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-center space-y-4 shadow-sm">
        <div className="mx-auto bg-red-100 w-12 h-12 rounded-full flex items-center justify-center">
            <AlertTriangle className="text-red-600 w-6 h-6" />
        </div>
        <div>
            <h2 className="text-lg font-bold text-gray-900">
            ¿Te robaron tu bicicleta?
            </h2>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">
            Regístrala ahora para alertar a la comunidad y aumentar tus posibilidades de recuperarla.
            </p>
        </div>
        <Button onClick={handleReportClick} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-11 shadow-md transition-all hover:scale-[1.02]">
           REPORTAR ROBO AHORA
        </Button>
      </div>

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-gray-100"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-2 text-gray-400 font-medium uppercase tracking-wider">Buscar bicicleta por numero de serie</span>
        </div>
      </div>

      {/* Sección Búsqueda */}
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="flex gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                    placeholder="Número de Serie..." 
                    className="pl-10 h-11 border-gray-200 bg-gray-50 focus:bg-white transition-colors"
                    value={serial}
                    onChange={(e) => setSerial(e.target.value.toUpperCase())}
                />
            </div>
            <Button type="submit" disabled={loading || !serial} size="icon" className="h-11 w-11 shrink-0 bg-gray-900 hover:bg-black">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
        </div>

        {/* Resultados */}
        {result.status === 'safe' && (
            <div className="animate-in fade-in slide-in-from-top-2 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 shadow-sm">
                <div className="bg-green-100 p-2 rounded-full shrink-0">
                    <ShieldCheck className="w-5 h-5 text-green-700" />
                </div>
                <div>
                    <p className="font-bold text-green-800 text-sm">Sin reportes de robo</p>
                    <p className="text-xs text-green-700 mt-0.5">Este número de serie no aparece en nuestra base de datos de bicicletas robadas.</p>
                </div>
            </div>
        )}

        {result.status === 'stolen' && (
            <div className="animate-in fade-in slide-in-from-top-2 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 shadow-sm">
                <div className="bg-red-100 p-2 rounded-full shrink-0">
                    <ShieldAlert className="w-5 h-5 text-red-700" />
                </div>
                <div className="flex-1">
                    <p className="font-bold text-red-800 uppercase tracking-tight text-sm">¡ALERTA: ROBADA!</p>
                    <p className="text-xs text-red-700 font-medium mt-1">
                        {result.data?.brand} {result.data?.model} ({result.data?.color})
                    </p>
                    {result.data?.date && <p className="text-[10px] text-red-600 mt-1">Fecha: {result.data.date}</p>}
                    
                    <Button 
                        variant="link" 
                        size="sm" 
                        className="h-auto p-0 text-xs text-red-800 font-bold underline flex items-center gap-1 mt-2"
                        onClick={() => window.open(`/bikes/${serial}`, '_blank')}
                        type="button"
                    >
                        Ver reporte completo <ExternalLink className="w-3 h-3" />
                    </Button>
                </div>
            </div>
        )}
      </form>
      
      <div className="mt-auto pt-4 flex justify-center">
        <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
            Respaldo de <span className="font-bold text-gray-600">BiciRegistro.mx</span>
        </p>
      </div>
    </div>
  );
}
