'use client';

import { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { User, Bike } from '@/lib/types';
import { completeOnboardingAction } from '@/lib/actions/onboarding-actions';
import { useGamificationToast } from '@/hooks/use-gamification-toast'; // GAMIFICACIÓN

interface OnboardingTourProps {
    user: User;
    tourType?: 'dashboard' | 'bike';
    bike?: Bike;
}

export function OnboardingTour({ user, tourType = 'dashboard', bike }: OnboardingTourProps) {
    const tourDriver = useRef<ReturnType<typeof driver> | null>(null);
    const tourStarted = useRef(false);
    const { showRewardToast } = useGamificationToast(); // Hook

    // Extract primitive values for dependencies
    const hasSeenDashboard = !!user.onboarding?.dashboardSeen;
    const hasSeenBike = !!user.onboarding?.bikeDetailSeen;
    
    const isTargetAudience = user.role === 'ciclista' || user.role === 'admin';
    const userName = user.name;
    const bikeName = bike ? `${bike.make} ${bike.model}` : '';

    useEffect(() => {
        if (!isTargetAudience) return;

        const alreadySeen = tourType === 'dashboard' ? hasSeenDashboard : hasSeenBike;
        if (alreadySeen) return;
        if (tourStarted.current) return;

        tourStarted.current = true;

        let steps: any[] = [];

        if (tourType === 'dashboard') {
            steps = [
                {
                    popover: {
                        title: `¡Hola, ${userName}! Bienvenido al Escuadrón. 🛡️`,
                        description: 'Estás a punto de darle a tu bici lo que el mercado negro más odia: Identidad y vínculo legal. Aquí tu pasión rueda con respaldo digital y una comunidad que te cuida.',
                        side: 'bottom',
                        align: 'center',
                    }
                },
                {
                    element: '#tour-profile',
                    popover: {
                        title: 'Tú eres el motor 👤',
                        description: 'Antes de cuidar la máquina, te cuidamos a ti. Completa tu perfil para ser el Dueño Oficial ante cualquier autoridad y para que el sistema sepa quién es el capitán de la ruta.',
                        side: 'bottom',
                        align: 'start',
                    }
                },
                {
                    element: '#tour-register-bike',
                    popover: {
                        title: 'Crea su ADN Digital 🧬',
                        description: 'Una bici con registro es una bici "tóxica" para el robo. Deja que Sprock nuestra IA te ayude con el número de serie y las fotos para que tu compañera deje de ser anónima y sea única e intocable.',
                        side: 'bottom',
                        align: 'start',
                    }
                },
                {
                    element: '#tour-qr',
                    popover: {
                        title: 'Tu ángel de la guarda en el casco 🚑',
                        description: 'Descarga tu etiqueta QR para Emergencias. Es anónima para extraños pero si llegas a tener un percance, los paramédicos sabrán tus datos vitales y a quien llamar.',
                        side: 'top',
                        align: 'start',
                    }
                },
                {
                    element: '#tour-referral',
                    popover: {
                        title: 'Rueda, invita y gana 🏆',
                        description: 'Nadie te regala nada por rodar... hasta ahora. Sube de nivel invitando a tus amigos a proteger sus bicis.',
                        side: 'top', 
                        align: 'center',
                    }
                },
                {
                    element: '#tour-garage',
                    popover: {
                        title: 'Tu Garage Digital 🚲',
                        description: 'Aquí viven tus máquinas protegidas. Desde aquí controlas su estatus, reportas incidentes o gestionas su mantenimiento.',
                        side: 'top',
                        align: 'start',
                    }
                }
            ];
        } else if (tourType === 'bike') {
            steps = [
                {
                    popover: {
                        title: `Expediente Digital: ${bikeName} 📂`,
                        description: 'Este es el panel de control de tu unidad. Aquí gestionas su estatus legal, protección financiera y trazabilidad.',
                        side: 'bottom',
                        align: 'center',
                    }
                },
                {
                    element: '#tour-bike-edit',
                    popover: { title: 'Actualización de ADN 🧬', description: 'Mantén las características de tu bici al día. Un registro preciso es clave para la identificación en caso de robo.', side: 'bottom', align: 'end' }
                },
                {
                    element: '#tour-bike-insurance',
                    popover: { title: 'Respaldo Financiero 🛡️', description: 'Protege tu inversión. Cotiza y gestiona un seguro especializado contra robo y accidentes directamente desde la plataforma.', side: 'top', align: 'start' }
                },
                {
                    element: '#tour-bike-bikon',
                    popover: { title: 'Rastreo Satelital Activo 📡', description: 'Vincula un dispositivo GPS Bikon para monitoreo en tiempo real. La recuperación comienza con la localización.', side: 'top', align: 'start' }
                },
                {
                    element: '#tour-bike-certificate',
                    popover: { title: 'Certificado de Legitimidad 📜', description: 'Tu documento oficial de registro. Descárgalo para acreditar tu propiedad ante autoridades o compradores, avalado por nuestro ecosistema.', side: 'top', align: 'start' }
                },
                {
                    element: '#tour-bike-ownership',
                    popover: { title: 'Trazabilidad Legal 📄', description: 'El eslabón más fuerte. Sube tu factura o ticket para blindar legalmente la propiedad y facilitar reclamos de seguro.', side: 'top', align: 'start' }
                },
                {
                    element: '#tour-bike-report',
                    popover: { title: 'Protocolo de Robo 🚨', description: 'Activa la alerta a la comunidad y genera una ficha de búsqueda instantánea. La velocidad de reporte es vital para la recuperación.', side: 'top', align: 'start' }
                },
                {
                    element: '#tour-bike-transfer',
                    popover: { title: 'Transferencia de Dominio 🔄', description: '¿Vendes tu bici? Realiza un traspaso digital seguro. Garantiza al comprador que adquiere un bien lícito y mantiene el historial del activo.', side: 'top', align: 'start' }
                }
            ];
        }

        const driverObj = driver({
            popoverClass: 'bikon-tour-popover',
            showProgress: true,
            animate: true,
            allowClose: true,
            doneBtnText: 'Terminar',
            nextBtnText: 'Siguiente',
            prevBtnText: 'Anterior',
            progressText: 'Paso {{current}} de {{total}}',
            steps: steps,
            onDestroyStarted: () => {
                if (!driverObj.isActive()) return;
                driverObj.destroy();
                completeOnboardingAction(tourType).then((res) => {
                    // GAMIFICACIÓN: Celebrar fin de tour
                    if (res?.success) {
                        showRewardToast(10, "¡Tour completado! Ya conoces las herramientas para blindar tu pasión.");
                    }
                });
            },
        });

        tourDriver.current = driverObj;

        const timer = setTimeout(() => {
            driverObj.drive();
        }, 1500);

        return () => {
            clearTimeout(timer);
            tourStarted.current = false;
            if (tourDriver.current) {
                tourDriver.current.destroy();
            }
        };
    }, [hasSeenDashboard, hasSeenBike, isTargetAudience, userName, bikeName, tourType, showRewardToast]);

    return (
        <style jsx global>{`
            .bikon-tour-popover .driver-popover-footer { display: flex !important; flex-direction: column !important; align-items: center !important; gap: 12px !important; margin-top: 15px !important; }
            .bikon-tour-popover .driver-popover-progress-text { width: 100% !important; text-align: right !important; font-size: 12px !important; color: #64748b !important; order: 1 !important; }
            .bikon-tour-popover .driver-popover-navigation-btns { display: flex !important; justify-content: flex-end !important; width: 100% !important; gap: 8px !important; order: 2 !important; }
            .bikon-tour-popover .driver-popover-btn { border-radius: 6px !important; padding: 8px 16px !important; font-size: 14px !important; cursor: pointer !important; transition: all 0.2s !important; }
            .bikon-tour-popover .driver-popover-next-btn, .bikon-tour-popover .driver-popover-done-btn { background-color: #0f172a !important; color: white !important; border: none !important; text-shadow: none !important; }
            .bikon-tour-popover .driver-popover-title { font-size: 18px !important; font-weight: 700 !important; margin-bottom: 8px !important; }
            .bikon-tour-popover .driver-popover-description { font-size: 14px !important; line-height: 1.5 !important; color: #334155 !important; }
        `}</style>
    );
}
