'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ImageUpload } from '@/components/shared/image-upload';
import { Plus, Trash2 } from 'lucide-react';

export interface Sponsor {
    name?: string;
    url: string;
}

interface SponsorsListEditorProps {
    initialSponsors: Sponsor[];
    namePrefix?: string; // If provided, inputs will have name attributes for FormData
    onChange?: (sponsors: Sponsor[]) => void;
    description?: string;
}

export function SponsorsListEditor({ initialSponsors, namePrefix, onChange, description }: SponsorsListEditorProps) {
    const [sponsors, setSponsors] = useState<Sponsor[]>(initialSponsors || []);

    // Effect to notify parent of changes
    useEffect(() => {
        if (onChange) {
            onChange(sponsors);
        }
    }, [sponsors, onChange]);

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
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Label>Lista de Aliados</Label>
                <Button type="button" onClick={addSponsor} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" /> Agregar Aliado
                </Button>
            </div>
            
            {description && <p className="text-sm text-muted-foreground">{description}</p>}

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
                                    // If namePrefix is present, we give it a name for FormData submission
                                    name={namePrefix ? `${namePrefix}.${index}.name` : undefined}
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
                                            storagePath="homepage/allies" // Generic path, could be prop-ified if needed strict separation
                                            onUploadSuccess={(url) => updateSponsor(index, 'url', url)}
                                            buttonText={sponsor.url ? "Cambiar Logo" : "Subir Logo"}
                                            guidelinesText=""
                                        />
                                    </div>
                                </div>
                                {/* Hidden input for URL submission via FormData */}
                                {namePrefix && (
                                    <input 
                                        type="hidden"
                                        name={`${namePrefix}.${index}.logoUrl`} // Note: Landing expects 'logoUrl', Home expects 'url'. Logic needed.
                                        value={sponsor.url} 
                                    />
                                )}
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
    );
}
