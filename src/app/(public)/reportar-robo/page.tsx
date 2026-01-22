import { Suspense } from 'react';
import { WidgetReportFlow } from '@/components/widget/widget-report-flow';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Reportar Robo de Bicicleta | BiciRegistro',
  description: 'Reporta el robo de tu bicicleta inmediatamente para alertar a la comunidad.',
};

export default function ReportarRoboPage() {
  return (
    <div className="container max-w-lg mx-auto py-10 px-4 min-h-[80vh]">
      <div className="bg-white rounded-xl shadow-lg border p-1">
        <Suspense fallback={<div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>}>
            <WidgetReportFlow />
        </Suspense>
      </div>
    </div>
  );
}
