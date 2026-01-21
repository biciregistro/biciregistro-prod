import '../globals.css';
import { Toaster } from "@/components/ui/toaster";

export const metadata = {
  title: 'BiciRegistro Widget',
  description: 'Verificación y reporte de bicicletas',
};

export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* 
        Eliminamos <html> y <body> para evitar anidamiento ilegal con el RootLayout.
        Usamos un contenedor principal que simula las propiedades que queríamos en el body.
      */}
      <div className="bg-transparent min-h-screen flex flex-col items-center justify-center">
        <div className="w-full h-full min-h-[400px] bg-white rounded-lg shadow-sm border overflow-hidden relative">
            {children}
        </div>
        <Toaster />
      </div>
    </>
  );
}
