'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { updateFeatureItem } from '@/lib/actions';
import type { Feature, ActionFormState } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/shared/image-upload';

function SubmitButton() {
    const { pending } = useFormStatus();
    return <Button type="submit" disabled={pending}>{pending ? 'Guardando...' : 'Guardar Característica'}</Button>;
}

export function FeatureItemEditForm({ feature, featureId }: { feature: Feature, featureId: string }) {
    const [state, formAction] = useActionState(updateFeatureItem, null as ActionFormState);
    const { toast } = useToast();
    const [imageUrl, setImageUrl] = useState(feature.imageUrl || '');

    useEffect(() => {
        if (state?.message) {
            toast({ title: "Éxito", description: state.message });
        }
        if (state?.error) {
            toast({ variant: 'destructive', title: "Error", description: state.error });
        }
    }, [state, toast]);

    return (
        <form action={formAction} className="p-4 border rounded-lg space-y-4 bg-muted/20">
            <input type="hidden" name="featureId" value={featureId} />
            <input type="hidden" name="imageUrl" value={imageUrl} />
            <div className="space-y-2">
                <Label>Título de Característica</Label>
                <Input name="title" defaultValue={feature.title} />
            </div>
            <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea name="description" defaultValue={feature.description} />
            </div>
             <div className="space-y-2">
                <Label>Ícono / Imagen</Label>
                <div className="p-4 border rounded-md bg-background">
                    <ImageUpload 
                        storagePath="homepage/features"
                        onUploadSuccess={setImageUrl}
                        guidelinesText="Recomendado: 800x800px"
                    />
                     {imageUrl && <p className="text-xs text-muted-foreground mt-2">URL actual: {imageUrl}</p>}
                </div>
            </div>
            <SubmitButton />
        </form>
    )
}
