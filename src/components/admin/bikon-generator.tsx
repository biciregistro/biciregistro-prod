'use client';

import { useState, useEffect } from 'react';
import { generateBikonCodes } from '@/lib/actions/bikon-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BikonDevice } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface BikonGeneratorProps {
  initialDevices: BikonDevice[];
}

export function BikonGenerator({ initialDevices }: BikonGeneratorProps) {
  const [quantity, setQuantity] = useState(5);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateBikonCodes(quantity);
      if (result.success) {
        toast({
          title: 'Éxito',
          description: result.message,
        });
        window.location.reload(); 
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
          <CardTitle>Últimos Dispositivos Generados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
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
                      <TableCell className="font-mono">{device.serialNumber}</TableCell>
                      <TableCell>
                        <Badge variant={device.status === 'available' ? 'outline' : 'default'}>
                          {device.status === 'available' ? 'Disponible' : 'Vinculado'}
                        </Badge>
                      </TableCell>
                      {/* Agregamos suppressHydrationWarning para evitar errores por diferencias de zona horaria entre servidor y cliente */}
                      <TableCell suppressHydrationWarning>
                        {formattedDate}
                      </TableCell>
                      <TableCell>
                        {device.assignedToBikeId ? (
                          <span className="text-xs">
                            Bici: {device.assignedToBikeId}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  );
              })}
              {initialDevices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
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
