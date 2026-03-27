'use client';

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, FileText, Layout, Shield, TrendingUp, Users, CheckCircle2, Bike, MapPin } from "lucide-react";
import { GenerationsChart } from "./charts/generations-chart";
import { RecoveryRatePie } from "./charts/recovery-rate-pie";
import { BikeRangesChart } from "./charts/bike-ranges-chart";
import { GenderDistributionChart } from "./charts/gender-distribution-chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: any; 
  filterContext: string;
  dashboardData: any; 
  date: string;
}

export function ExecutiveReportModal({
  isOpen,
  onClose,
  reportData,
  filterContext,
  dashboardData,
  date
}: ExecutiveReportModalProps) {
  if (!reportData) return null;

  const handlePrint = () => {
    window.print();
  };

  // Preparación de datos para gráficas
  const genLabels: Record<string, string> = { 'gen_z': 'Gen Z', 'millennials': 'Millennials', 'gen_x': 'Gen X', 'boomers': 'Boomers' };
  const genData = Object.entries(dashboardData.userDemographics.generationsDistribution || {}).map(([id, value]) => ({ name: genLabels[id] || id, value: value as number }));
  const rangesData = Object.entries(dashboardData.marketMetrics.rangesDistribution || {}).map(([name, value]) => ({ name, value: value as number }));
  const recoveryData = { stolen: dashboardData.statusCounts.stolen, recovered: dashboardData.statusCounts.recovered, totalThefts: dashboardData.statusCounts.stolen + dashboardData.statusCounts.recovered };

  const SlideWrapper = ({ title, icon: Icon, children, className = "" }: any) => (
    <div className={`slide-page bg-white p-12 flex flex-col print:m-0 print:border-0 print:shadow-none ${className}`}>
      <div className="flex items-center justify-between mb-6 h-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-indigo-50 rounded-lg">
            <Icon className="h-4 w-4 text-indigo-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h2>
        </div>
        <div className="text-[8px] uppercase tracking-widest text-slate-400 font-black">BiciRegistro Executive Analytics</div>
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
      <div className="mt-4 pt-4 flex justify-between items-end border-t border-slate-100 text-[8px] text-slate-400 font-medium h-8 shrink-0">
        <div>© {new Date().getFullYear()} BiciRegistro MX | Confidencial</div>
        <div className="text-right"><span>{date} | </span><span className="text-indigo-500 font-bold uppercase">{filterContext || 'Panorama Global'}</span></div>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-[1200px] h-[95vh] flex flex-col p-0 overflow-hidden gap-0 bg-slate-200/50 border-none shadow-2xl print:bg-white print:max-w-none print:w-screen print:h-auto print:static print:transform-none print:block print:p-0">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: landscape; margin: 0; }
            body { background: white !important; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; }
            body > *:not([role="dialog"]), .print-hidden { display: none !important; }
            div[role="dialog"] { position: static !important; display: block !important; padding: 0 !important; border: 0 !important; background: white !important; }
            .slide-page { width: 100vw !important; height: 100vh !important; page-break-after: always !important; break-after: page !important; display: flex !important; flex-direction: column !important; margin: 0 !important; padding: 30px 50px !important; box-shadow: none !important; border: 0 !important; overflow: hidden !important; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
          .slide-page { aspect-ratio: 16 / 9; width: 100%; max-width: 1100px; margin: 0 auto; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; }
        `}} />

        <div className="flex items-center justify-between p-4 bg-white border-b shadow-sm z-10 print:hidden shrink-0">
          <div className="flex items-center space-x-2"><Layout className="h-5 w-5 text-indigo-600" /><DialogTitle className="font-bold text-slate-700">Reporte Estratégico</DialogTitle></div>
          <div className="flex items-center space-x-2">
            <Button variant="default" className="bg-indigo-600 hover:bg-indigo-700 font-bold" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" />Guardar PDF</Button>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-12 bg-slate-200/30 print:p-0 print:space-y-0 print:overflow-visible print:bg-white">
          
          {/* SLIDE 1: PORTADA */}
          <div className="slide-page bg-slate-900 flex flex-col justify-center items-center text-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 blur-[120px] rounded-full" />
            <div className="mb-10 z-10"><img src="/logo-report.png" alt="Logo" className="h-20 w-auto brightness-0 invert" /></div>
            <div className="max-w-4xl px-12 z-10">
                <h1 className="text-5xl font-black tracking-tighter mb-6 leading-tight text-white">{reportData.titulo}</h1>
                <div className="h-1.5 w-24 bg-indigo-500 mx-auto mb-8 rounded-full" />
                <p className="text-xl text-slate-400 font-medium mb-12 uppercase tracking-[0.25em]">Inteligencia Estratégica Aplicada</p>
                <div className="flex justify-center items-center gap-8 text-xs text-slate-500 font-bold uppercase tracking-widest border-t border-white/10 pt-8 mt-4">
                    <span>{date}</span><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /><span>Executive v3.4</span>
                </div>
            </div>
          </div>

          {/* SLIDE 2: INTRODUCCIÓN */}
          <SlideWrapper title="Introducción y Alcance" icon={FileText}>
            <div className="grid grid-cols-2 gap-12 items-start h-full">
                <div className="space-y-4">
                    <h4 className="text-indigo-600 font-black uppercase tracking-widest text-[9px]">Resumen Ejecutivo</h4>
                    <p className="text-xl text-slate-700 leading-tight font-light">{reportData.introduccion}</p>
                </div>
                <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 h-[220px] relative">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-4">Crecimiento (30 días)</p>
                        <ResponsiveContainer width="100%" height="70%"><AreaChart data={dashboardData.generalStats.dailyGrowth}><defs><linearGradient id="colorUsersSlide" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="date" hide /><YAxis hide /><Area type="monotone" dataKey="usersCount" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorUsersSlide)" /></AreaChart></ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3"><div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white"><Users className="h-4 w-4" /></div><div><p className="text-[8px] text-slate-400 uppercase font-black">Usuarios</p><p className="text-lg font-black text-slate-900">{dashboardData.generalStats?.totalUsers}</p></div></div>
                        <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3"><div className="h-8 w-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white"><Bike className="h-4 w-4" /></div><div><p className="text-[8px] text-slate-400 uppercase font-black">Bicicletas</p><p className="text-lg font-black text-slate-900">{dashboardData.generalStats?.totalBikes}</p></div></div>
                    </div>
                </div>
            </div>
          </SlideWrapper>

          {/* SLIDE 3 (NUEVO): DEMOGRAFÍA GENERAL */}
          <SlideWrapper title="Distribución Demográfica" icon={Users}>
             <div className="grid grid-cols-12 gap-12 items-center h-full">
                <div className="col-span-5 h-[300px] flex flex-col justify-center">
                    <GenderDistributionChart data={dashboardData.userDemographics.genderDistribution} />
                    <div className="mt-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex justify-between items-center">
                        <span className="text-[10px] font-black text-indigo-700 uppercase">Edad Promedio</span>
                        <span className="text-xl font-black text-indigo-900">{dashboardData.userDemographics.averageAge} años</span>
                    </div>
                </div>
                <div className="col-span-7 space-y-4">
                    <h4 className="text-indigo-600 font-black uppercase tracking-widest text-[9px]">Análisis de Sprock</h4>
                    <p className="text-lg leading-snug text-slate-700 font-light">{reportData.analisisDemografico}</p>
                    <div className="pt-4 grid grid-cols-2 gap-4">
                        {dashboardData.userDemographics.topLocations.slice(0, 2).map((loc: any, i: number) => (
                           <div key={i} className="flex items-center gap-2 text-slate-500 italic text-xs"><MapPin className="h-3 w-3" /> {loc.name}</div>
                        ))}
                    </div>
                </div>
             </div>
          </SlideWrapper>

          {/* SLIDE 4: PERFIL GENERACIONAL */}
          <SlideWrapper title="Perfiles Generacionales" icon={Users}>
             <div className="grid grid-cols-12 gap-12 items-center h-full">
                <div className="col-span-5 h-[320px]"><GenerationsChart data={genData} /></div>
                <div className="col-span-7 space-y-4">
                    <h4 className="text-indigo-600 font-black uppercase tracking-widest text-[9px]">Análisis de Sprock</h4>
                    <p className="text-lg leading-snug text-slate-700 font-light">{reportData.analisisGeneracional}</p>
                </div>
             </div>
          </SlideWrapper>

          {/* SLIDE 5: MERCADO */}
          <SlideWrapper title="Mercado y Valoración" icon={TrendingUp}>
             <div className="grid grid-cols-12 gap-12 items-center h-full">
                <div className="col-span-7 space-y-6">
                    <h4 className="text-indigo-600 font-black uppercase tracking-widest text-[9px]">Análisis de Sprock</h4>
                    <p className="text-lg leading-snug text-slate-700 font-light">{reportData.analisisMercado}</p>
                    <div className="flex flex-wrap gap-2 pt-2">
                        {dashboardData.marketMetrics.topBrands.slice(0, 5).map((b: any, i: number) => (
                            <span key={i} className="px-3 py-1 bg-slate-100 rounded text-slate-800 text-[10px] font-bold border border-slate-200">{b.name}</span>
                        ))}
                    </div>
                </div>
                <div className="col-span-5 h-[320px]"><BikeRangesChart data={rangesData} /></div>
             </div>
          </SlideWrapper>

          {/* SLIDE 6: SEGURIDAD */}
          <SlideWrapper title="Panorama de Seguridad" icon={Shield}>
            <div className="grid grid-cols-12 gap-12 items-center h-full">
                <div className="col-span-5 h-[240px] overflow-hidden flex flex-col justify-center"><RecoveryRatePie data={recoveryData} /></div>
                <div className="col-span-7 space-y-4">
                    <h4 className="text-indigo-600 font-black uppercase tracking-widest text-[9px]">Análisis de Sprock</h4>
                    <p className="text-lg leading-snug text-slate-700 font-light">{reportData.analisisSeguridad}</p>
                    <div className="mt-4 p-4 bg-red-50 rounded-2xl border border-red-100 w-full">
                        <p className="text-[9px] text-red-600 font-black uppercase tracking-widest mb-1">Zonas Críticas</p>
                        <p className="text-sm text-red-900 font-bold leading-tight">{dashboardData.topLocations.length > 0 ? dashboardData.topLocations.slice(0, 2).map((l: any) => l.name).join(', ') : "Sin alertas"}</p>
                    </div>
                </div>
            </div>
          </SlideWrapper>

          {/* SLIDE 7: CONCLUSIONES */}
          <SlideWrapper title="Conclusiones Estratégicas" icon={CheckCircle2}>
             <div className="max-w-4xl space-y-4 mt-2">
                {reportData.conclusiones.map((point: string, i: number) => (
                    <div key={i} className="flex gap-6 items-start p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 text-white font-black text-xs">{i + 1}</div>
                        <p className="text-lg text-slate-700 font-medium leading-snug">{point}</p>
                    </div>
                ))}
             </div>
          </SlideWrapper>

        </div>
      </DialogContent>
    </Dialog>
  );
}
