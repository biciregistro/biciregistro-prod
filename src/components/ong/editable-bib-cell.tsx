// src/components/ong/editable-bib-cell.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2, Edit2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { assignBibNumber } from '@/lib/actions/ong-actions';

interface EditableBibCellProps {
    registrationId: string;
    eventId: string;
    initialBibNumber: number | null | undefined;
}

export function EditableBibCell({ registrationId, eventId, initialBibNumber }: EditableBibCellProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialBibNumber?.toString() || '');
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleSave = async () => {
        if (!value) {
             setIsEditing(false);
             return;
        }

        const numericValue = parseInt(value, 10);
        if (isNaN(numericValue)) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "El número de corredor debe ser numérico.",
            });
            return;
        }
        
        if (numericValue === initialBibNumber) {
            setIsEditing(false);
            return;
        }

        setIsLoading(true);
        try {
            const result = await assignBibNumber(registrationId, eventId, numericValue);
            
            if (result.success) {
                toast({
                    title: "Asignado",
                    description: `Número ${numericValue} asignado correctamente.`,
                });
                setIsEditing(false);
                // In a real scenario, we might want to update local state or router refresh here, 
                // but for now relying on server action revalidation or optimistic UI would be next steps.
                // Assuming parent component triggers refresh or we just show the new value locally.
            } else {
                toast({
                    variant: "destructive",
                    title: "Error al asignar",
                    description: result.message || "No se pudo asignar el número.",
                });
            }
        } catch (error) {
             toast({
                variant: "destructive",
                title: "Error",
                description: "Ocurrió un error inesperado.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setValue(initialBibNumber?.toString() || '');
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="flex items-center space-x-1">
                <Input
                    ref={inputRef}
                    type="number"
                    inputMode="numeric"
                    className="h-8 w-20"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave();
                        if (e.key === 'Escape') handleCancel();
                    }}
                    disabled={isLoading}
                />
                <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={handleSave}
                    disabled={isLoading}
                >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
                <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={handleCancel}
                    disabled={isLoading}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    return (
        <div 
            className="group flex items-center space-x-2 cursor-pointer py-1 px-2 rounded hover:bg-muted/50"
            onClick={() => setIsEditing(true)}
        >
            <span className={!initialBibNumber ? "text-muted-foreground italic text-sm" : "font-mono font-medium"}>
                {initialBibNumber ? `#${initialBibNumber}` : 'Asignar'}
            </span>
            <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
}
