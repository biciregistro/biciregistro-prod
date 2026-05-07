'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getStravaAuthUrl, disconnectStrava } from '@/lib/actions/strava-actions';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, CheckCircle2, Link2Off } from 'lucide-react';
import { StravaConnectionData } from '@/lib/gamification/gamification-types';
import Image from 'next/image';
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
                        {/* 1. Header Logo: BiciRegistro is the primary brand */}
                        <div className="w-12 h-12 bg-white border border-slate-100 rounded-full flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                            <Image src="/icon.png" alt="BiciRegistro" width={32} height={32} />
                        </div>
                        
                        <div className="flex-1 text-center sm:text-left">
                            <h3 className="font-bold text-slate-900 mb-1">Convierte tu sudor en Recompensas</h3>
                            <p className="text-sm text-slate-600 mb-5 max-w-sm leading-relaxed">
                                Conecta tu cuenta de Strava para que tus rodadas reales se conviertan automáticamente en <strong>B-coins</strong> en tu wallet.
                            </p>
                            
                            {/* 2. Official "Connect with Strava" Button Asset */}
                            <button 
                                onClick={handleConnect} 
                                disabled={isLoading}
                                className="transition-transform active:scale-95 disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2 px-6 py-2 bg-[#FC5200] text-white rounded-md font-bold text-sm">
                                        <RefreshCw className="h-4 w-4 animate-spin" /> Conectando...
                                    </div>
                                ) : (
                                    <Image 
                                        src="/strava/btn_strava_connect_with_orange.svg" 
                                        alt="Connect with Strava" 
                                        width={193} 
                                        height={48} 
                                        priority
                                    />
                                )}
                            </button>

                            {/* 3. Mandatory Attribution Badge - Sized down for better balance */}
                            <div className="mt-6 flex justify-center sm:justify-start">
                                <Image 
                                    src="/strava/api_logo_pwrdBy_strava_horiz_black.svg" 
                                    alt="Powered by Strava" 
                                    width={70} 
                                    height={12}
                                    className="opacity-60"
                                />
                            </div>
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
                                {/* Revocation link is mandatory and veracious */}
                                <button onClick={() => setShowDisconnectDialog(true)} disabled={isLoading} className="text-[10px] text-slate-400 hover:text-red-500 mt-1 flex items-center gap-1 transition-colors">
                                    <Link2Off className="w-3 h-3" /> Desconectar cuenta
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-center sm:items-end gap-3">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className="hidden sm:block text-right mr-2">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">KM Sincronizados</p>
                                    <p className="font-mono font-bold text-slate-900">{stravaData.totalKmSynced.toFixed(0)}</p>
                                </div>
                                <Button 
                                    onClick={handleSync} 
                                    disabled={isLoading}
                                    variant="outline"
                                    className="w-full sm:w-auto border-orange-200 text-[#FC5200] hover:bg-orange-50 hover:text-[#FC5200] font-semibold"
                                >
                                    {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                    Sincronizar Rodadas
                                </Button>
                            </div>
                            
                            {/* Mandatory Attribution Badge: Powerd by Strava (Consistent sizing) */}
                            <Image 
                                src="/strava/api_logo_pwrdBy_strava_horiz_black.svg" 
                                alt="Powered by Strava" 
                                width={60} 
                                height={10}
                                className="opacity-60"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Desconectar cuenta de Strava?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Al desvincular tu cuenta, dejarás de acumular B-coins automáticos por tus rodadas reales. Esta acción no afecta las B-coins que ya tienes en tu Wallet.
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
