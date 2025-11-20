'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function CopyButton({ textToCopy }: { textToCopy: string }) {
    const [isCopied, setIsCopied] = useState(false);
    const { toast } = useToast();

    const handleCopy = () => {
        navigator.clipboard.writeText(textToCopy).then(() => {
            setIsCopied(true);
            toast({ 
                title: "¡Copiado!", 
                description: "El enlace de invitación ha sido copiado al portapapeles." 
            });
            setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
        }, (err) => {
            console.error('Could not copy text: ', err);
            toast({ 
                variant: 'destructive', 
                title: "Error", 
                description: "No se pudo copiar el enlace. Inténtalo manualmente." 
            });
        });
    };

    return (
        <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Copiar enlace de invitación">
            {isCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        </Button>
    );
}
