
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { EventCategory } from '@/lib/types';
import { Check, X, Clock, RefreshCw } from 'lucide-react';
import { updateEventCategoryAction } from '@/lib/actions/event-registration-actions';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface EventCategoryDisplayProps {
    registrationId: string;
    currentCategoryId?: string;
    availableCategories?: EventCategory[];
    isEditable?: boolean;
}

export function EventCategoryDisplay({
    registrationId,
    currentCategoryId,
    availableCategories = [],
    isEditable = false
}: EventCategoryDisplayProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [selectedId, setSelectedId] = useState(currentCategoryId || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const currentCategory = availableCategories.find(c => c.id === currentCategoryId);
    const selectedCategory = availableCategories.find(c => c.id === selectedId);

    const handleSave = async () => {
        if (selectedId === currentCategoryId) {
            setIsEditing(false);
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await updateEventCategoryAction(registrationId, selectedId);
            if (result.success) {
                toast({
                    title: "Categoría actualizada",
                    description: result.message,
                });
                setIsEditing(false);
            } else {
                toast({
                    title: "Error",
                    description: result.error,
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo actualizar la categoría.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isEditing) {
        return (
            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 bg-muted/30 p-2 rounded-lg border border-dashed border-primary/20">
                <div className="flex items-center gap-2">
                    <Select value={selectedId} onValueChange={setSelectedId} disabled={isSubmitting}>
                        <SelectTrigger className="h-8 text-[10px] font-bold w-full">
                            <SelectValue placeholder="Selecciona categoría" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableCategories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id} className="text-xs">
                                    {cat.name} {cat.startTime && `(${cat.startTime})`}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="flex gap-1">
                        <Button 
                            size="icon" 
                            variant="default" 
                            className="h-8 w-8 shrink-0"
                            onClick={handleSave}
                            disabled={isSubmitting}
                        >
                            <Check className="h-4 w-4" />
                        </Button>
                        <Button 
                            size="icon" 
                            variant="outline" 
                            className="h-8 w-8 shrink-0"
                            onClick={() => { setIsEditing(false); setSelectedId(currentCategoryId || ''); }}
                            disabled={isSubmitting}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                {selectedCategory?.startTime && (
                    <p className="text-[10px] text-primary font-bold flex items-center gap-1 px-1">
                        <Clock className="h-3 w-3" /> Salida: {selectedCategory.startTime}
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1.5">
            <p className="font-bold text-sm uppercase">
                {currentCategory?.name || 'N/A'}
            </p>
            
            {currentCategory?.startTime && (
                <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 text-[10px] h-5 flex items-center gap-1 w-fit px-1.5">
                    <Clock className="h-3 w-3" />
                    Salida: {currentCategory.startTime}
                </Badge>
            )}

            {isEditable && (
                <Button 
                    variant="link" 
                    size="sm" 
                    className="h-auto p-0 text-[10px] text-muted-foreground hover:text-primary justify-start font-bold uppercase tracking-tighter"
                    onClick={() => setIsEditing(true)}
                >
                    <RefreshCw className="h-2.5 w-2.5 mr-1" /> Cambiar Categoría
                </Button>
            )}
        </div>
    );
}
