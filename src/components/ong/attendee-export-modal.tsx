'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Download, FileDown } from 'lucide-react';
import type { EventAttendee } from '@/lib/types';
import { format } from 'date-fns';

interface AttendeeExportModalProps {
  attendees: EventAttendee[];
  eventName: string;
}

// Mapa de campos permitidos (Whitelist) - Excluyendo explícitamente datos médicos
const AVAILABLE_FIELDS = [
  { id: 'name', label: 'Nombre' },
  { id: 'lastName', label: 'Apellido' },
  { id: 'email', label: 'Correo Electrónico' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'bibNumber', label: 'Número (Bib)' },
  { id: 'categoryName', label: 'Categoría' },
  { id: 'tierName', label: 'Nivel/Tier' },
  { id: 'gender', label: 'Género' }, 
  { id: 'jerseyModel', label: 'Modelo Jersey' },
  { id: 'jerseySize', label: 'Talla Jersey' },
  { id: 'status', label: 'Estatus Registro' },
  { id: 'paymentStatus', label: 'Estatus Pago' },
  { id: 'checkedIn', label: 'Asistió (Check-in)' },
  { id: 'registrationDate', label: 'Fecha Registro' },
  { id: 'emergencyContactName', label: 'Contacto Emergencia (Nombre)' },
  { id: 'emergencyContactPhone', label: 'Contacto Emergencia (Tel)' },
  { id: 'bikeInfo', label: 'Bicicleta (Marca/Modelo)' },
];

export function AttendeeExportModal({ attendees, eventName }: AttendeeExportModalProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>(AVAILABLE_FIELDS.map(f => f.id));
  const [isOpen, setIsOpen] = useState(false);

  const toggleField = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(f => f !== fieldId)
        : [...prev, fieldId]
    );
  };

  const toggleAll = () => {
    if (selectedFields.length === AVAILABLE_FIELDS.length) {
      setSelectedFields([]);
    } else {
      setSelectedFields(AVAILABLE_FIELDS.map(f => f.id));
    }
  };

  const handleExport = () => {
    // 1. Generar cabeceras
    const headers = AVAILABLE_FIELDS
      .filter(field => selectedFields.includes(field.id))
      .map(field => field.label);

    // 2. Generar filas
    const rows = attendees.map(attendee => {
      return AVAILABLE_FIELDS
        .filter(field => selectedFields.includes(field.id))
        .map(field => {
          const key = field.id;
          let value: any = '';

          // Manejo especial de campos
          switch (key) {
            case 'bikeInfo':
              value = attendee.bike ? `${attendee.bike.make} ${attendee.bike.model}` : '';
              break;
            case 'checkedIn':
              value = attendee.checkedIn ? 'Sí' : 'No';
              break;
            case 'registrationDate':
                try {
                    value = attendee.registrationDate ? format(new Date(attendee.registrationDate), 'dd/MM/yyyy HH:mm') : '';
                } catch (e) { value = attendee.registrationDate }
                break;
            default:
              // @ts-ignore - Acceso dinámico seguro dado que filtramos por whitelist
              value = attendee[key];
          }

          // Sanitizar para CSV (escapar comillas y manejar comas)
          const stringValue = String(value || '');
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        });
    });

    // 3. Construir CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // 4. Descargar
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM para Excel
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Nombre del archivo sanitizado
    const safeEventName = eventName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    link.setAttribute('download', `${safeEventName}-asistentes-${dateStr}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" size="sm">
          <FileDown className="h-4 w-4" />
          Exportar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Asistentes</DialogTitle>
          <DialogDescription>
            Selecciona los datos que deseas incluir en el archivo CSV.
            <br/>
            <span className="text-xs text-muted-foreground italic">* Los datos médicos están excluidos por privacidad.</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
            <div className="flex items-center space-x-2 mb-4 pb-4 border-b">
                <Checkbox 
                    id="select-all" 
                    checked={selectedFields.length === AVAILABLE_FIELDS.length}
                    onCheckedChange={toggleAll}
                />
                <Label htmlFor="select-all" className="font-bold cursor-pointer">Seleccionar Todo</Label>
            </div>
            
            <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
                {AVAILABLE_FIELDS.map((field) => (
                    <div key={field.id} className="flex items-center space-x-2">
                        <Checkbox 
                            id={field.id} 
                            checked={selectedFields.includes(field.id)}
                            onCheckedChange={() => toggleField(field.id)}
                        />
                        <Label htmlFor={field.id} className="cursor-pointer text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {field.label}
                        </Label>
                    </div>
                ))}
            </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button onClick={handleExport} disabled={selectedFields.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Descargar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
