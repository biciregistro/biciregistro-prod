'use client';

import { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { User, Bike } from '@/lib/types';
import { completeOnboardingAction } from '@/lib/actions/onboarding-actions';

interface OnboardingTourProps {
    user: User;
    tourType?: 'dashboard' | 'bike';
    bike?: Bike;
}

export function OnboardingTour({ user, tourType = 'dashboard', bike }: OnboardingTourProps) {
    const tourDriver = useRef<ReturnType<typeof driver> | null>(null);
    const tourStarted = useRef(false);

    // Extract primitive values for dependencies
    // Explicitly cast undefined/null to false to be safe
    const hasSeenDashboard = !!user.onboarding?.dashboardSeen;
    const hasSeenBike = !!user.onboarding?.bikeDetailSeen;
    
    // Allow 'admin' to see the tour for testing purposes, alongside 'ciclista'
    const isTargetAudience = user.role === 'ciclista' || user.role === 'admin';
    const userName = user.name;
    const bikeName = bike ? `${bike.make} ${bike.model}` : '';

    useEffect(() => {
        // Debug logs to trace execution
        console.log(`[OnboardingTour:${tourType}] Init check`, {
            role: user.role,
            isTargetAudience,
            hasSeenDashboard,
            hasSeenBike,
            tourStarted: tourStarted.current
        });

        // 0. Safety check: Only for target audience
        if (!isTargetAudience) {
            console.log(`[OnboardingTour:${tourType}] Skipped: User role not target audience.`);
            return;
        }

        // 1. Check if user has already seen the specific tour
        const alreadySeen = tourType === 'dashboard' ? hasSeenDashboard : hasSeenBike;
        
        if (alreadySeen) {
            console.log(`[OnboardingTour:${tourType}] Skipped: Already seen.`);
            return;
        }

        if (tourStarted.current) {
            console.log(`[OnboardingTour:${tourType}] Skipped: Tour already started in this session.`);
            return;
        }

        console.log(`[OnboardingTour:${tourType}] Starting tour logic...`);
        tourStarted.current = true;

        // 2. Define steps based on tourType
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
                        description: 'Descarga tu etiqueta QR para Emergencias. Es anónima para extraños pero si llegas a tener un percance, los paramédicos sabrán tus datos vitales y a quien llamar. ¡Imprímela en papel autoadherible y pégala en tu casco, te puede salvar la vida en tu siguiente rodada!',
                        side: 'top',
                        align: 'start',
                    }
                },
                {
                    element: '#tour-referral',
                    popover: {
                        title: 'Rueda, invita y gana 🏆',
                        description: 'Nadie te regala nada por rodar... hasta ahora. Sube de nivel invitando a tus amigos a proteger sus bicis. Entre más grande sea tu escuadrón, más premios y merch de nuestros aliados desbloqueas.',
                        side: 'top', 
                        align: 'center',
                    }
                },
                {
                    element: '#tour-garage',
                    popover: {
                        title: 'Tu Garage Digital 🚲',
                        description: 'Aquí viven tus máquinas protegidas. Desde aquí controlas su estatus, reportas incidentes o gestionas su mantenimiento. ¡Es tu colección, ahora bajo llave digital!',
                        side: 'top',
                        align: 'start',
                    }
                }
            ];
        } else if (tourType === 'bike') {
            steps = [
                {
                    popover: {
                        title: `¡Bienvenido al Centro de Mando de tu ${bikeName}! 🚲🛡️`,
                        description: 'Este es el lugar donde tu bici deja de ser solo un objeto y se convierte en una identidad protegida. Aquí tienes todas las herramientas para blindarla, rastrearla y asegurar que, pase lo que pase, siempre regrese a casa contigo.',
                        side: 'bottom',
                        align: 'center',
                    }
                },
                {
                    element: '#tour-bike-edit',
                    popover: {
                        title: 'Mantén su ADN al día',
                        description: 'Mantén el registro de tu bici impecable. Si le cambias componentes o tiene una nueva marca, regístralo aquí para que su ADN Digital esté siempre al 100%.',
                        side: 'bottom',
                        align: 'end',
                    }
                },
                {
                    element: '#tour-bike-bikon',
                    popover: {
                        title: 'Tu Radar Privado',
                        description: 'Activa el rastreo GPS con tecnología Find My. Privacidad total: La ubicación de tu bici es cifrada; solo tú puedes verla en tu mapa. Ni nosotros ni nadie más tiene acceso.',
                        side: 'top',
                        align: 'start',
                    }
                },
                {
                    element: '#tour-bike-qr',
                    popover: {
                        title: 'Mi etiqueta "Bici Tóxica"',
                        description: 'Descarga, imprime y pega tu QR. Este código le advierte a cualquiera: "Esta bici tiene dueño y su ADN es rastreable". Es el primer obstáculo que un ladrón no querrá saltar.',
                        side: 'top',
                        align: 'start',
                    }
                },
                {
                    element: '#tour-bike-certificate',
                    popover: {
                        title: 'Tu Título Inalterable',
                        description: '¿No tienes factura? No importa. Genera un certificado con validez legal respaldado por nuestra cadena inalterable. Es la prueba definitiva de que esta bicicleta te pertenece.',
                        side: 'top',
                        align: 'start',
                    }
                },
                {
                    element: '#tour-bike-ownership',
                    popover: {
                        title: 'Subir documento de propiedad',
                        description: 'Aqui puedes cargar la factura, carta de compra venta, nota o cualquier documento que avale que adquiriste tu bicicleta legalmente.',
                        side: 'top',
                        align: 'start',
                    }
                },
                {
                    element: '#tour-bike-report',
                    popover: {
                        title: '¡Reportar Robo!',
                        description: 'En caso de emergencia, activa esta alerta. Notificaremos instantáneamente a la comunidad en la zona y a las autoridades para cerrar el cerco y buscar tu bici de inmediato.',
                        side: 'top',
                        align: 'start',
                    }
                },
                {
                    element: '#tour-bike-transfer',
                    popover: {
                        title: 'Vender o Ceder Bicicleta',
                        description: '¿Vas a venderla? Transfiere el registro al nuevo dueño de forma segura. Así aseguras que la bici mantenga su legalidad y tú quedas libre de cualquier responsabilidad futura.',
                        side: 'top',
                        align: 'start',
                    }
                }
            ];
        }

        const driverObj = driver({
            popoverClass: 'bikon-tour-popover', // Custom class for styling
            showProgress: true,
            animate: true,
            allowClose: true,
            doneBtnText: tourType === 'dashboard' ? 'Terminar' : 'Entendido, finalizar tour',
            nextBtnText: 'Siguiente',
            prevBtnText: 'Anterior',
            progressText: 'Paso {{current}} de {{total}}',
            steps: steps,
            onDestroyStarted: () => {
                if (!driverObj.isActive()) return;
                driverObj.destroy();
                completeOnboardingAction(tourType);
            },
        });

        tourDriver.current = driverObj;

        // 4. Start the tour
        const timer = setTimeout(() => {
            console.log(`[OnboardingTour:${tourType}] Driving now.`);
            driverObj.drive();
        }, 1500);

        return () => {
            clearTimeout(timer);
            console.log(`[OnboardingTour:${tourType}] Cleanup.`);
            tourStarted.current = false; // Fix for Strict Mode double-invoke
            if (tourDriver.current) {
                tourDriver.current.destroy();
            }
        };
    }, [hasSeenDashboard, hasSeenBike, isTargetAudience, userName, bikeName, tourType]);

    // Inject custom styles for the tour popover
    return (
        <style jsx global>{`
            .bikon-tour-popover .driver-popover-footer {
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                gap: 12px !important;
                margin-top: 15px !important;
            }
            .bikon-tour-popover .driver-popover-progress-text {
                width: 100% !important;
                text-align: right !important;
                font-size: 12px !important;
                color: #64748b !important;
                order: 1 !important;
            }
            .bikon-tour-popover .driver-popover-navigation-btns {
                display: flex !important;
                justify-content: flex-end !important;
                width: 100% !important;
                gap: 8px !important;
                order: 2 !important;
            }
            /* Styling for better button appearance */
            .bikon-tour-popover .driver-popover-btn {
                border-radius: 6px !important;
                padding: 8px 16px !important;
                font-size: 14px !important;
                cursor: pointer !important;
                transition: all 0.2s !important;
            }
            .bikon-tour-popover .driver-popover-next-btn, 
            .bikon-tour-popover .driver-popover-done-btn {
                background-color: #0f172a !important; /* Slate-900 */
                color: white !important;
                border: none !important;
                text-shadow: none !important;
            }
            .bikon-tour-popover .driver-popover-next-btn:hover, 
            .bikon-tour-popover .driver-popover-done-btn:hover {
                background-color: #1e293b !important; /* Slate-800 */
            }
            .bikon-tour-popover .driver-popover-prev-btn {
                background-color: white !important;
                border: 1px solid #cbd5e1 !important;
                color: #475569 !important;
            }
            .bikon-tour-popover .driver-popover-prev-btn:hover {
                background-color: #f1f5f9 !important;
            }
            .bikon-tour-popover .driver-popover-title {
                font-size: 18px !important;
                font-weight: 700 !important;
                margin-bottom: 8px !important;
            }
            .bikon-tour-popover .driver-popover-description {
                font-size: 14px !important;
                line-height: 1.5 !important;
                color: #334155 !important;
            }
        `}</style>
    );
}
