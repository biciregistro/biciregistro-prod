'use client';

import { useEffect, useState, useMemo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Clock, Hourglass } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentTimerBannerProps {
    registrationDate: string;
}

export function PaymentTimerBanner({ registrationDate }: PaymentTimerBannerProps) {
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isClient, setIsClient] = useState(false);

    const deadline = useMemo(() => {
        const date = new Date(registrationDate);
        return date.getTime() + 12 * 60 * 60 * 1000; // +12 Horas
    }, [registrationDate]);

    useEffect(() => {
        setIsClient(true);
        const calculateTime = () => {
            const now = new Date().getTime();
            const diff = deadline - now;
            setTimeLeft(diff > 0 ? diff : 0);
        };

        calculateTime();
        const timer = setInterval(calculateTime, 1000);
        return () => clearInterval(timer);
    }, [deadline]);

    if (!isClient || timeLeft === null) return null;

    const isExpired = timeLeft === 0;

    const formatTime = (ms: number) => {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((ms % (1000 * 60)) / 1000);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <Alert className={cn(
            "mb-6 border-2 animate-in fade-in slide-in-from-top-4 duration-500",
            isExpired 
                ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900" 
                : "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900"
        )}>
            {isExpired ? (
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            ) : (
                <Hourglass className="h-5 w-5 text-amber-600 dark:text-amber-400 animate-pulse" />
            )}
            <AlertTitle className={cn(
                "font-bold text-base",
                isExpired ? "text-red-800 dark:text-red-300" : "text-amber-800 dark:text-amber-300"
            )}>
                {isExpired ? "Tu reserva ha expirado" : "Lugar reservado temporalmente"}
            </AlertTitle>
            <AlertDescription className={cn(
                "text-sm font-medium flex flex-col sm:flex-row sm:items-center gap-2 mt-1",
                isExpired ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"
            )}>
                <span className="flex-1">
                    {isExpired 
                        ? "Tu lugar ha sido liberado para otros participantes. Realiza tu pago lo antes posible para intentar asegurarlo." 
                        : "Completa tu pago para confirmar tu asistencia definitiva al evento."}
                </span>
                {!isExpired && (
                    <div className="flex items-center gap-1.5 bg-amber-200/50 dark:bg-amber-900/50 px-3 py-1 rounded border border-amber-300/50 w-fit">
                        <Clock className="h-4 w-4" />
                        <span className="font-mono text-xl font-black tracking-tight leading-none">
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                )}
            </AlertDescription>
        </Alert>
    );
}
