import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell } from 'lucide-react';

interface PreviewPhoneProps {
    title: string;
    body: string;
    link?: string;
}

export function PreviewPhone({ title, body, link }: PreviewPhoneProps) {
    return (
        <div className="relative mx-auto border-gray-800 bg-gray-900 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-xl">
            <div className="w-[148px] h-[18px] bg-gray-800 top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute"></div>
            <div className="h-[32px] w-[3px] bg-gray-800 absolute -left-[17px] top-[72px] rounded-l-lg"></div>
            <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[124px] rounded-l-lg"></div>
            <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[178px] rounded-l-lg"></div>
            <div className="h-[64px] w-[3px] bg-gray-800 absolute -right-[17px] top-[142px] rounded-r-lg"></div>
            
            <div className="rounded-[2rem] overflow-hidden w-full h-full bg-slate-50 relative flex flex-col">
                {/* Mock Status Bar */}
                <div className="h-8 w-full bg-slate-900 text-white text-[10px] flex justify-between items-center px-6 pt-2">
                    <span>9:41</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-3 bg-white rounded-full opacity-20"></div>
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                </div>

                {/* Notification Area */}
                <div className="p-4 bg-slate-100 flex-1">
                    <div className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl shadow-sm border border-slate-200 mb-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-start gap-3">
                            <div className="h-10 w-10 bg-black rounded-xl flex items-center justify-center flex-shrink-0">
                                <img src="/icon.png" alt="App Icon" className="h-8 w-8 object-contain" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-0.5">
                                    <h4 className="text-sm font-semibold text-slate-900 truncate pr-2">
                                        {title || "Título de la notificación"}
                                    </h4>
                                    <span className="text-[10px] text-slate-400 whitespace-nowrap">Ahora</span>
                                </div>
                                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                                    {body || "El cuerpo del mensaje aparecerá aquí. Escribe algo atractivo para tus usuarios."}
                                </p>
                            </div>
                        </div>
                    </div>

                    {link && (
                        <div className="mt-4 flex justify-center">
                            <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-100">
                                🔗 Abre enlace externo
                            </Badge>
                        </div>
                    )}
                </div>

                {/* Mock Home Indicator */}
                <div className="h-1 w-1/3 bg-slate-900/20 mx-auto mb-2 rounded-full absolute bottom-2 left-1/3"></div>
            </div>
        </div>
    );
}
