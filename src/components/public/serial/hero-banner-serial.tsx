import { Calendar, MapPin, Download } from 'lucide-react';
import type { Serial } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface HeroBannerSerialProps {
    serial: Serial;
    ongName?: string;
    ongLogo?: string;
    startDate?: string;
    endDate?: string;
}

export function HeroBannerSerial({ serial, ongName, ongLogo, startDate, endDate }: HeroBannerSerialProps) {
    
    const formatRange = () => {
        if (!startDate) return 'Fechas por definir';
        const start = new Date(startDate).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
        if (!endDate || startDate === endDate) return start;
        const end = new Date(endDate).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
        return `${start} - ${end}`;
    };

    return (
        <div className="relative w-full bg-slate-900 text-white overflow-hidden">
            {/* Background Image with Overlay */}
            {serial.heroImageUrl && (
                <>
                    <div 
                        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40" 
                        style={{ backgroundImage: `url(${serial.heroImageUrl})` }} 
                    />
                    <div className="absolute inset-0 z-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
                </>
            )}

            <div className="relative z-10 container mx-auto px-4 max-w-5xl py-16 md:py-24">
                <div className="flex flex-col md:flex-row gap-8 items-start md:items-end justify-between">
                    
                    {/* Left: Info */}
                    <div className="space-y-4 max-w-2xl">
                        <div className="flex items-center gap-3">
                            {ongLogo && (
                                <img src={ongLogo} alt={ongName} className="w-10 h-10 rounded-full border-2 border-white/20 object-cover" />
                            )}
                            <span className="text-sm font-semibold text-orange-400 uppercase tracking-wider">
                                {ongName || 'Organizador verificado'}
                            </span>
                        </div>
                        
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                            {serial.name}
                        </h1>
                        
                        <div className="flex flex-wrap items-center gap-4 text-slate-200 mt-4">
                            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full text-sm font-medium border border-white/10">
                                <MapPin className="w-4 h-4 text-orange-400" />
                                {serial.state}, {serial.country}
                            </div>
                            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full text-sm font-medium border border-white/10">
                                <Calendar className="w-4 h-4 text-orange-400" />
                                {formatRange()}
                            </div>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    {serial.guideUrl && (
                        <div className="w-full md:w-auto shrink-0">
                            <a href={serial.guideUrl} target="_blank" rel="noopener noreferrer" className="block w-full">
                                <Button size="lg" className="w-full bg-white text-slate-900 hover:bg-slate-100 shadow-xl">
                                    <Download className="w-4 h-4 mr-2" />
                                    Reglamento Oficial
                                </Button>
                            </a>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
