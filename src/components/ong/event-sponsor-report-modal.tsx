'use client';

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, Layout, Sparkles, TrendingUp, Users, CheckCircle2, Bike, Award, PieChart, BarChart3, Briefcase, MapPin } from "lucide-react";
import { GenerationsChart } from "../admin/charts/generations-chart";
import { BikeRangesChart } from "../admin/charts/bike-ranges-chart";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList } from 'recharts';
import { BIKE_RANGES } from "@/lib/constants/bike-ranges";

interface EventSponsorReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: any; 
  eventAnalytics: any; 
  eventName: string;
  ongName?: string;
  ongLogo?: string;
  heroImage?: string; // Nuevo prop para imagen dinámica
}

export function EventSponsorReportModal({
  isOpen,
  onClose,
  reportData,
  eventAnalytics,
  eventName,
  ongName,
  ongLogo,
  heroImage
}: EventSponsorReportModalProps) {
  if (!reportData) return null;

  const handlePrint = () => {
    window.print();
  };

  // Data prep for charts
  const genLabels: Record<string, string> = { 'gen_z': 'Gen Z', 'millennials': 'Millennials', 'gen_x': 'Gen X', 'boomers': 'Boomers' };
  const genData = Object.entries(eventAnalytics.general.generationsDistribution || {}).map(([id, value]) => ({ 
      name: genLabels[id] || id, 
      value: value as number 
  }));

  const totalBikes = Object.values(eventAnalytics.market.rangesDistribution || {}).reduce((a: any, b: any) => a + b, 0) as number;

  const rangesDataFormatted = Object.entries(eventAnalytics.market.rangesDistribution || {}).map(([id, value]) => {
      const config = BIKE_RANGES[id];
      const percentage = totalBikes > 0 ? ((value as number / totalBikes) * 100).toFixed(1) : "0";
      return { 
          id,
          name: config?.shortLabel || id, 
          range: config?.priceRange.replace(/\$/g, '').replace(/,/g, '') || '',
          shortRange: config?.priceRange.replace(/\$/g, '').replace(/,000/g, 'k') || '',
          value: value as number,
          percentage: percentage,
          color: config?.color || '#cbd5e1'
      };
  });

  const brandsData = eventAnalytics.market.topBrands.slice(0, 8);
  
  // Gender stats calculation
  const totalGenders = eventAnalytics.general.genderDistribution.reduce((acc: number, curr: any) => acc + curr.value, 0);

  // Define background image or fallback
  const bgImageUrl = heroImage || "https://images.unsplash.com/photo-1664853811022-33e391e36169?auto=format&fit=crop&q=80&w=1080";

  const SlideWrapper = ({ title, icon: Icon, children, slideNumber }: any) => (
    <div className="slide-page bg-white p-12 flex flex-col print:m-0 print:border-0 print:shadow-none relative">
      <div className="flex items-center justify-between mb-8 h-12 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary/5 rounded-xl">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight font-montserrat">{title}</h2>
        </div>
        <div className="flex items-center gap-3">
            {ongLogo && <img src={ongLogo} alt="ONG" className="h-8 w-auto object-contain grayscale opacity-50" />}
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black font-montserrat">Insights Report 2025</div>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden font-inter text-slate-700">
          {children}
      </div>

      <div className="mt-6 pt-4 flex justify-between items-end border-t border-slate-100 text-[10px] text-slate-400 font-medium h-8 shrink-0">
        <div className="font-montserrat font-bold uppercase tracking-wider">© BiciRegistro Intelligence | Confidencial</div>
        <div className="flex items-center gap-4">
            <span className="text-primary/60 font-bold uppercase">{eventName}</span>
            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold">{slideNumber} / 6</span>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[100vw] w-screen h-screen flex flex-col p-0 overflow-hidden gap-0 bg-slate-100 border-none shadow-none z-50 print:bg-white print:max-w-none print:w-screen print:h-auto print:static print:transform-none print:block print:p-0">
        <style dangerouslySetInnerHTML={{ __html: `
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&family=Inter:wght@300;400;600&display=swap');
          
          .font-montserrat { font-family: 'Montserrat', sans-serif; }
          .font-inter { font-family: 'Inter', sans-serif; }

          @media print {
            @page { size: landscape; margin: 0; }
            body { background: white !important; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; }
            body > *:not([role="dialog"]), .print-hidden { display: none !important; }
            div[role="dialog"] { position: static !important; display: block !important; padding: 0 !important; border: 0 !important; background: white !important; }
            .slide-page { width: 100vw !important; height: 100vh !important; page-break-after: always !important; break-after: page !important; display: flex !important; flex-direction: column !important; margin: 0 !important; padding: 40px 60px !important; box-shadow: none !important; border: 0 !important; overflow: hidden !important; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
          .slide-page { aspect-ratio: 16 / 9; width: 100%; max-width: 1200px; margin: 0 auto; box-shadow: 0 20px 50px -10px rgba(0,0,0,0.1); border-radius: 4px; overflow: hidden; }
          .slide-text { font-size: 1.05rem; line-height: 1.6; }
        `}} />

        {/* Top UI Bar */}
        <div className="flex items-center justify-between p-4 bg-white border-b shadow-sm z-10 print:hidden shrink-0">
          <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-1.5 rounded-lg text-white"><Sparkles className="h-4 w-4" /></div>
              <DialogTitle className="font-bold text-slate-700 font-montserrat text-sm md:text-base">Reporte Estratégico para Patrocinadores</DialogTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="default" className="bg-slate-900 hover:bg-black font-bold font-montserrat text-xs" onClick={handlePrint}>
                <Printer className="h-3 w-3 mr-2" />Guardar PDF (Presentación)
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Slides Container */}
        <div className="flex-1 overflow-y-auto p-12 space-y-20 bg-slate-100 print:p-0 print:space-y-0 print:overflow-visible print:bg-white">
          
          {/* PORTADA CON IMAGEN DE FONDO DINÁMICA */}
          <div 
            className="slide-page bg-slate-950 flex flex-col justify-between items-center text-center text-white relative overflow-hidden pb-12 pt-16"
            style={{ 
                backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.85)), url('${bgImageUrl}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            }}
          >
             {/* Decoraciones de fondo (suavizadas para que no compitan con la imagen) */}
             <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2" />
             
             {/* Espaciador superior invisible para ayudar al centrado */}
             <div className="flex-1" />
             
             {/* Bloque Central de Contenido */}
             <div className="max-w-4xl px-12 z-10 flex flex-col items-center justify-center w-full">
                {/* ONG NAME PROMINENTE */}
                <h4 className="text-primary font-black uppercase tracking-[0.3em] text-3xl md:text-4xl mb-8 font-montserrat drop-shadow-lg">
                    {ongName || 'Reporte de Evento'}
                </h4>
                
                {/* TÍTULO DEL REPORTE */}
                <h1 className="text-6xl font-black tracking-tighter mb-10 leading-[1.1] text-white font-montserrat drop-shadow-xl">
                    {reportData.portada.titulo}
                </h1>
                
                {/* SEPARADOR */}
                <div className="h-1.5 w-32 bg-primary mx-auto mb-10 rounded-full" />
                
                {/* LOGO BICIREGISTRO */}
                <div className="mb-8">
                    <img src="/logo-report.png" alt="BiciRegistro" className="h-24 md:h-28 w-auto brightness-0 invert opacity-95 drop-shadow-lg" />
                </div>
             </div>

             {/* Espaciador inferior para centrado dinámico */}
             <div className="flex-1" />
             
             {/* FOOTER FECHA (Siempre anclado al fondo) */}
             <div className="flex justify-center items-center gap-10 text-[10px] text-slate-100/60 font-bold uppercase tracking-widest border-t border-white/10 pt-8 mt-auto font-montserrat w-full z-10">
                 <span className="flex items-center gap-2"><Layout className="w-3 h-3" /> Event Analytics v4.0</span>
                 <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                 <span>{reportData.portada.fecha}</span>
             </div>
          </div>

          {/* SLIDE 1: RESUMEN GENERAL */}
          <SlideWrapper title="Resumen General del Evento" icon={Layout} slideNumber={1}>
             <div className="grid grid-cols-12 gap-12 h-full items-center">
                 <div className="col-span-7 pr-8">
                    <p className="slide-text font-light text-slate-600 italic border-l-4 border-primary/30 pl-6 mb-8">
                        {reportData.slide1.resumenEjecutivo}
                    </p>
                    <div className="grid grid-cols-1 gap-6">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center gap-6">
                             <div className="h-12 w-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary"><Award className="w-6 h-6" /></div>
                             <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Impacto Estratégico</p>
                                <p className="text-lg font-bold text-slate-800">Evento capturado con ADN Digital verificado.</p>
                             </div>
                        </div>
                    </div>
                 </div>
                 <div className="col-span-5 space-y-4">
                    <div className="p-6 bg-slate-900 rounded-3xl text-white shadow-xl">
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-6">Impact Indicators</p>
                        <div className="space-y-8">
                            <div className="flex justify-between items-end border-b border-white/10 pb-4">
                                <span className="text-sm font-medium text-slate-400">Personas inscritas</span>
                                <span className="text-3xl font-black font-montserrat">{reportData.slide1.kpis.asistentes}</span>
                            </div>
                            <div className="flex justify-between items-end border-b border-white/10 pb-4">
                                <span className="text-sm font-medium text-slate-400">Gama promedio</span>
                                <span className="text-xl font-bold font-montserrat text-primary">{reportData.slide1.kpis.gamaPromedio}</span>
                            </div>
                            <div className="flex justify-between items-end">
                                <span className="text-sm font-medium text-slate-400">Valor de activos</span>
                                <span className="text-2xl font-black font-montserrat">{reportData.slide1.kpis.valorPatrimonial}</span>
                            </div>
                        </div>
                    </div>
                 </div>
             </div>
          </SlideWrapper>

          {/* SLIDE 2: PERFIL DEMOGRÁFICO Y GENERACIONAL (DISTRIBUCIÓN 1/2/1) */}
          <SlideWrapper title="Perfil Demográfico y Generacional" icon={Users} slideNumber={2}>
             <div className="grid grid-cols-12 gap-8 h-full items-center">
                 {/* 1/4 - Gráfico Generacional (col-3) */}
                 <div className="col-span-3 h-[380px] flex flex-col justify-center">
                    <div className="flex-1 min-h-0">
                        <GenerationsChart data={genData} />
                    </div>
                    <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-tighter mt-1 font-montserrat">Distribución Generacional</p>
                 </div>

                 {/* 2/4 - Texto IA (col-6) */}
                 <div className="col-span-6 px-4">
                    <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 relative h-full">
                        <div className="absolute top-0 right-0 p-4"><Sparkles className="w-5 h-5 text-primary/40" /></div>
                        <h4 className="text-primary font-black uppercase tracking-widest text-[10px] mb-4 font-montserrat">Análisis de Sprock</h4>
                        <p className="slide-text text-slate-700 font-normal">
                            {reportData.slide2.analisisDemografico}
                        </p>
                    </div>
                 </div>

                 {/* 1/4 - Indicador de Edad y Género (col-3) */}
                 <div className="col-span-3 flex flex-col gap-4">
                    <div className="bg-indigo-900 p-6 rounded-3xl text-white shadow-xl flex flex-col items-center justify-center text-center">
                        <div className="mb-4 bg-white/10 p-3 rounded-full">
                            <Users className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex flex-col mb-6">
                            <span className="text-[10px] font-black text-primary/80 uppercase tracking-widest">Edad Promedio</span>
                            <span className="text-4xl font-black font-montserrat">{eventAnalytics.general.averageAge} <span className="text-sm font-normal">años</span></span>
                        </div>
                        
                        <div className="w-full border-t border-white/10 pt-6 space-y-3">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Composición de Género</p>
                            {eventAnalytics.general.genderDistribution.map((g: any, i: number) => {
                                const percentage = totalGenders > 0 ? ((g.value / totalGenders) * 100).toFixed(0) : 0;
                                return (
                                    <div key={i} className="flex justify-between items-center text-xs font-bold">
                                        <span className="text-slate-300 uppercase tracking-tighter">{g.name}</span>
                                        <span className="text-primary font-black">{percentage}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                 </div>
             </div>
          </SlideWrapper>

          {/* SLIDE 3: PERFIL CICLISTA (DISTRIBUCIÓN 50/50) */}
          <SlideWrapper title="Perfil del Ciclista (Tier Analysis)" icon={TrendingUp} slideNumber={3}>
             <div className="grid grid-cols-12 gap-12 h-full items-center">
                 {/* 50% Texto */}
                 <div className="col-span-6 space-y-6">
                    <div className="bg-slate-900 p-10 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full" />
                        <h4 className="text-primary font-black uppercase tracking-widest text-[10px] mb-4 font-montserrat">Consumer Behavior Insights</h4>
                        <p className="slide-text text-slate-200 font-light leading-relaxed">
                            {reportData.slide3.perfilCiclista}
                        </p>
                    </div>
                 </div>
                 {/* 50% Gráfica Ancha */}
                 <div className="col-span-6 h-[400px]">
                    <div className="bg-white rounded-[32px] border p-8 shadow-sm h-full flex flex-col">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 font-montserrat text-center">Distribución de Gamas Tecnológicas</p>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={rangesDataFormatted}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} className="text-[10px] font-black text-slate-500 font-montserrat" />
                                <YAxis hide />
                                <Tooltip cursor={{fill: '#f8fafc'}} />
                                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={50}>
                                    {rangesDataFormatted.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                    <LabelList 
                                        dataKey="percentage" 
                                        position="insideTop" 
                                        formatter={(v: any) => `${v}%`} 
                                        className="text-[11px] font-black fill-white font-montserrat shadow-sm" 
                                        offset={15}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                 </div>
             </div>
          </SlideWrapper>

          {/* SLIDE 4: CUOTA DE MERCADO */}
          <SlideWrapper title="Cuota de Mercado (Top Brands)" icon={PieChart} slideNumber={4}>
             <div className="grid grid-cols-12 gap-12 h-full items-center">
                 <div className="col-span-6 pr-4">
                    <div className="bg-white rounded-2xl border p-4 shadow-sm h-[380px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={brandsData} layout="vertical" margin={{ left: 20, right: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} className="text-[10px] font-bold text-slate-500 font-montserrat" />
                                <Tooltip cursor={{fill: '#f8fafc'}} />
                                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={24}>
                                    <LabelList dataKey="value" position="right" className="text-[10px] font-bold fill-slate-400 font-montserrat" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                 </div>
                 <div className="col-span-6 space-y-6">
                    <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                        <h4 className="text-primary font-black uppercase tracking-widest text-[10px] mb-4 font-montserrat">Market Share Analysis</h4>
                        <p className="slide-text text-slate-700">
                            {reportData.slide4.cuotaMercado}
                        </p>
                        <div className="mt-8 flex flex-wrap gap-2">
                             {brandsData.slice(0, 5).map((b: any, i: number) => (
                                 <span key={i} className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-tighter shadow-sm">{b.name}</span>
                             ))}
                        </div>
                    </div>
                 </div>
             </div>
          </SlideWrapper>

          {/* SLIDE 5: VALUACIÓN INVENTARIO */}
          <SlideWrapper title="Valuación del Inventario (Activos)" icon={BarChart3} slideNumber={5}>
             <div className="flex flex-col h-full gap-8">
                 <div className="h-[220px] w-full bg-slate-50 rounded-3xl border p-6">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={rangesDataFormatted} margin={{ top: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="shortRange" axisLine={false} tickLine={false} className="text-[10px] font-bold text-slate-400 font-montserrat" />
                            <YAxis hide />
                            <Tooltip cursor={{fill: '#f1f5f9'}} />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={60}>
                                {rangesDataFormatted.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                                <LabelList dataKey="value" position="insideTop" className="text-xs font-black fill-white font-montserrat" offset={10} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="flex-1 bg-indigo-900 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden flex flex-col justify-center items-center text-center">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full" />
                    <p className="text-[15.5px] font-light leading-relaxed max-w-4xl font-inter">
                        {reportData.slide5.valuacionInventario}
                    </p>
                 </div>
             </div>
          </SlideWrapper>

          {/* SLIDE 6: RECOMENDACIONES */}
          <SlideWrapper title="Recomendaciones Estratégicas" icon={Briefcase} slideNumber={6}>
             <div className="grid grid-cols-2 gap-8 mt-2 h-full items-start">
                 {reportData.slide6.recomendaciones.map((point: string, i: number) => (
                    <div key={i} className="flex gap-6 items-start p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-primary/20 transition-colors group">
                        <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 text-primary font-black text-sm group-hover:bg-primary group-hover:text-white transition-all font-montserrat">{i + 1}</div>
                        <p className="text-[14px] text-slate-700 font-semibold leading-snug font-inter pt-1">{point}</p>
                    </div>
                ))}
             </div>
          </SlideWrapper>

        </div>
      </DialogContent>
    </Dialog>
  );
}
