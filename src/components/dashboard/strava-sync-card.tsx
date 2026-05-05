'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getStravaAuthUrl, disconnectStrava } from '@/lib/actions/strava-actions';
import { useToast } from '@/hooks/use-toast';
import { Activity, RefreshCw, CheckCircle2, Link2Off } from 'lucide-react';
import { StravaConnectionData } from '@/lib/gamification/gamification-types';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface StravaSyncCardProps {
    onDisconnect?: () => void;
    stravaData?: StravaConnectionData;
    onSync?: () => Promise<{ success: boolean; message: string; kmsAdded?: number }>;
}

export function StravaSyncCard(props: StravaSyncCardProps) {
    const { stravaData, onSync } = props;
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

    const isConnected = !!stravaData;

    const handleConnect = async () => {
        setIsLoading(true);
        try {
            const url = await getStravaAuthUrl();
            window.location.href = url;
        } catch (error) {
            toast({
                title: "Error de conexión",
                description: "No se pudo iniciar la conexión con Strava.",
                variant: "destructive"
            });
            setIsLoading(false);
        }
    };

    const handleDisconnect = async () => {
        setIsLoading(true);
        setShowDisconnectDialog(false);
        try {
            const res = await disconnectStrava();
            if (res.success) {
                toast({ title: "Cuenta desconectada" });
                if (props.onDisconnect) props.onDisconnect();
                // Hacemos reload para limpiar el UI de forma rápida
                window.location.reload();
            } else {
                toast({ title: "Error", description: res.message, variant: "destructive" });
            }
        } catch (e) {
            toast({ title: "Error crítico", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };


    const handleSync = async () => {
        if (!onSync) return;
        setIsLoading(true);
        try {
            const result = await onSync();
            if (result.success) {
                toast({
                    title: "¡Sincronización Exitosa!",
                    description: result.message,
                });
            } else {
                toast({
                    title: "Aviso",
                    description: result.message,
                    variant: "default"
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Hubo un problema sincronizando tus rodadas.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isConnected) {
        return (
            <Card className="overflow-hidden border-orange-500/30 bg-gradient-to-br from-orange-50 to-white shadow-sm relative group">
                <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                            {/* Simple SVG icon resembling Strava logo style */}
                            <svg className="w-6 h-6 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                            </svg>
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                            <h3 className="font-bold text-slate-900 mb-1">Convierte tu sudor en Recompensas</h3>
                            <p className="text-sm text-slate-600 mb-4 max-w-sm">
                                Conecta tu cuenta de Strava para que tus rodadas reales se conviertan automáticamente en Kilómetros (KM) en tu wallet.
                            </p>
                            <Button 
                                onClick={handleConnect} 
                                disabled={isLoading}
                                className="w-full sm:w-auto bg-[#FC4C02] hover:bg-[#E34402] text-white font-bold"
                            >
                                {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
                                Conectar con Strava
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const lastSyncDate = new Date(stravaData.lastSyncDate);

    return (
        <>
            <Card className="overflow-hidden border-emerald-500/20 bg-slate-50 shadow-sm relative">
                <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1">
                                    Strava Conectado
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Última sincronización: {lastSyncDate.toLocaleDateString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <button onClick={() => setShowDisconnectDialog(true)} disabled={isLoading} className="text-[10px] text-slate-400 hover:text-red-500 mt-1 flex items-center gap-1 transition-colors">
                                    <Link2Off className="w-3 h-3" /> Desconectar cuenta
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="hidden sm:block text-right mr-2">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">KM Sincronizados</p>
                                <p className="font-mono font-bold text-slate-900">{stravaData.totalKmSynced.toFixed(0)}</p>
                            </div>
                            <Button 
                                onClick={handleSync} 
                                disabled={isLoading}
                                variant="outline"
                                className="w-full sm:w-auto border-orange-200 text-[#FC4C02] hover:bg-orange-50 hover:text-[#E34402] font-semibold"
                            >
                                {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                Sincronizar Rodadas
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Desconectar cuenta de Strava?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Al desvincular tu cuenta, dejarás de acumular Kilómetros automáticos por tus rodadas reales. Esta acción no afecta los KM que ya tienes en tu Wallet.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDisconnect} className="bg-red-600 hover:bg-red-700">
                            Sí, desconectar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}