'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { ProfileForm } from '@/components/user-components';
import { SimpleBikeForm } from '@/components/widget/simple-bike-form';
import { TheftReportForm } from '@/components/bike-components/theft-report-form';
import { Button } from '@/components/ui/button';
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
            
            // Si el usuario se loguea y estábamos en auth, avanzar
            if (firebaseUser) {
                if (step === 'auth') {
                     setStep('register-bike');
                }
            } else {
                // Si no hay usuario y no estamos en auth, volver a auth
                if (step !== 'auth') {
                    setStep('auth');
                }
            }
        });
        return () => unsubscribe();
    }, [step]);

    const handleBikeRegistered = async () => {
        try {
            // Obtener la bici más reciente del usuario
            const res = await fetch('/api/user-bikes');
            if (!res.ok) throw new Error("Error fetching bikes");
            
            const bikes = await res.json();
            if (bikes && bikes.length > 0) {
                // Asumimos que la primera es la más reciente por el sort del backend
                setRegisteredBike(bikes[0]);
                setStep('report-theft');
            }
        } catch (error) {
            console.error("Error recuperando la bici registrada:", error);
        }
    };

    const handleSuccessRedirect = () => {
        // Detectamos si es usuario nuevo: registrado hace menos de 5 minutos
        let isNewUser = false;
        if (user?.metadata?.creationTime) {
            const creation = new Date(user.metadata.creationTime).getTime();
            const now = Date.now();
            if (Math.abs(now - creation) < 300000) { // 5 minutos de margen
                isNewUser = true;
            }
        }

        const targetUrl = isNewUser ? '/dashboard/profile' : '/dashboard';

        if (typeof window !== 'undefined') {
            if (window.opener) {
                try {
                    window.opener.location.href = targetUrl;
                    window.close();
                } catch (e) {
                    router.push(targetUrl);
                }
            } else {
                router.push(targetUrl);
            }
        }
    };

    // --- Helpers para Compartir (Basados en BikeTheftShareMenu con fixes para Mobile) ---

    const getShareContent = () => {
        if (!registeredBike || !registeredBike.theftReport) return { text: '', url: '', ogUrl: '' };

        const report = registeredBike.theftReport;
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://biciregistro.mx');
        const bikeUrl = `${baseUrl}/bikes/${registeredBike.serialNumber}?v=${new Date().getTime().toString().slice(0, 8)}`;
        
        const formattedReward = report.reward && report.reward !== '0'
            ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(report.reward))
            : null;

        const socialProfile = report.contactProfile || '';
        const userName = user?.displayName || 'el dueño';

        const shareText = `🚨 Alerta Bicicleta Robada en ${report.location} 🚨\n\nAtención su apoyo para localizar la siguiente bicicleta que se robaron en ${report.location}, ${report.city || ''}, ${report.country || ''}\n\n🚲 Marca: ${registeredBike.make}, Modelo: ${registeredBike.model}, Color: ${registeredBike.color}, Numero de serie: ${registeredBike.serialNumber}\n\n📄 Detalles del robo: ${report.details}\n\n🥷 Detalles del ladrón: ${report.thiefDetails || 'No especificados'}\n\n${formattedReward ? `💰 Se ofrece recompensa de: ${formattedReward}\n\n` : ''}Cualquier información que tengan les agradecería ponerse en contacto con: ${userName} por mensaje directo en el perfil de facebook o instagram ${socialProfile}\n\nLink de la bicicleta: ${bikeUrl}\n\n#Biciregistro #Ciclismo #Deporte #Amigos #MTB #Ruta`;

        const params = new URLSearchParams({
            brand: registeredBike.make,
            model: registeredBike.model || '',
            status: 'stolen',
            image: registeredBike.photos[0] || '',
        });
        if (report.reward) params.append('reward', report.reward.toString());
        if (report.location) params.append('location', report.location);
        
        // Retornamos URL relativa asegurada para el fetch interno
        const ogUrl = `/api/og/bike?${params.toString()}`;

        return { text: shareText, url: bikeUrl, ogUrl };
    };

    const copyToClipboardWithFallback = async (text: string): Promise<boolean> => {
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (err) {
                console.warn('Clipboard API error:', err);
                return false;
            }
        } else {
            // Fallback (deprecated pero funciona en browsers viejos)
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                textArea.remove();
                return true;
            } catch (error) {
                console.error('Fallback clipboard failed', error);
                textArea.remove();
                return false;
            }
        }
    };

    const downloadImageSecurely = async (ogUrl: string, filename: string): Promise<boolean> => {
        try {
            // 1. Asegurar ruta absoluta usando origin para no fallar en móvil PWA/WebViews
            const absoluteUrl = ogUrl.startsWith('http') ? ogUrl : `${window.location.origin}${ogUrl}`;
            
            const response = await fetch(absoluteUrl);
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            // 2. Validar estricto Content-Type (Debe ser imagen, no HTML de error)
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.startsWith("image/")) {
                console.error("Content type is not an image:", contentType);
                throw new Error('El servidor no retornó una imagen válida.');
            }

            const blob = await response.blob();
            
            // 3. Crear Blob y descargar
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            
            // Limpieza
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);
            }, 100);

            return true;
        } catch (error) {
            console.error("Error en downloadImageSecurely:", error);
            return false;
        }
    };

    const handleDownloadImage = async () => {
        const { ogUrl } = getShareContent();
        if (!ogUrl) return;

        toast({
            title: "Generando imagen...",
            description: "Espera un momento por favor.",
        });

        const success = await downloadImageSecurely(ogUrl, `ALERTA-ROBO-${registeredBike?.serialNumber || 'BICI'}.png`);
        
        if (success) {
            toast({
                title: "¡Imagen descargada!",
                description: "Revisa tu galería o carpeta de descargas.",
            });
        } else {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Hubo un problema al generar la imagen. Intenta tomar captura de pantalla de tu Garaje.",
            });
        }
    };

    const handleFacebookShare = async () => {
        const { text, url } = getShareContent();
        
        const copied = await copyToClipboardWithFallback(text);
        if (copied) {
            toast({
                title: "Texto copiado al portapapeles",
                description: "Pégalo como descripción en tu publicación de Facebook.",
                duration: 5000,
            });
        }

        // Facebook Sharing: u = link a la web que tiene los OGs en el Head.
        // Quitamos width/height para que en móvil abra pestaña nativa.
        setTimeout(() => {
            const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
            // Detectamos si es móvil
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            window.open(fbUrl, '_blank', isMobile ? '' : 'width=600,height=400');
        }, 800);
    };

    const handleWhatsAppShare = async () => {
        const { text, url } = getShareContent();
        
        // WhatsApp prefiere texto y link
        const fullMessage = `${text}`;

        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        // Intento 1: Web Share API nativa (Ideal para iOS/Android modernos)
        if (navigator.share && isMobile) {
            try {
                await navigator.share({
                    title: '¡Ayúdame a encontrar mi bicicleta robada!',
                    text: fullMessage,
                    url: url
                });
                return; // Si funciona el share nativo, detenemos.
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.log("Web Share fallback:", err);
                } else {
                    return; // Usuario canceló.
                }
            }
        }

        // Intento 2: Copiado y Protocolo Directo
        const copied = await copyToClipboardWithFallback(fullMessage);
        if (copied) {
            toast({
                title: "Texto copiado al portapapeles",
                description: "Abre el chat de WhatsApp y pega el mensaje.",
                duration: 5000,
            });
        }

        setTimeout(() => {
            let waUrl = `https://wa.me/?text=${encodeURIComponent(fullMessage)}`;
            // En iOS/Android el protocolo nativo es más seguro para abrir la App.
            if (isMobile) {
                waUrl = `whatsapp://send?text=${encodeURIComponent(fullMessage)}`;
            }
            window.open(waUrl, '_blank');
        }, 800);
    };

    const handleInstagramShare = async () => {
        const { text, ogUrl } = getShareContent();
        
        const copied = await copyToClipboardWithFallback(text);
        
        toast({
            title: "Preparando Instagram...",
            description: "Texto copiado. Descargando imagen...",
            duration: 5000,
        });

        const success = await downloadImageSecurely(ogUrl, `ALERTA-ROBO-${registeredBike?.serialNumber || 'BICI'}.png`);
        
        if (!success) {
            toast({
                variant: "destructive",
                title: "Aviso",
                description: "La imagen no se descargó, pero puedes subir una foto tuya a Instagram.",
            });
        }

        // Lógica de Intents para Instagram
        setTimeout(() => {
            const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
            const isAndroid = /android/i.test(userAgent);
            const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;

            if (isAndroid) {
                // Forzar app Android
                window.location.href = "intent://instagram.com/#Intent;package=com.instagram.android;scheme=https;end";
            } else if (isIOS) {
                // Forzar app iOS
                window.location.href = "instagram://app";
                // Fallback a web
                setTimeout(() => {
                    if (document.hasFocus()) window.open("https://www.instagram.com/", '_blank');
                }, 2000);
            } else {
                window.open("https://www.instagram.com/", '_blank');
            }
            
            if (success) {
                toast({
                    title: "¡Todo listo!",
                    description: "Sube la imagen descargada a Instagram y pega el texto.",
                    duration: 5000,
                });
            }
        }, 1500);
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
                {/* Usamos ProfileForm con el callbackUrl correcto */}
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

                <div className="mb-6 text-center">
                    <h1 className="text-xl font-bold flex items-center justify-center gap-2 text-gray-800">
                        <Bike className="text-primary w-6 h-6" /> Registrar Bicicleta
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Ingresa los datos de la bicicleta robada.</p>
                </div>
                
                <SimpleBikeForm onSuccess={handleBikeRegistered} />
                
                <div className="mt-8 pt-4 border-t text-center">
                     <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold mb-2">¿Ya estaba registrada?</p>
                     <Button 
                        variant="outline" 
                        size="sm"
                        className="text-xs h-9"
                        onClick={handleBikeRegistered}
                    >
                        Usar mi última bicicleta registrada
                    </Button>
                </div>
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

    // Paso 4: Éxito con Acciones de Difusión Móviles
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

                <div className="w-full space-y-3">
                    <Button 
                        onClick={handleDownloadImage}
                        className="w-full h-14 text-base font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20"
                    >
                        <Download className="w-5 h-5 mr-2" />
                        Descargar Imagen de Alerta
                    </Button>

                    <div className="grid grid-cols-1 gap-3">
                        <Button 
                            onClick={handleWhatsAppShare}
                            className="w-full h-12 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold shadow-md"
                        >
                            <MessageCircle className="w-5 h-5 mr-2" />
                            Compartir en WhatsApp
                        </Button>
                        
                        <Button 
                            onClick={handleFacebookShare}
                            className="w-full h-12 bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold shadow-md"
                        >
                            <Facebook className="w-5 h-5 mr-2" />
                            Compartir en Facebook
                        </Button>

                        <Button 
                            onClick={handleInstagramShare}
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
