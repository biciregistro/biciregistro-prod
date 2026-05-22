'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, UploadCloud, FileText, CheckCircle, AlertCircle, FileImage, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { parseMultimodalInventoryAction, registerBulkBikesAction, ParsedInventoryBike } from '@/lib/actions/ai-inventory-actions';

// Helper para leer archivo localmente
const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

export function BulkImportModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'upload' | 'analyzing' | 'review' | 'saving'>('upload');
  const [parsedBikes, setParsedBikes] = useState<ParsedInventoryBike[]>([]);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStep('analyzing');
    try {
      let payload = { data: '', mimeType: file.type, isText: false };

      // Si es CSV o TXT, mandamos el texto plano
      if (file.name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'text/plain') {
         payload.data = await readFileAsText(file);
         payload.isText = true;
      } else {
         // PDF, Imágenes (JPG, PNG) o Excels (Fallback a binario si no parseamos en cliente)
         // Nota: Para Excel puro lo ideal es parsear localmente con xlsx, pero el PDF/Imagen requieren Base64
         payload.data = await readFileAsDataURL(file);
      }

      const result = await parseMultimodalInventoryAction(payload);

      if (result.success && result.data && result.data.length > 0) {
         setParsedBikes(result.data);
         setStep('review');
         toast({ title: 'Análisis Completado', description: `Sprock encontró ${result.data.length} bicicletas.`, className: 'bg-green-50' });
      } else {
         throw new Error(result.error || 'La IA no pudo encontrar bicicletas en este archivo.');
      }

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error de Lectura', description: error.message });
      setStep('upload');
    }
  };

  const handleCellChange = (index: number, field: keyof ParsedInventoryBike, value: any) => {
    const updated = [...parsedBikes];
    updated[index] = { ...updated[index], [field]: value };
    setParsedBikes(updated);
  };

  const removeRow = (index: number) => {
    setParsedBikes(parsedBikes.filter((_, i) => i !== index));
  };

  const handleConfirmSave = async () => {
    if (parsedBikes.length === 0) return;
    setStep('saving');
    
    const result = await registerBulkBikesAction(parsedBikes);
    
    if (result.success) {
      toast({ title: '¡Inventario Guardado!', description: `Se registraron ${result.count} bicicletas exitosamente.`, className: 'bg-green-600 text-white' });
      setOpen(false);
      setTimeout(() => {
        setStep('upload');
        setParsedBikes([]);
        router.refresh(); // Refrescar el dashboard
      }, 500);
    } else {
      toast({ variant: 'destructive', title: 'Error al guardar', description: result.error });
      setStep('review');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (step !== 'analyzing' && step !== 'saving') setOpen(val) }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-primary text-primary hover:bg-primary/5">
          <UploadCloud className="mr-2 h-4 w-4" /> Importación Masiva (Beta)
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Sprock B2B: Carga de Inventario</DialogTitle>
          <DialogDescription>
            Sube tu factura (PDF), foto de inventario, o archivo Excel/CSV. Nuestra IA extraerá los datos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          
          {/* PASO 1: UPLOAD */}
          {step === 'upload' && (
            <div 
              className="border-2 border-dashed border-primary/20 rounded-xl p-12 text-center hover:bg-muted/50 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[300px]"
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".csv, .pdf, image/jpeg, image/png, image/webp"
              />
              <div className="flex gap-4 mb-4">
                 <FileText className="h-10 w-10 text-muted-foreground/50" />
                 <FileImage className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-bold mb-2">Haz clic para subir tu archivo</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Soporta CSV, PDFs de facturas o Fotos de listas impresas (Formatos: .csv, .pdf, .jpg, .png)
              </p>
            </div>
          )}

          {/* PASO 2: ANALYZING */}
          {step === 'analyzing' && (
            <div className="flex flex-col items-center justify-center min-h-[300px] space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
                <Loader2 className="h-16 w-16 animate-spin text-primary relative z-10" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold">Sprock está leyendo el documento...</h3>
                <p className="text-muted-foreground text-sm mt-1">Extrayendo marcas, modelos y números de serie.</p>
              </div>
            </div>
          )}

          {/* PASO 3: REVIEW */}
          {step === 'review' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-blue-50 text-blue-800 p-3 rounded-md text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>Revisa la información extraída. Puedes editar las celdas directamente antes de guardar. <b>{parsedBikes.length} bicicletas detectadas.</b></p>
              </div>

              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Marca</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead>No. Serie</TableHead>
                      <TableHead>Año</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedBikes.map((bike, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="p-2"><Input value={bike.marca} onChange={(e) => handleCellChange(idx, 'marca', e.target.value)} className="h-8 text-xs" /></TableCell>
                        <TableCell className="p-2"><Input value={bike.modelo} onChange={(e) => handleCellChange(idx, 'modelo', e.target.value)} className="h-8 text-xs" /></TableCell>
                        <TableCell className="p-2"><Input value={bike.color} onChange={(e) => handleCellChange(idx, 'color', e.target.value)} className="h-8 text-xs" /></TableCell>
                        <TableCell className="p-2"><Input value={bike.numeroSerie} onChange={(e) => handleCellChange(idx, 'numeroSerie', e.target.value)} className="h-8 text-xs font-mono" placeholder="Opcional" /></TableCell>
                        <TableCell className="p-2"><Input value={bike.anoModelo} onChange={(e) => handleCellChange(idx, 'anoModelo', e.target.value)} className="h-8 text-xs w-20" /></TableCell>
                        <TableCell className="p-2"><Input type="number" value={bike.precioEstimado} onChange={(e) => handleCellChange(idx, 'precioEstimado', parseFloat(e.target.value) || 0)} className="h-8 text-xs w-24" /></TableCell>
                        <TableCell className="p-2">
                           <Button variant="ghost" size="icon" onClick={() => removeRow(idx)} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
                             <Trash2 className="h-4 w-4" />
                           </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* PASO 4: SAVING */}
          {step === 'saving' && (
            <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <h3 className="text-lg font-bold">Registrando en base de datos...</h3>
            </div>
          )}
        </div>

        {step === 'review' && (
          <div className="flex justify-end gap-3 pt-4 border-t mt-auto">
            <Button variant="outline" onClick={() => setStep('upload')}>Cancelar</Button>
            <Button onClick={handleConfirmSave} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="mr-2 h-4 w-4" /> Confirmar e Ingresar Inventario
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
