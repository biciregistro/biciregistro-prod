'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useTransition, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { BikeRegistrationForm, TheftReportForm } from '@/components/bike-card';
import { TransferOwnershipForm } from '@/components/bike-components/transfer-ownership-form';
import { cn } from '@/lib/utils';
import type { Bike, User, BikeStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pencil, FileDown, Loader2 } from 'lucide-react';
import { ImageUpload } from '@/components/shared/image-upload';
import { updateOwnershipProof } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import QRCodeGenerator from '@/components/bike-components/qr-code-generator';
import { auth } from '@/lib/firebase/client';
import { RecoverBikeButton } from '@/components/bike-components/recover-bike-button';

// Dynamic import for PDF downloader
const BikePDFDownloader = dynamic(
  () => import('@/components/bike-components/bike-pdf-downloader'),
  { 
    ssr: false,
    loading: () => <Button variant="default" disabled className="w-full"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cargando...</Button>
  }
);

// --- CORRECTED MAPPINGS ---
// Style mapping for the status badge
const bikeStatusStyles: { [key in BikeStatus]: string } = {
  safe: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700',
  stolen: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700',
  in_transfer: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700',
  recovered: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700',
};

// Text mapping for the status badge
const bikeStatusTexts: { [key in BikeStatus]: string } = {
  safe: 'En Regla',
  stolen: 'Robada',
  in_transfer: 'En Transferencia',
  recovered: 'Recuperada',
};
// --- END CORRECTION ---

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
    if (!value) return null;
    return (
        <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold">{value}</p>
        </div>
    );
}

function OwnershipProofSection({ bike }: { bike: Bike }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);

    useEffect(() => {
        if (!auth) return;
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setAuthUser(user);
        });
        return () => unsubscribe();
    }, []);

    const currentUserId = authUser?.uid;

    const handleUploadSuccess = (url: string) => {
        startTransition(async () => {
            try {
                await updateOwnershipProof(bike.id, url);
                toast({
                    title: "Éxito",
                    description: "El documento de propiedad se ha cargado y guardado.",
                });
                window.location.reload();
            } catch (error) {
                toast({
                    title: "Error",
                    description: "No se pudo guardar el documento. Por favor, inténtalo de nuevo.",
                    variant: "destructive",
                });
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Documento de Propiedad</CardTitle>
            </CardHeader>
            <CardContent>
                {bike.ownershipProof ? (
                    <Button asChild variant="outline" className="w-full justify-start">
                        <a href={bike.ownershipProof} target="_blank" rel="noopener noreferrer">
                            <FileDown className="mr-2 h-4 w-4" />
                            Descargar Documento
                        </a>
                    </Button>
                ) : (
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-4">
                            No has cargado un documento. Sube una foto o PDF de tu factura o prueba de compra.
                        </p>
                        {isPending ? (
                             <Button disabled className="w-full">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Guardando...
                            </Button>
                        ) : (
                             <ImageUpload 
                                onUploadSuccess={handleUploadSuccess} 
                                storagePath={`ownership-proofs/${currentUserId}`} 
                                disabled={!currentUserId}
                             />
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function BikeDetailsPageClient({ user, bike: initialBike }: { user: User; bike: Bike }) {
  const [bike, setBike] = useState<Bike>(initialBike);
  const [isEditing, setIsEditing] = useState(false);

  const handleUpdateSuccess = async () => {
    setIsEditing(false);
    window.location.reload(); 
  }

  const formattedValue = bike.appraisedValue 
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(bike.appraisedValue) 
    : null;

  const isTransferable = bike.status === 'safe' || bike.status === 'recovered';

  return (
    <div className="container py-6 md:py-8">
      <div className="mb-6 flex flex-col sm:flex-row items-center justify-between px-4 sm:px-0 gap-4">
        <Button asChild variant="outline" className="w-full sm:w-auto hover:bg-primary hover:text-primary-foreground">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Garaje
          </Link>
        </Button>
        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
            <Button variant="secondary" onClick={() => setIsEditing(!isEditing)} className="w-full sm:w-auto">
              <Pencil className="mr-2 h-4 w-4" />
              {isEditing ? 'Cancelar Edición' : 'Editar Detalles'}
            </Button>
        </div>
      </div>

      {isEditing ? (
        <div className="max-w-2xl mx-auto px-4 sm:px-0">
            <BikeRegistrationForm userId={user.id} bike={bike} onSuccess={handleUpdateSuccess} />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto px-4 sm:px-0">
          <div>
            <Carousel className="w-full">
              <CarouselContent>
                {bike.photos.length > 0 ? bike.photos.map((photo, index) => (
                  <CarouselItem key={index}>
                    <div className="aspect-video relative rounded-lg overflow-hidden border">
                      <Image src={photo} alt={`Foto de la bicicleta ${index + 1}`} fill className="object-cover" />
                    </div>
                  </CarouselItem>
                )) : (
                  <CarouselItem>
                      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                          <p className="text-muted-foreground">No hay fotos disponibles</p>
                      </div>
                  </CarouselItem>
                )}
              </CarouselContent>
              {bike.photos.length > 1 && <>
                  <CarouselPrevious className="ml-12 sm:ml-16" />
                  <CarouselNext className="mr-12 sm:mr-16" />
              </>}
            </Carousel>
          </div>
          <div className="space-y-6">
              <Card>
                  <CardHeader>
                      <CardTitle className="text-3xl">{bike.make} {bike.model}</CardTitle>
                      <CardDescription className="font-mono text-base pt-1">
                          {bike.serialNumber}
                      </CardDescription>
                      <div className="pt-2">
                        {/* --- CORRECTED BADGE LOGIC --- */}
                        <Badge className={cn(bikeStatusStyles[bike.status], "text-base")}>
                            Estado: {bikeStatusTexts[bike.status]}
                        </Badge>
                        {/* --- END CORRECTION --- */}
                      </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                      <DetailItem label="Marca" value={bike.make} />
                      <DetailItem label="Modelo" value={bike.model} />
                      <DetailItem label="Año Modelo" value={bike.modelYear} />
                      <DetailItem label="Color" value={bike.color} />
                      <DetailItem label="Modalidad" value={bike.modality} />
                      <DetailItem label="Valor Aproximado" value={formattedValue} />
                  </CardContent>
              </Card>

              <Card>
                  <CardHeader>
                      <CardTitle>Protege tu Bici con la Etiqueta QR</CardTitle>
                      <CardDescription>
                          Esta etiqueta es una protección activa y un disuasivo de robo. Descárgala, imprímela en papel autoadherible y colócala en un lugar visible del marco.
                      </CardDescription>
                  </CardHeader>
                  <CardContent>
                      <BikePDFDownloader bike={bike} />
                  </CardContent>
              </Card>

              <OwnershipProofSection bike={bike} />

              {bike.status === 'stolen' && bike.theftReport && (
                   <Card className="border-destructive">
                      <CardHeader>
                          <CardTitle className="text-destructive">Detalles del Reporte de Robo</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <DetailItem label="Fecha del Reporte" value={new Date(bike.theftReport.date).toLocaleDateString('es-MX', { timeZone: 'UTC' })} />
                            <DetailItem label="Hora del Reporte" value={bike.theftReport.time} />
                            <DetailItem label="País" value={bike.theftReport.country} />
                            <DetailItem label="Estado/Provincia" value={bike.theftReport.state} />
                            <DetailItem label="Ubicación" value={bike.theftReport.location} />
                          </div>
                          <DetailItem label="Detalles del robo" value={bike.theftReport.details} />
                      </CardContent>
                  </Card>
              )}

              <Card>
                  <CardHeader>
                      <CardTitle>Gestionar Estado de la Bicicleta</CardTitle>
                  </CardHeader>
                  <CardContent>
                      {bike.status === 'stolen' ? (
                          <RecoverBikeButton bikeId={bike.id} />
                      ) : (
                          <TheftReportForm bike={bike} />
                      )}
                  </CardContent>
              </Card>
              
              {isTransferable && (
                  <Card>
                      <CardHeader>
                          <CardTitle>Transferir Propiedad</CardTitle>
                          <CardDescription>
                              Transfiere el registro de esta bicicleta a otro usuario. 
                              El nuevo propietario debe tener una cuenta en la plataforma.
                          </CardDescription>
                      </CardHeader>
                      <CardContent>
                          <TransferOwnershipForm 
                              bikeId={bike.id} 
                              bikeName={`${bike.make} ${bike.model}`}
                          />
                      </CardContent>
                  </Card>
              )}
              
              <Card>
                  <CardHeader>
                      <CardTitle>Código QR de Registro</CardTitle>
                      <CardDescription>
                            Escanea o descarga este código QR para acceder rápidamente al perfil público de tu bicicleta.
                      </CardDescription>
                  </CardHeader>
                  <CardContent>
                      <QRCodeGenerator serialNumber={bike.serialNumber} />
                  </CardContent>
              </Card>
          </div>
        </div>
      )}
    </div>
  );
}
