'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { updateHomepageSection } from '@/lib/actions';
import type { HomepageSection, ActionFormState } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/shared/image-upload';
import { Plus, Trash2 } from 'lucide-react';

function SubmitButton() {
    const { pending } = useFormStatus();
    return <Button type="submit" disabled={pending}>{pending ? 'Guardando...' : 'Guardar Sección de Aliados'}</Button>;
}

export function AlliesEditForm({ section }: { section: Extract<HomepageSection, { id: 'allies' }> }) {
    const [state, formAction] = useActionState(updateHomepageSection, null as ActionFormState);
    const { toast } = useToast();
    const [sponsors, setSponsors] = useState(section.sponsors || []);

    useEffect(() => {
        if (state?.message) {
            toast({ title: "Éxito", description: state.message });
        }
        if (state?.error) {
            toast({ variant: 'destructive', title: "Error", description: state.error });
        }
    }, [state, toast]);

    const addSponsor = () => {
        setSponsors([...sponsors, { name: '', url: '' }]);
    };

    const removeSponsor = (index: number) => {
        const newSponsors = [...sponsors];
        newSponsors.splice(index, 1);
        setSponsors(newSponsors);
    };

    const updateSponsor = (index: number, field: 'name' | 'url', value: string) => {
        const newSponsors = [...sponsors];
        newSponsors[index] = { ...newSponsors[index], [field]: value };
        setSponsors(newSponsors);
    };

    return (
        <form action={formAction} className="space-y-6">
            <input type="hidden" name="id" value="allies" />
            <input type="hidden" name="sponsorsJson" value={JSON.stringify(sponsors)} />

            <div className="space-y-2">
                <Label htmlFor="title-allies">Título de la Sección</Label>
                <Input id="title-allies" name="title" defaultValue={section.title} />
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <Label>Lista de Aliados</Label>
                    <Button type="button" onClick={addSponsor} size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-2" /> Agregar Aliado
                    </Button>
                </div>
                
                <div className="space-y-4">
                    {sponsors.map((sponsor, index) => (
                        <Card key={index} className="p-4 relative">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => removeSponsor(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nombre del Aliado</Label>
                                    <Input 
                                        value={sponsor.name || ''} 
                                        onChange={(e) => updateSponsor(index, 'name', e.target.value)}
                                        placeholder="Ej. Gobierno de la Ciudad"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Logo</Label>
                                    <div className="flex items-center gap-4">
                                        {sponsor.url && (
                                            <div className="h-10 w-10 relative border rounded bg-muted/20 flex-shrink-0">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={sponsor.url} alt="Logo Preview" className="h-full w-full object-contain p-1" />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <ImageUpload 
                                                storagePath="homepage/allies"
                                                onUploadSuccess={(url) => updateSponsor(index, 'url', url)}
                                                buttonText={sponsor.url ? "Cambiar Logo" : "Subir Logo"}
                                                guidelinesText=""
                                            />
                                        </div>
                                    </div>
                                    <Input 
                                        type="hidden"
                                        value={sponsor.url} 
                                        name={`sponsor-url-${index}`}
                                    />
                                </div>
                            </div>
                        </Card>
                    ))}
                    {sponsors.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg">
                            No hay aliados configurados. Haz clic en "Agregar Aliado" para comenzar.
                        </p>
                    )}
                </div>
            </div>

            <SubmitButton />
        </form>
    );
}
