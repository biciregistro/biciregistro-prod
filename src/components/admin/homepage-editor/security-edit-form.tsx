'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { updateHomepageSection } from '@/lib/actions';
import type { HomepageSection, SecurityFeature, ActionFormState } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/shared/image-upload';

function SubmitButton() {
    const { pending } = useFormStatus();
    return <Button type="submit" disabled={pending}>{pending ? 'Guardando...' : 'Guardar Sección de Seguridad'}</Button>;
}

export function SecurityEditForm({ section }: { section: Extract<HomepageSection, { id: 'security' }> }) {
    const [state, formAction] = useActionState(updateHomepageSection, null as ActionFormState);
    const { toast } = useToast();
    
    // Initialize items state to manage local changes before submit
    const [items, setItems] = useState<SecurityFeature[]>(section.items || [
        { title: '', description: '', imageUrl: '' },
        { title: '', description: '', imageUrl: '' },
        { title: '', description: '', imageUrl: '' }
    ]);

    useEffect(() => {
        if (state?.message) {
            toast({ title: "Éxito", description: state.message });
        }
        if (state?.error) {
            toast({ variant: 'destructive', title: "Error", description: state.error });
        }
    }, [state, toast]);

    const updateItem = (index: number, field: keyof SecurityFeature, value: string) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    return (
        <form action={formAction} className="space-y-8">
            <input type="hidden" name="id" value="security" />
            {/* Send items as JSON string to be parsed by the server action */}
            <input type="hidden" name="itemsJson" value={JSON.stringify(items)} />

            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                <div className="space-y-2">
                    <Label htmlFor="title-security">Título de la Sección</Label>
                    <Input id="title-security" name="title" defaultValue={section.title} />
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="subtitle-security">Subtítulo</Label>
                    <Textarea id="subtitle-security" name="subtitle" defaultValue={section.subtitle} rows={3} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {items.map((item, index) => (
                    <Card key={index} className="p-4 space-y-4">
                        <div className="font-semibold text-lg border-b pb-2">Columna {index + 1}</div>
                        
                        <div className="space-y-2">
                            <Label>Imagen / Icono</Label>
                            <div className="border rounded-md bg-background p-2">
                                <ImageUpload 
                                    storagePath="homepage/security"
                                    onUploadSuccess={(url) => updateItem(index, 'imageUrl', url)}
                                    buttonText={item.imageUrl ? "Cambiar" : "Subir"}
                                    guidelinesText="400x300px"
                                />
                                {item.imageUrl && (
                                    <div className="mt-2 relative h-20 w-full">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={item.imageUrl} alt="Preview" className="h-full w-full object-contain" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Título</Label>
                            <Input 
                                value={item.title} 
                                onChange={(e) => updateItem(index, 'title', e.target.value)} 
                                placeholder="Título de la columna"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Descripción</Label>
                            <Textarea 
                                value={item.description} 
                                onChange={(e) => updateItem(index, 'description', e.target.value)} 
                                placeholder="Descripción corta..."
                                rows={4}
                            />
                        </div>
                    </Card>
                ))}
            </div>

            <div className="flex justify-end">
                <SubmitButton />
            </div>
        </form>
    );
}
