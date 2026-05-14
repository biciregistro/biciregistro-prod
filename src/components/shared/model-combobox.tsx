'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown, Check } from 'lucide-react';
import { getModelsByBrandAction } from '@/lib/actions';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

interface ModelComboboxProps {
    brand: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

/**
 * Componente reutilizable de autocompletado para modelos de bicicletas.
 * Se alimenta dinámicamente de la colección 'blue-book-valuations' (Libro Azul).
 * Permite selección de modelos existentes o entrada de texto libre.
 */
export function ModelCombobox({ 
    brand, 
    value, 
    onChange, 
    placeholder = "Busca tu modelo",
    className,
    disabled = false
}: ModelComboboxProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Cargar modelos cuando la marca cambia
    useEffect(() => {
        if (brand && brand !== 'Otra' && brand !== 'Otro') {
            setIsLoading(true);
            // IMPORTANTE: Al cambiar la marca programáticamente (o por el usuario), debemos limpiar el modelo anterior
            // para evitar combinaciones inválidas (ej. Marca: Trek, Modelo: Stumpjumper).
            // Esto se manejó en los formularios padres antes, pero es más seguro si lo forzamos aquí cuando 
            // no hay coincidencia, o dejamos que el padre lo controle. Por flexibilidad, el padre lo controla.
            getModelsByBrandAction(brand).then(models => {
                setAvailableModels(models);
                setIsLoading(false);
            }).catch(() => {
                setAvailableModels([]);
                setIsLoading(false);
            });
        } else {
            setAvailableModels([]);
        }
    }, [brand]);

    return (
        <div className={cn("relative w-full", className)}>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button 
                        variant="outline" 
                        role="combobox" 
                        aria-expanded={isOpen} 
                        disabled={disabled || !brand || isLoading}
                        className={cn(
                            "w-full justify-between h-10 px-3 font-normal bg-background transition-all",
                            !value && "text-muted-foreground",
                            (disabled || !brand || isLoading) && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <span className="truncate flex items-center gap-2">
                            {isLoading ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Cargando...</>
                            ) : value ? (
                                value
                            ) : brand === 'Otra' || brand === 'Otro' ? (
                                "Escribe el modelo"
                            ) : (
                                placeholder
                            )}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                        <CommandInput 
                            placeholder="Buscar modelo..." 
                            onValueChange={setSearchQuery} 
                        />
                        <CommandList>
                            <CommandEmpty className="p-4 text-xs text-center">
                                <p className="mb-2 text-muted-foreground">No encontrado en el catálogo.</p>
                                <Button 
                                    variant="link" 
                                    className="px-1 h-auto font-bold text-primary text-xs w-full"
                                    onClick={() => {
                                        onChange(searchQuery);
                                        setIsOpen(false);
                                    }}
                                >
                                    Usar "{searchQuery}"
                                </Button>
                            </CommandEmpty>
                            <CommandGroup>
                                {availableModels.map((model) => (
                                    <CommandItem
                                        key={model}
                                        value={model}
                                        onSelect={(currentValue) => {
                                            // cmdk a veces devuelve el valor en minúsculas, usamos el original del array
                                            const originalCaseModel = availableModels.find(am => am.toLowerCase() === currentValue.toLowerCase()) || currentValue;
                                            onChange(originalCaseModel);
                                            setIsOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === model ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {model}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}
