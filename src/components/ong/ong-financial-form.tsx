'use client';

import { useActionState, useEffect, useState, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { saveOngFinancialsAction } from '@/lib/actions/ong-actions';
import type { OngUser } from '@/lib/types';
import { Banknote, FileText, CheckCircle2, Loader2, Upload, ExternalLink } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase/client";

function SubmitButton({ isUploading }: { isUploading: boolean }) {
    const { pending } = useFormStatus();
    const disabled = pending || isUploading;
    return (
        <Button type="submit" disabled={disabled} className="w-full sm:w-auto">
            {disabled && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {disabled ? 'Guardando...' : 'Guardar Información Financiera'}
        </Button>
    );
}

export function OngFinancialForm({ ongProfile }: { ongProfile: Partial<OngUser> }) {
    const { toast } = useToast();
    const [state, formAction] = useActionState(saveOngFinancialsAction, null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string>(ongProfile.financialData?.constanciaFiscalUrl || '');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (state?.success) {
            toast({
                title: "Actualización Exitosa",
                description: state.message,
            });
        } else if (state?.error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: state.error,
            });
        }
    }, [state, toast]);

    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadError(null);

        // Validation
        if (file.type !== 'application/pdf') {
            setUploadError("El archivo debe ser un PDF.");
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            setUploadError("El archivo no debe exceder los 5MB.");
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsUploading(true);

        try {
            // APLICAMOS LA RUTA SEGURA CON EL ID DE LA ONG
            const fileName = `constancias-fiscales/${ongProfile.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const storageRef = ref(storage, fileName);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
                "state_changed",
                () => { /* progress tracking if needed */ },
                (error) => {
                    console.error("Upload error:", error);
                    setIsUploading(false);
                    setUploadError("Error al subir el archivo. Revisa tus permisos.");
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    setPdfUrl(downloadURL);
                    setIsUploading(false);
                    toast({ title: "Archivo cargado", description: "La constancia fiscal se ha subido correctamente." });
                }
            );
        } catch (error) {
            console.error("Upload process error:", error);
            setIsUploading(false);
            setUploadError("Error inesperado al procesar el archivo.");
        }
    };


    return (
        <div className="space-y-6">
            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900">
                <Banknote className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-blue-800 dark:text-blue-300">Gestión de Dispersión de Fondos</AlertTitle>
                <AlertDescription className="text-blue-700 dark:text-blue-400 mt-1">
                    Esta información es requerida estrictamente para procesar los pagos recaudados por las inscripciones a tus eventos. 
                    BiciRegistro utiliza transferencias SPEI para abonar tu saldo semanalmente.
                    <br/><br/>
                    <strong>Importante:</strong> Como procesador de pagos, requerimos tu Constancia de Situación Fiscal actualizada para la correcta facturación de las comisiones de uso de plataforma.
                </AlertDescription>
            </Alert>

            <form action={formAction} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/30 p-6 rounded-lg border">
                    <div className="space-y-2">
                        {/* Se removió el componente <FormLabel> para no usar el contexto de React Hook Form que no existe aquí */}
                        <label htmlFor="bankName" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Nombre del Banco</label>
                        <Input 
                            id="bankName" 
                            name="bankName" 
                            placeholder="Ej. BBVA, Santander, Banorte" 
                            defaultValue={ongProfile.financialData?.bankName} 
                            required 
                        />
                        {state?.errors?.bankName && <p className="text-sm text-destructive">{state.errors.bankName[0]}</p>}
                    </div>

                    <div className="space-y-2">
                         <label htmlFor="accountHolder" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Beneficiario / Titular de la Cuenta</label>
                        <Input 
                            id="accountHolder" 
                            name="accountHolder" 
                            placeholder="Nombre oficial registrado en el banco" 
                            defaultValue={ongProfile.financialData?.accountHolder} 
                            required 
                        />
                        <p className="text-xs text-muted-foreground">Debe coincidir con la Constancia de Situación Fiscal.</p>
                        {state?.errors?.accountHolder && <p className="text-sm text-destructive">{state.errors.accountHolder[0]}</p>}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <label htmlFor="clabe" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Cuenta CLABE Interbancaria</label>
                        <Input 
                            id="clabe" 
                            name="clabe" 
                            placeholder="18 dígitos numéricos" 
                            maxLength={18} 
                            pattern="\d{18}" 
                            title="Debe contener exactamente 18 dígitos numéricos"
                            defaultValue={ongProfile.financialData?.clabe} 
                            required 
                            className="font-mono text-lg tracking-widest"
                        />
                        {state?.errors?.clabe && <p className="text-sm text-destructive">{state.errors.clabe[0]}</p>}
                    </div>
                </div>

                {/* PDF Uploader Section */}
                <div className="bg-muted/30 p-6 rounded-lg border space-y-4">
                    <div>
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Constancia de Situación Fiscal (PDF)
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">Requerida para la facturación de comisiones y validación de la entidad.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="w-full sm:w-auto shrink-0"
                        >
                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            {pdfUrl ? 'Reemplazar Archivo PDF' : 'Subir Archivo PDF'}
                        </Button>
                        <input 
                            type="file" 
                            accept=".pdf,application/pdf" 
                            className="hidden" 
                            ref={fileInputRef}
                            onChange={handlePdfUpload}
                        />
                        
                        {/* Hidden input to pass the URL to the server action */}
                        <input type="hidden" name="constanciaFiscalUrl" value={pdfUrl} />

                        {pdfUrl ? (
                            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/30 px-3 py-2 rounded-md border border-green-200">
                                <CheckCircle2 className="h-4 w-4" />
                                <span>Archivo cargado</span>
                                <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:underline flex items-center gap-1 font-medium">
                                    Ver <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>
                        ) : (
                            <span className="text-sm text-muted-foreground italic">Ningún archivo seleccionado.</span>
                        )}
                    </div>
                    {uploadError && <p className="text-sm text-destructive font-medium">{uploadError}</p>}
                    {state?.errors?.constanciaFiscalUrl && <p className="text-sm text-destructive">{state.errors.constanciaFiscalUrl[0]}</p>}
                </div>

                <div className="pt-4 border-t flex justify-end">
                    <SubmitButton isUploading={isUploading} />
                </div>
            </form>
        </div>
    );
}
