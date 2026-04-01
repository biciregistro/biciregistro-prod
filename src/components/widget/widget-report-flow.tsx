'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { ProfileForm } from '@/components/user-components';
import { SimpleBikeForm } from '@/components/widget/simple-bike-form';
import { TheftReportForm } from '@/components/bike-components/theft-report-form';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2, Bike, AlertTriangle, LogOut, ArrowRight, Sparkles, Download, Facebook, MessageCircle, Instagram } from 'lucide-react';
import { Bike as BikeType } from '@/lib/types';
import { Logo } from '@/components/icons/logo';
import { toast } from '@/hooks/use-toast';

function WidgetReportFlowContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialStep = searchParams.get('step') as 'auth' | 'register-bike' | 'report-theft' | 'success' | null;
    
    const [step, setStep] = useState<'auth' | 'register-bike' | 'report-theft' | 'success'>('auth');
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [registeredBike, setRegisteredBike] = useState<BikeType | null>(null);

    // Nuevos estados para el selector de bicicletas
    const [userBikes, setUserBikes] = useState<BikeType[]>([]);
    const [isLoadingBikes, setIsLoadingBikes] = useState(false);
    const [selectedExistingBikeId, setSelectedExistingBikeId] = useState<string>('');
    
    // Estado para obtener el reporte fresco y perfil real al final
    const [freshBikeData, setFreshBikeData] = useState<BikeType | null>(null);
    const [profileData, setProfileData] = useState<{name: string, lastName?: string} | null>(null);
    const [isPreparingShare, setIsPreparingShare] = useState(false);

    // Sincronizar paso inicial desde URL si existe
    useEffect(() => {
        if (initialStep) {
            setStep(initialStep);
        }
    }, [initialStep]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);
            if (firebaseUser && step === 'auth') setStep('register-bike');
            if (!firebaseUser && step !== 'auth') setStep('auth');
        });
        return () => unsubscribe();
    }, [step]);

    // Fetch de bicicletas del usuario al entrar al paso de registro
    useEffect(() => {
        if (step === 'register-bike' && user) {
            const fetchBikes = async () => {
                setIsLoadingBikes(true);
                try {
                    const res = await fetch('/api/user-bikes');
                    if (res.ok) setUserBikes(await res.json());
                } catch (error) {
                    console.error("Error fetching user bikes:", error);
                } finally {
                    setIsLoadingBikes(false);
                }
            };
            fetchBikes();
        }
    }, [step, user]);

    // Fetch del reporte fresco y perfil real al llegar a éxito
    useEffect(() => {
        if (step === 'success' && user && registeredBike) {
            const fetchFreshData = async () => {
                setIsPreparingShare(true);
                try {
                    const resBikes = await fetch('/api/user-bikes');
                    if (resBikes.ok) {
                        const bikes: BikeType[] = await resBikes.json();
                        const updatedBike = bikes.find(b => b.id === registeredBike.id);
                        if (updatedBike && updatedBike.theftReport) {
                            setFreshBikeData(updatedBike);
                        }
                    }
                    const resProfile = await fetch('/api/auth/session');
                    if (resProfile.ok) {
                        const session = await resProfile.json();
                        if (session?.user) {
                            setProfileData({
                                name: session.user.name || 'el propietario',
                                lastName: session.user.lastName || ''
                            });
                        }
                    }
                } catch (error) {
                    console.error("Error fetching fresh data for share:", error);
                } finally {
                    setIsPreparingShare(false);
                }
            };
            fetchFreshData();
        }
    }, [step, user, registeredBike]);


    const availableBikes = userBikes.filter(b => b.status !== 'stolen');

    const handleExistingBikeSelect = () => {
        if (!selectedExistingBikeId) return;
        const bike = availableBikes.find(b => b.id === selectedExistingBikeId);
        if (bike) {
            setRegisteredBike(bike);
            setStep('report-theft');
        }
    };

    const handleNewBikeRegistered = async () => {
        try {
            const res = await fetch('/api/user-bikes');
            if (!res.ok) throw new Error("Error fetching bikes");
            const bikes = await res.json();
            if (bikes && bikes.length > 0) {
                setRegisteredBike(bikes[0]);
                setStep('report-theft');
            }
        } catch (error) {
            console.error("Error recuperando la bici:", error);
        }
    };

    const handleSuccessRedirect = () => {
        let isNewUser = false;
        if (user?.metadata?.creationTime) {
            const creation = new Date(user.metadata.creationTime).getTime();
            if (Math.abs(Date.now() - creation) < 300000) isNewUser = true;
        }
        const targetUrl = isNewUser ? '/dashboard/profile' : '/dashboard';
        if (typeof window !== 'undefined') {
            if (window.opener) {
                try { window.opener.location.href = targetUrl; window.close(); } 
                catch (e) { router.push(targetUrl); }
            } else { router.push(targetUrl); }
        }
    };

    // --- Helpers de Compartir Refactorizados (Fieles a BikeTheftShareMenu) ---
    const getShareData = () => {
        const bikeToShare = freshBikeData || registeredBike;
        if (!bikeToShare || !bikeToShare.theftReport) return null;

        const report = bikeToShare.theftReport;
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_BASE_URL || 'https://biciregistro.mx');
        const bikeUrl = `${baseUrl}/bikes/${bikeToShare.serialNumber}?v=${new Date().getTime().toString().slice(0, 8)}`;
        
        const formattedReward = report.reward && report.reward !== '0'
            ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(report.reward)) : null;

        const socialProfile = report.contactProfile || '';
        const ownerName = profileData ? `${profileData.name} ${profileData.lastName || ''}`.trim() : 'el propietario';

        const shareText = `🚨 Alerta Bicicleta Robada en ${report.location} 🚨\n\nAtención su apoyo para localizar la siguiente bicicleta que se robaron en ${report.location}, ${report.city || ''}, ${report.country || ''}\n\n🚲 Marca: ${bikeToShare.make}, Modelo: ${bikeToShare.model}, Color: ${bikeToShare.color}, Numero de serie: ${bikeToShare.serialNumber}\n\n📄 Detalles del robo: ${report.details}\n\n🥷 Detalles del ladrón: ${report.thiefDetails || 'No especificados'}\n\n${formattedReward ? `💰 Se ofrece recompensa de: ${formattedReward}\n\n` : ''}Cualquier información que tengan les agradecería ponerse en contacto con: ${ownerName} por mensaje directo en el perfil de facebook o instagram ${socialProfile}\n\nLink de la bicicleta: ${bikeUrl}\n\n#Biciregistro #Ciclismo #Deporte #Amigos #MTB #Ruta #Trek #Giant #TotalBike #Sacalabici`;

        const params = new URLSearchParams({
            brand: bikeToShare.make,
            model: bikeToShare.model || '',
            status: 'stolen',
            image: bikeToShare.photos[0] || '',
        });
        if (report.reward) params.append('reward', report.reward.toString());
        if (report.location) params.append('location', report.location);
        
        const ogUrlRelative = `/api/og/bike?${params.toString()}`;
        return { shareText, bikeUrl, ogUrlRelative, serial: bikeToShare.serialNumber };
    };

    const handleDownloadImage = async () => {
        const data = getShareData();
        if (!data) return;

        toast({ title: "Generando imagen...", description: "Espera un momento por favor." });
        try {
            const response = await fetch(data.ogUrlRelative);
            if (!response.ok) throw new Error('Error al descargar OG');
            
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `ALERTA-ROBO-${data.serial}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
            toast({ title: "¡Imagen descargada!", description: "Revisa tu carpeta de descargas o galería." });
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo descargar la imagen." });
        }
    };

    const handleFacebookShare = () => {
        const data = getShareData();
        if (!data) return;
        navigator.clipboard.writeText(data.shareText);
        toast({ title: "Texto copiado al portapapeles", description: "Pega este mensaje en tu publicación de Facebook." });
        setTimeout(() => {
            const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(data.bikeUrl)}`;
            window.open(fbUrl, '_blank', 'width=600,height=400');
        }, 500);
    };

    const handleWhatsAppShare = () => {
        const data = getShareData();
        if (!data) return;
        navigator.clipboard.writeText(data.shareText);
        toast({ title: "Texto copiado al portapapeles", description: "Abre tu chat de WhatsApp y pega el mensaje." });
        setTimeout(() => {
            const url = `https://wa.me/?text=${encodeURIComponent(data.shareText)}`;
            window.open(url, '_blank');
        }, 500);
    };

    const handleInstagramShare = async () => {
        const data = getShareData();
        if (!data) return;
        navigator.clipboard.writeText(data.shareText);
        toast({ title: "Preparando Instagram...", description: "Texto copiado. Descargando imagen de alerta..." });

        try {
            const response = await fetch(data.ogUrlRelative);
            if (!response.ok) throw new Error('Error al descargar OG');
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `ALERTA-ROBO-${data.serial}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => {
                const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
                const isAndroid = /android/i.test(userAgent);
                const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;

                if (isAndroid) {
                    window.location.href = "intent://instagram.com/#Intent;package=com.instagram.android;scheme=https;end";
                } else if (isIOS) {
                    window.location.href = "instagram://app";
                    setTimeout(() => { if (document.hasFocus()) window.open("https://www.instagram.com/", '_blank'); }, 2000);
                } else {
                    window.open("https://www.instagram.com/", '_blank');
                }
                toast({ title: "¡Todo listo!", description: "Sube la foto y pega el texto en Instagram." });
            }, 1500);
        } catch (e) {
            toast({ variant: "destructive", title: "Error", description: "No pudimos descargar la imagen automáticamente. Abre Instagram y escribe manualmente." });
            window.open("https://www.instagram.com/", '_blank');
        }
    };


    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-6 text-center space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-gray-600 font-medium">Verificando sesión...</p>
            </div>
        );
    }

    // Paso 1: Autenticación
    if (step === 'auth' && !user) {
        return (
            <div className="p-4 max-w-md mx-auto">
                <div className="flex justify-center mb-4">
                    <Logo />
                </div>
                <div className="mb-6 text-center">
                    <h1 className="text-2xl font-bold text-primary tracking-tight">Reporte de Robo Express</h1>
                    <p className="text-sm text-gray-500 mt-1">Crea una cuenta o inicia sesión para activar la alerta.</p>
                </div>
                <ProfileForm callbackUrl={`${window.location.pathname}?step=register-bike`} />
            </div>
        );
    }

    // Paso 2: Registro de Bici (Si ya tiene sesión)
    if (step === 'register-bike') {
        return (
            <div className="p-4 max-w-md mx-auto">
                <div className="flex justify-between items-center mb-4">
                    <div className="text-xs text-gray-400 font-medium flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span className="truncate max-w-[120px]">{user?.email}</span>
                    </div>
                    <button 
                        onClick={() => signOut(auth)} 
                        className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                        title="Cerrar sesión"
                    >
                        <LogOut className="w-3 h-3" /> Salir
                    </button>
                </div>

                {isLoadingBikes ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-4">
                        <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                        <p className="text-sm text-gray-500 font-medium">Buscando tus bicicletas...</p>
                    </div>
                ) : (
                    <>
                        {availableBikes.length > 0 && (
                            <div className="mb-8 bg-blue-50/50 p-5 rounded-2xl border border-blue-100 shadow-sm">
                                <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                                    <Bike className="w-5 h-5 text-primary" /> Selecciona tu bicicleta
                                </h2>
                                <p className="text-sm text-slate-600 mb-4">
                                    Elige una de las bicicletas que ya tienes registradas para reportarla.
                                </p>
                                <div className="space-y-3">
                                    <Select onValueChange={setSelectedExistingBikeId} value={selectedExistingBikeId}>
                                        <SelectTrigger className="bg-white border-blue-200">
                                            <SelectValue placeholder="Tus bicicletas seguras..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableBikes.map(bike => (
                                                <SelectItem key={bike.id} value={bike.id}>
                                                    <span className="font-semibold">{bike.make} {bike.model}</span> 
                                                    <span className="text-muted-foreground ml-2 text-xs">({bike.color})</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button 
                                        className="w-full bg-primary hover:bg-primary/90 text-white shadow-sm"
                                        disabled={!selectedExistingBikeId}
                                        onClick={handleExistingBikeSelect}
                                    >
                                        Reportar esta bicicleta <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {availableBikes.length > 0 && (
                            <div className="relative flex py-6 items-center">
                                <div className="flex-grow border-t border-gray-200"></div>
                                <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase tracking-widest font-semibold">o registra una nueva</span>
                                <div className="flex-grow border-t border-gray-200"></div>
                            </div>
                        )}

                        {availableBikes.length === 0 && (
                            <div className="mb-6 text-center">
                                <h1 className="text-xl font-bold flex items-center justify-center gap-2 text-gray-800">
                                    <Bike className="text-primary w-6 h-6" /> Registrar Bicicleta
                                </h1>
                                <p className="text-sm text-gray-500 mt-1">Ingresa los datos de la bicicleta robada.</p>
                            </div>
                        )}
                        <SimpleBikeForm onSuccess={handleNewBikeRegistered} />
                    </>
                )}
            </div>
        );
    }

    // Paso 3: Detalles del Robo
    if (step === 'report-theft' && registeredBike) {
        return (
            <div className="p-4 max-w-md mx-auto">
                 <div className="mb-6 text-center">
                    <h1 className="text-xl font-bold flex items-center justify-center gap-2 text-red-600">
                        <AlertTriangle className="w-6 h-6" /> Detalles del Robo
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Reportando: <span className="font-semibold text-gray-800">{registeredBike.make} {registeredBike.model}</span>
                    </p>
                </div>
                <TheftReportForm 
                    bike={registeredBike} 
                    onSuccess={() => setStep('success')} 
                    defaultOpen={true}
                />
            </div>
        );
    }

    // Paso 4: Éxito con Acciones de Difusión Reales
    if (step === 'success') {
        const isNewUser = user?.metadata?.creationTime && (Math.abs(Date.now() - new Date(user.metadata.creationTime).getTime()) < 300000);

        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 md:p-8 text-center space-y-8 animate-in zoom-in-95 duration-700 max-w-md mx-auto">
                <div className="relative">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center shadow-inner">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                    <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-yellow-500 animate-pulse" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">¡Alerta Activada!</h1>
                    <p className="text-gray-600 text-sm md:text-base leading-relaxed max-w-xs mx-auto">
                        Tu reporte ha sido guardado. Los primeros minutos son cruciales, <strong className="text-gray-900">comparte la alerta en tus redes sociales ahora.</strong>
                    </p>
                </div>

                <div className="w-full space-y-3 relative">
                    {isPreparingShare && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-xl">
                            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                            <span className="text-sm font-bold text-gray-700">Preparando alerta...</span>
                        </div>
                    )}

                    <Button 
                        onClick={handleDownloadImage}
                        disabled={isPreparingShare || !freshBikeData}
                        className="w-full h-14 text-base font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20"
                    >
                        <Download className="w-5 h-5 mr-2" />
                        Descargar Imagen de Alerta
                    </Button>

                    <div className="grid grid-cols-1 gap-3">
                        <Button 
                            onClick={handleWhatsAppShare}
                            disabled={isPreparingShare || !freshBikeData}
                            className="w-full h-12 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold shadow-md"
                        >
                            <MessageCircle className="w-5 h-5 mr-2" />
                            Compartir en WhatsApp
                        </Button>
                        
                        <Button 
                            onClick={handleFacebookShare}
                            disabled={isPreparingShare || !freshBikeData}
                            className="w-full h-12 bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold shadow-md"
                        >
                            <Facebook className="w-5 h-5 mr-2" />
                            Compartir en Facebook
                        </Button>

                        <Button 
                            onClick={handleInstagramShare}
                            disabled={isPreparingShare || !freshBikeData}
                            className="w-full h-12 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F56040] hover:opacity-90 text-white font-bold shadow-md border-0"
                        >
                            <Instagram className="w-5 h-5 mr-2" />
                            Compartir en Instagram
                        </Button>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-100 w-full">
                    <p className="text-xs text-gray-500 mb-4 px-4">
                        {isNewUser 
                            ? "Es vital que completes tu información de contacto para que podamos avisarte si alguien la localiza."
                            : "¿Ya terminaste de compartir?"
                        }
                    </p>
                    <Button 
                        variant="outline" 
                        size="lg"
                        className="w-full h-12 text-gray-600 hover:text-gray-900 border-gray-300 font-bold bg-white"
                        onClick={handleSuccessRedirect}
                    >
                        {isNewUser ? "Completar mi perfil" : "Ir a mi Garaje"} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </div>
        );
    }

    return null;
}

export function WidgetReportFlow() {
    return (
        <Suspense fallback={<div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>}>
            <WidgetReportFlowContent />
        </Suspense>
    );
}
