'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getStravaAuthUrl, disconnectStrava, joinStravaWaitlist } from '@/lib/actions/strava-actions';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, CheckCircle2, Link2Off, AlertCircle, Clock, MoreVertical, ExternalLink, HelpCircle } from 'lucide-react';
import { StravaConnectionData } from '@/lib/gamification/gamification-types';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StravaSyncCardProps {
    onDisconnect?: () => void;
    stravaData?: StravaConnectionData;
    onSync?: () => Promise<{ success: boolean; message: string; kmsAdded?: number }>;
}

export function StravaSyncCard(props: StravaSyncCardProps) {
    const { stravaData, onSync } = props;
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);

    const isConnected = !!stravaData;
    const isWaitlist = stravaData?.waitlistStatus === 'pending' || stravaData?.waitlistStatus === 'invited';

    const handleConnectClick = () => {
        // En lugar de redirigir directamente, mostramos el modal de privacidad (Compliance 2026)
        setShowPrivacyModal(true);
    };

    const confirmConnection = async () => {
        setIsLoading(true);
        setShowPrivacyModal(false);
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
                router.refresh(); // Replace window.location.reload()
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
    
    const handleJoinWaitlist = async () => {
        setIsLoading(true);
        try {
            const res = await joinStravaWaitlist();
            if (res.success) {
                toast({ title: "¡Lista VIP confirmada!", description: res.message });
                router.refresh(); // Replace window.location.reload()
            } else {
                toast({ title: "Error", description: res.message, variant: "destructive" });
            }
        } catch (e) {
             toast({ title: "Error crítico", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }

    if (!isConnected) {
        return (
            <>
            <Card className="overflow-hidden border-orange-500/30 bg-gradient-to-br from-orange-50 to-white shadow-sm relative group h-full flex flex-col justify-center">
                <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                        {/* 1. Header Logo: BiciRegistro is the primary brand */}
                        <div className="w-12 h-12 bg-white border border-slate-100 rounded-full flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                            <Image src="/icon.png" alt="BiciRegistro" width={32} height={32} />
                        </div>
                        
                        <div className="flex-1 text-center sm:text-left flex flex-col justify-center">
                            <h3 className="font-bold text-slate-900 mb-1">Convierte tu sudor en Recompensas</h3>
                            <p className="text-sm text-slate-600 mb-5 max-w-sm leading-relaxed">
                                Conecta tu cuenta de Strava para que tus rodadas reales se conviertan automáticamente en <strong>B-coins</strong> en tu wallet.
                            </p>
                            
                            {/* 2. Official "Connect with Strava" Button Asset */}
                            <button 
                                onClick={handleConnectClick} 
                                disabled={isLoading}
                                className="transition-transform active:scale-95 disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center gap-2 px-6 py-2 bg-[#FC5200] text-white rounded-md font-bold text-sm h-[48px] w-[193px] mx-auto sm:mx-0">
                                        <RefreshCw className="h-4 w-4 animate-spin" /> Conectando...
                                    </div>
                                ) : (
                                    <Image 
                                        src="/strava/btn_strava_connect_with_orange.svg" 
                                        alt="Connect with Strava" 
                                        width={193} 
                                        height={48} 
                                        priority
                                        className="mx-auto sm:mx-0"
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

            {/* Privacy Trust Modal (Compliance 2026 Section 2.1) */}
            <AlertDialog open={showPrivacyModal} onOpenChange={setShowPrivacyModal}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-[#FC5200]">
                            <AlertCircle className="h-5 w-5" /> Privacidad Ante Todo
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4 pt-2 text-sm text-slate-600">
                                <p>Antes de conectar, queremos ser 100% transparentes sobre tus datos:</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li><strong>¿Qué leemos?</strong> Solo la distancia total y tipo de deporte de tus rodadas recientes.</li>
                                    <li><strong>¿Para qué?</strong> Exclusivamente para convertirlos en B-coins en tu wallet.</li>
                                    <li><strong>Cero IA:</strong> Tus datos de Strava <strong>NUNCA</strong> serán usados para entrenar Inteligencia Artificial ni analítica comercial.</li>
                                    <li><strong>Control Total:</strong> Puedes desconectar en cualquier momento y recibirás un correo confirmando el borrado de tus datos locales.</li>
                                </ul>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4">
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmConnection} className="bg-[#FC5200] hover:bg-[#E34A00]">
                            Entendido, Conectar Strava
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            </>
        );
    }
    
    // ESTADO: EN LISTA DE ESPERA (Waitlist)
    if (isWaitlist) {
         return (
            <Card className="overflow-hidden border-blue-500/30 bg-gradient-to-br from-blue-50 to-white shadow-sm relative group h-full flex flex-col justify-center">
                <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                            <Clock className="w-6 h-6" />
                        </div>
                        
                        <div className="flex-1 text-center sm:text-left flex flex-col justify-center">
                            <h3 className="font-bold text-slate-900 mb-1">¡Estás en la Lista VIP! 🚀</h3>
                            <p className="text-sm text-slate-600 mb-4 max-w-sm leading-relaxed">
                                Debido al increíble éxito de la plataforma, hemos alcanzado el límite inicial de conexiones con Strava. 
                                Te notificaremos por correo en cuanto liberemos más cupos.
                            </p>
                            <div className="inline-flex items-center justify-center sm:justify-start gap-2 text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-100/50 px-3 py-1.5 rounded-full w-fit mx-auto sm:mx-0">
                                <CheckCircle2 className="w-4 h-4" /> Lugar Reservado
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
            <Card className="overflow-hidden border-emerald-500/20 bg-slate-50 shadow-sm relative h-full flex flex-col justify-center">
                <CardContent className="p-4 sm:p-5 relative">
                    {/* Menú Contextual de Soporte y Desconexión (Compliance 2026 Section 2.4) */}
                    <div className="absolute top-2 right-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Opciones de Conexión</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <a href="https://www.strava.com/dashboard" target="_blank" rel="noopener noreferrer" className="cursor-pointer flex items-center">
                                        <ExternalLink className="mr-2 h-4 w-4" /> Ir a mi Strava
                                    </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <a href="/faqs" className="cursor-pointer flex items-center">
                                        <HelpCircle className="mr-2 h-4 w-4" /> Soporte B-coins
                                    </a>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    onClick={() => setShowDisconnectDialog(true)}
                                    className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer flex items-center"
                                >
                                    <Link2Off className="mr-2 h-4 w-4" /> Desconectar cuenta
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Contenedor principal de la tarjeta. En móvil usa flex-col para apilar arriba (info) y abajo (métricas/botón). En sm usa flex-row para ponerlos lado a lado */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 h-full pt-4 sm:pt-0">
                        
                        {/* Bloque Izquierdo (Móvil: Arriba) - Icono y Estatus */}
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1">
                                    Strava Conectado
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Última sync: {lastSyncDate.toLocaleDateString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                        
                        {/* Bloque Derecho (Móvil: Abajo) - Métricas y Botón */}
                        <div className="flex flex-col w-full sm:w-auto items-end gap-3">
                            
                            {/* Cambio a Stack Vertical de Métricas y Botón en móvil, y alineación a la derecha */}
                            <div className="flex flex-col items-end w-full gap-3">
                                
                                {/* Bloque de doble métrica (Recorridos totales y última sync) */}
                                <div className="text-right w-full sm:w-auto flex flex-row sm:flex-col justify-between sm:justify-end items-end border-b sm:border-0 border-slate-200/60 pb-2 sm:pb-0">
                                    <div className="text-left sm:text-right">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">KM Recorridos</p>
                                        <p className="font-mono font-bold text-slate-900 leading-none">{stravaData.totalKmSynced.toFixed(0)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest">Sincronizados</p>
                                        <p className="font-mono font-bold text-emerald-600 leading-none">+{stravaData.lastSyncAddedKm?.toFixed(1) || '0.0'}</p>
                                    </div>
                                </div>

                                <Button 
                                    onClick={handleSync} 
                                    disabled={isLoading}
                                    variant="outline"
                                    className="w-full sm:w-auto border-orange-200 text-[#FC5200] hover:bg-orange-50 hover:text-[#FC5200] font-semibold h-[48px]"
                                >
                                    {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                    Sincronizar Rodadas
                                </Button>
                            </div>
                            
                            {/* Mandatory Attribution Badge: Powerd by Strava (Consistent sizing) */}
                            <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                                <Image 
                                    src="/strava/api_logo_pwrdBy_strava_horiz_black.svg" 
                                    alt="Powered by Strava" 
                                    width={60} 
                                    height={10}
                                    className="opacity-60"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Desconectar cuenta de Strava?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Al desvincular tu cuenta, dejaremos de registrar kilómetros nuevos. En cumplimiento con nuestra política de privacidad, revocaremos el acceso y te enviaremos un correo de confirmación. Tus B-coins actuales se mantienen a salvo.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDisconnect} className="bg-red-600 hover:bg-red-700">
                            Sí, desconectar y borrar datos
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
