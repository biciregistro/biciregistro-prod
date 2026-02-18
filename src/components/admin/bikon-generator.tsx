'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateBikonCodes, toggleBikonPrintedStatus } from '@/lib/actions/bikon-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BikonDevicePopulated } from '@/lib/types';
import { Loader2, Printer, Check, X, User, Bike } from 'lucide-react';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BikonGeneratorProps {
  initialDevices: BikonDevicePopulated[];
}

export function BikonGenerator({ initialDevices }: BikonGeneratorProps) {
  const [quantity, setQuantity] = useState(5);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateBikonCodes(quantity);
      if (result.success) {
        toast({
          title: 'Éxito',
          description: result.message,
        });
        router.refresh(); // Correct way to refresh Server Components data
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Ocurrió un error inesperado',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePrint = async (serial: string, currentStatus: boolean) => {
    try {
        const result = await toggleBikonPrintedStatus(serial, currentStatus);
        if (result.success) {
            toast({ title: "Estado actualizado", duration: 2000 });
            router.refresh(); 
        }
    } catch (error) {
        toast({ title: "Error", description: "No se pudo actualizar el estado.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Generar Nuevos Dispositivos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <label htmlFor="quantity" className="text-sm font-medium">
                Cantidad
              </label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={100}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>
            <Button onClick={handleGenerate} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generar Códigos
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventario de Dispositivos (Últimos 50)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Impreso</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha Creación</TableHead>
                <TableHead>Asignado A</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialDevices.map((device) => {
                  const date = new Date(device.createdAt);
                  const formattedDate = format(date, 'dd/MM/yyyy');

                  return (
                    <TableRow key={device.serialNumber}>
                      <TableCell>
                          <TooltipProvider>
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <Button 
                                        variant={device.isPrinted ? "ghost" : "outline"} 
                                        size="sm"
                                        className={device.isPrinted ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-muted-foreground hover:text-foreground"}
                                        onClick={() => handleTogglePrint(device.serialNumber, !!device.isPrinted)}
                                      >
                                          {device.isPrinted ? <Printer className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                      </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                      <p>{device.isPrinted ? "Marcado como Impreso" : "Marcar como Impreso"}</p>
                                  </TooltipContent>
                              </Tooltip>
                          </TooltipProvider>
                      </TableCell>
                      <TableCell className="font-mono font-medium">{device.serialNumber}</TableCell>
                      <TableCell>
                        <Badge variant={device.status === 'available' ? 'outline' : 'default'}>
                          {device.status === 'available' ? 'Disponible' : 'Vinculado'}
                        </Badge>
                      </TableCell>
                      <TableCell suppressHydrationWarning>
                        {formattedDate}
                      </TableCell>
                      <TableCell>
                        {device.assignedToBikeId ? (
                          <div className="flex flex-col gap-2 py-1 text-xs">
                              {device.assignedUser && (
                                  <div className="flex items-start gap-2">
                                      <User className="h-3 w-3 mt-0.5 text-muted-foreground" />
                                      <div>
                                          <p className="font-semibold text-foreground">{device.assignedUser.name} {device.assignedUser.lastName}</p>
                                          <p className="text-muted-foreground">{[device.assignedUser.city, device.assignedUser.state, device.assignedUser.country].filter(Boolean).join(', ')}</p>
                                      </div>
                                  </div>
                              )}
                              {device.assignedBike && (
                                  <div className="flex items-start gap-2 border-t pt-2 mt-1 border-border/50">
                                      <Bike className="h-3 w-3 mt-0.5 text-muted-foreground" />
                                      <div>
                                          <p className="font-medium text-foreground">{device.assignedBike.make} {device.assignedBike.model} <span className="text-muted-foreground">({device.assignedBike.color})</span></p>
                                          <p className="font-mono text-[10px] text-muted-foreground">SN: {device.assignedBike.serialNumber}</p>
                                      </div>
                                  </div>
                              )}
                              {!device.assignedUser && !device.assignedBike && (
                                  <span className="text-muted-foreground italic">Datos no disponibles</span>
                              )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
              })}
              {initialDevices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No hay dispositivos registrados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
