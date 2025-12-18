'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { updateHomepageSection } from '@/lib/actions';
import type { HomepageSection, ActionFormState } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/shared/image-upload';

function SubmitButton() {
    const { pending } = useFormStatus();
    return <Button type="submit" disabled={pending}>{pending ? 'Guardando...' : 'Guardar Cambios'}</Button>;
}

export function SectionEditForm({ section }: { section: HomepageSection }) {
    const [state, formAction] = useActionState(updateHomepageSection, null as ActionFormState);
    const { toast } = useToast();
    
    const initialImageUrl = 'imageUrl' in section ? section.imageUrl : '';
    const [imageUrl, setImageUrl] = useState(initialImageUrl || '');

    useEffect(() => {
        if (state?.message) {
            toast({ title: "Éxito", description: state.message });
        }
        if (state?.error) {
            toast({ variant: 'destructive', title: "Error", description: state.error });
        }
    }, [state, toast]);

    const hasButtonText = 'buttonText' in section;
    const hasImage = section.id === 'hero' || section.id === 'cta';

    const getImageGuidelines = () => {
        if (section.id === 'hero') return "Recomendado: 1920x1080px";
        return "Recomendado: 1280x720px";
    };

    return (
        <form action={formAction} className="space-y-6">
            <input type="hidden" name="id" value={section.id} />
            {hasImage && <input type="hidden" name="imageUrl" value={imageUrl} />}

            <div className="space-y-2">
                <Label htmlFor={`title-${section.id}`}>Título</Label>
                <Input id={`title-${section.id}`} name="title" defaultValue={section.title} />
            </div>
            
            {'subtitle' in section && (
                <div className="space-y-2">
                    <Label htmlFor={`subtitle-${section.id}`}>Subtítulo</Label>
                    <Textarea id={`subtitle-${section.id}`} name="subtitle" defaultValue={section.subtitle} rows={4} />
                </div>
            )}
            
            {hasButtonText && (
                <div className="space-y-2">
                    <Label htmlFor={`buttonText-${section.id}`}>Texto del Botón</Label>
                    <Input id={`buttonText-${section.id}`} name="buttonText" defaultValue={section.buttonText} />
                </div>
            )}
            {hasImage && (
                 <div className="space-y-2">
                    <Label>Imagen de Fondo</Label>
                    <div className="p-4 border rounded-md bg-muted/40">
                        <ImageUpload 
                            storagePath={`homepage/${section.id}`}
                            onUploadSuccess={setImageUrl}
                            guidelinesText={getImageGuidelines()}
                        />
                        {imageUrl && <p className="text-xs text-muted-foreground mt-2">URL actual: {imageUrl}</p>}
                    </div>
                </div>
            )}
            <SubmitButton />
        </form>
    );
}
