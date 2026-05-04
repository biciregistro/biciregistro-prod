'use client';

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, Target, Zap, DollarSign, Megaphone, CheckCircle2 } from "lucide-react";

interface MarketingReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: any; 
  filterContext: string;
  dashboardData: any; 
  date: string;
}

export function MarketingReportModal({
  isOpen,
  onClose,
  reportData,
  filterContext,
  dashboardData,
  date
}: MarketingReportModalProps) {
  if (!reportData) return null;

  const handlePrint = () => {
    window.print();
  };

  const SlideWrapper = ({ title, icon: Icon, children, className = "" }: any) => (
    <div className={`slide-page bg-white p-12 flex flex-col print:m-0 print:border-0 print:shadow-none ${className}`}>
      <div className="flex items-center justify-between mb-6 h-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-fuchsia-50 rounded-lg">
            <Icon className="h-4 w-4 text-fuchsia-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h2>
        </div>
        <div className="text-[8px] uppercase tracking-widest text-slate-400 font-black">BiciRegistro Comercial</div>
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
      <div className="mt-4 pt-4 flex justify-between items-end border-t border-slate-100 text-[8px] text-slate-400 font-medium h-8 shrink-0">
        <div>© {new Date().getFullYear()} BiciRegistro MX | Confidencial</div>
        <div className="text-right"><span>{date} | </span><span className="text-fuchsia-500 font-bold uppercase">{filterContext || 'Audiencia Global'}</span></div>
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
          <div className="flex items-center space-x-2"><Target className="h-5 w-5 text-fuchsia-600" /><DialogTitle className="font-bold text-slate-700">Reporte de Oportunidades</DialogTitle></div>
          <div className="flex items-center space-x-2">
            <Button variant="default" className="bg-fuchsia-600 hover:bg-fuchsia-700 font-bold" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" />Guardar PDF</Button>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-12 bg-slate-200/30 print:p-0 print:space-y-0 print:overflow-visible print:bg-white">
          
          {/* SLIDE 1: PORTADA */}
          <div className="slide-page bg-slate-900 flex flex-col justify-center items-center text-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-600/20 blur-[120px] rounded-full" />
            <div className="mb-10 z-10"><img src="/logo-report.png" alt="Logo" className="h-20 w-auto brightness-0 invert" /></div>
            <div className="max-w-4xl px-12 z-10">
                <h1 className="text-5xl font-black tracking-tighter mb-6 leading-tight text-white">{reportData.titulo}</h1>
                <div className="h-1.5 w-24 bg-fuchsia-500 mx-auto mb-8 rounded-full" />
                <p className="text-xl text-slate-400 font-medium mb-12 uppercase tracking-[0.25em]">Reporte de Oportunidades Comerciales</p>
                <div className="flex justify-center items-center gap-8 text-xs text-slate-500 font-bold uppercase tracking-widest border-t border-white/10 pt-8 mt-4">
                    <span>{date}</span><span className="w-1.5 h-1.5 bg-fuchsia-500 rounded-full" /><span>Marketing v1.0</span>
                </div>
            </div>
          </div>

          {/* SLIDE 2: PERFIL DE AUDIENCIA */}
          <SlideWrapper title="Perfil de Audiencia" icon={Target}>
             <div className="grid grid-cols-12 gap-12 items-center h-full">
                <div className="col-span-5 flex flex-col space-y-4">
                     <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center justify-center text-center h-[180px]">
                        <span className="text-4xl font-black text-slate-900">{dashboardData.generalStats?.totalUsers}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-2">Usuarios Activos en Segmento</span>
                     </div>
                     <div className="p-6 bg-fuchsia-50 rounded-3xl border border-fuchsia-100 flex flex-col items-center justify-center text-center h-[180px]">
                        <span className="text-4xl font-black text-fuchsia-600">{dashboardData.marketingPotential?.percentage?.toFixed(1)}%</span>
                        <span className="text-[10px] text-fuchsia-700 uppercase font-black tracking-widest mt-2">Audiencia Contactable (Push/Email)</span>
                     </div>
                </div>
                <div className="col-span-7 space-y-4">
                    <h4 className="text-fuchsia-600 font-black uppercase tracking-widest text-[9px]">Sprock Marketing Insights</h4>
                    <p className="text-xl leading-relaxed text-slate-700 font-light">{reportData.perfilAudiencia}</p>
                </div>
             </div>
          </SlideWrapper>

          {/* SLIDE 3: POTENCIAL COMERCIAL */}
          <SlideWrapper title="Potencial Comercial y Adquisitivo" icon={DollarSign}>
             <div className="grid grid-cols-12 gap-12 items-center h-full">
                <div className="col-span-7 space-y-4">
                    <h4 className="text-fuchsia-600 font-black uppercase tracking-widest text-[9px]">Sprock Marketing Insights</h4>
                    <p className="text-xl leading-relaxed text-slate-700 font-light">{reportData.potencialComercial}</p>
                </div>
                <div className="col-span-5 p-8 bg-slate-900 rounded-3xl border border-slate-800 flex flex-col justify-center shadow-xl relative overflow-hidden h-[300px]">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/20 blur-[50px] rounded-full" />
                    <p className="text-[10px] text-emerald-400 uppercase font-black tracking-widest mb-4 z-10">Valor Patrimonial Registrado (MXN)</p>
                    <p className="text-5xl font-black text-white z-10">
                      ${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(dashboardData.marketMetrics?.totalValue || 0)}
                    </p>
                    <div className="mt-8 pt-6 border-t border-slate-700 z-10 flex justify-between items-center">
                        <span className="text-slate-400 text-sm">Ticket Promedio Activo</span>
                        <span className="text-xl font-bold text-white">${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(dashboardData.marketMetrics?.averageValue || 0)}</span>
                    </div>
                </div>
             </div>
          </SlideWrapper>

          {/* SLIDE 4: MARCAS AFINES */}
          <SlideWrapper title="Marcas y Afinidad" icon={Zap}>
             <div className="max-w-4xl space-y-8">
                <h4 className="text-fuchsia-600 font-black uppercase tracking-widest text-[9px]">Sprock Marketing Insights</h4>
                <p className="text-xl leading-relaxed text-slate-700 font-light">{reportData.marcasAfines}</p>
                
                <div className="mt-8">
                    <h5 className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-4">Top 5 Marcas en este Segmento</h5>
                    <div className="flex gap-4">
                        {dashboardData.marketMetrics.topBrands.slice(0, 5).map((b: any, i: number) => (
                            <div key={i} className="flex-1 bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col items-center justify-center">
                                <span className="font-black text-slate-800 text-sm mb-1">{b.name}</span>
                                <span className="text-xs text-slate-500 font-medium">{b.count} bicis</span>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
          </SlideWrapper>

          {/* SLIDE 5: OPORTUNIDADES DE CAMPAÑA */}
          <SlideWrapper title="Estrategias de Campaña y Gamificación" icon={Megaphone}>
             <div className="max-w-4xl space-y-6">
                <h4 className="text-fuchsia-600 font-black uppercase tracking-widest text-[9px]">Sprock Marketing Insights</h4>
                <p className="text-2xl leading-relaxed text-slate-700 font-light italic border-l-4 border-fuchsia-500 pl-6">
                    "{reportData.oportunidadesCampana}"
                </p>
             </div>
          </SlideWrapper>

          {/* SLIDE 6: CONCLUSIONES COMERCIALES */}
          <SlideWrapper title="Accionables Comerciales" icon={CheckCircle2}>
             <div className="max-w-4xl space-y-6 mt-4">
                {reportData.conclusionesComerciales.map((point: string, i: number) => (
                    <div key={i} className="flex gap-6 items-start p-6 bg-slate-50 rounded-3xl border border-slate-100 shadow-sm transition-transform hover:scale-[1.01]">
                        <div className="h-10 w-10 rounded-xl bg-fuchsia-600 flex items-center justify-center flex-shrink-0 text-white font-black shadow-md">{i + 1}</div>
                        <p className="text-xl text-slate-800 font-medium leading-relaxed">{point}</p>
                    </div>
                ))}
             </div>
          </SlideWrapper>

        </div>
      </DialogContent>
    </Dialog>
  );
}