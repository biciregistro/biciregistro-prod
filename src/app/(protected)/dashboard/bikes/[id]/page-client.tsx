'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useTransition, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { BikeRegistrationForm } from '@/components/bike-card';
import { TheftReportForm } from '@/components/bike-components/theft-report-form';
import { TransferOwnershipForm } from '@/components/bike-components/transfer-ownership-form';
import { cn } from '@/lib/utils';
import type { Bike, User, BikeStatus, InsuranceRequest } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pencil, FileDown, Loader2, MessageCircle, ShoppingCart, Zap, AlertCircle } from 'lucide-react';
import { ImageUpload } from '@/components/shared/image-upload';
import { updateOwnershipProof } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import QRCodeGenerator from '@/components/bike-components/qr-code-generator';
import { auth } from '@/lib/firebase/client';
import { RecoverBikeButton } from '@/components/bike-components/recover-bike-button';
import { BikeTheftShareMenu } from '@/components/dashboard/bike-theft-share-menu';
import { BikonLinker } from '@/components/bike-components/bikon-linker';
import { OnboardingTour } from '@/components/dashboard/onboarding-tour';
import { InsuranceCard } from '@/components/bike-components/insurance-card';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGamificationToast } from '@/hooks/use-gamification-toast';

// Dynamic import for PDF downloaders
const BikePDFDownloader = dynamic(
  () => import('@/components/bike-components/bike-pdf-downloader'),
  { 
    ssr: false,
    loading: () => <Button variant="default" disabled className="w-full"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cargando...</Button>
  }
);

const BikeOwnershipCertificate = dynamic(
  () => import('@/components/bike-components/bike-ownership-certificate'),
  { 
    ssr: false,
    loading: () => <Button variant="outline" disabled className="w-full"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cargando...</Button>
  }
);

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

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
    if (!value && value !== 0) return null;
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
    const { showRewardToast } = useGamificationToast();
    const router = useRouter();

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
                // Cast result to any because updateOwnershipProof returns { success: boolean, pointsAwarded?: number }
                // but typescript definition might be lagging in the imports
                const result = await updateOwnershipProof(bike.id, url) as any;
                
                if (result.success) {
                    if (result.pointsAwarded && result.pointsAwarded > 0) {
                        showRewardToast(result.pointsAwarded, "¡Documento blindado! Has aumentado la certeza jurídica de tu bicicleta.");
                    } else {
                        toast({
                            title: "Éxito",
                            description: "El documento de propiedad se ha cargado y guardado.",
                        });
                    }
                    router.refresh();
                }
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
        <Card id="tour-bike-ownership">
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

export default function BikeDetailsPageClient({ user, bike: initialBike, insuranceRequest }: { user: User; bike: Bike; insuranceRequest: InsuranceRequest | null }) {
  const [bike, setBike] = useState<Bike>(initialBike);
  const searchParams = useSearchParams();
  const editParam = searchParams.get('edit');
  
  // Si la URL trae ?edit=true, arrancamos directamente en modo edición
  const [isEditing, setIsEditing] = useState(editParam === 'true');

  const handleUpdateSuccess = async () => {
    setIsEditing(false);
    window.location.href = `/dashboard/bikes/${bike.id}`; // Hard refresh and remove query params
  }

  const formattedValue = bike.appraisedValue 
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(bike.appraisedValue) 
    : null;

  const formattedReward = bike.theftReport?.reward
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(bike.theftReport.reward))
    : null;

  const isTransferable = bike.status === 'safe' || bike.status === 'recovered';
  const isPendingSerial = bike.serialNumber.startsWith('PENDING_');

  const backUrl = user.role === 'ong' ? '/dashboard/ong?tab=garage' : '/dashboard';

  const mercadoLibreUrl = "https://articulo.mercadolibre.com.mx/MLM-4837649934-bikon-otag-doble-localizador-para-bicicleta-_JM";

  return (
    <div className="container py-6 md:py-8">
      <div className="mb-6 flex flex-col sm:flex-row items-center justify-between px-4 sm:px-0 gap-4">
        <Button asChild variant="outline" className="w-full sm:w-auto hover:bg-primary hover:text-primary-foreground">
          <Link href={backUrl}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Garaje
          </Link>
        </Button>
        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
            {bike.status === 'stolen' && (
                <BikeTheftShareMenu bike={bike} user={user} />
            )}
            <Button 
                id="tour-bike-edit"
                variant="secondary" 
                onClick={() => setIsEditing(!isEditing)} 
                className="w-full sm:w-auto"
            >
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
                      {isPendingSerial && index === 0 && (
                          <div className="absolute top-2 left-2 bg-amber-500/90 text-white text-[10px] md:text-xs font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1 backdrop-blur-sm z-10">
                              <Zap className="w-3 h-3 md:w-4 md:h-4 fill-current" /> Registro Express
                          </div>
                      )}
                    </div>
                  </CarouselItem>
                )) : (
                  <CarouselItem>
                      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center relative">
                          <p className="text-muted-foreground">No hay fotos disponibles</p>
                          {isPendingSerial && (
                              <div className="absolute top-2 left-2 bg-amber-500/90 text-white text-xs font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1 backdrop-blur-sm z-10">
                                  <Zap className="w-4 h-4 fill-current" /> Registro Express
                              </div>
                          )}
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
              <Card className={cn(isPendingSerial && "border-amber-300/50 shadow-md")}>
                  <CardHeader>
                      <CardTitle className="text-3xl">{bike.make} {bike.model}</CardTitle>
                      
                      {isPendingSerial ? (
                           <CardDescription className="font-medium text-amber-600 flex items-center gap-1.5 mt-1 text-base">
                               <AlertCircle className="w-5 h-5" /> Pendiente de registrar número de serie
                           </CardDescription>
                      ) : (
                          <CardDescription className="font-mono text-base pt-1">
                              {bike.serialNumber}
                          </CardDescription>
                      )}

                      <div className="pt-2">
                        <Badge className={cn(bikeStatusStyles[bike.status], "text-base")}>
                            Estado: {bikeStatusTexts[bike.status]}
                        </Badge>
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

              {/* Pending Serial Call to Action */}
              {isPendingSerial && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 text-amber-900 shadow-sm animate-in fade-in zoom-in duration-500">
                      <div className="flex items-start gap-3">
                          <div className="bg-amber-100 p-2 rounded-full shrink-0">
                              <Zap className="w-6 h-6 text-amber-600" />
                          </div>
                          <div className="flex-1">
                              <h3 className="font-bold text-lg mb-1">Completa tu registro</h3>
                              <p className="text-sm text-amber-800/90 mb-4 leading-relaxed">
                                  Tu bicicleta fue registrada de forma express. Para que el blindaje sea válido ante las autoridades y obtener tu Certificado Oficial Antirrobo, es indispensable que agregues el número de serie de tu bicicleta.
                              </p>
                              <Button onClick={() => setIsEditing(true)} className="bg-amber-500 hover:bg-amber-600 text-white shadow-md w-full sm:w-auto">
                                  <Pencil className="mr-2 h-4 w-4" /> Registrar Serie Ahora
                              </Button>
                          </div>
                      </div>
                  </div>
              )}

              {/* Insurance Card Module */}
              <InsuranceCard bike={bike} user={user} insuranceRequest={insuranceRequest} />

              {/* Bikon Tracker Component - Updated */}
              <Card id="tour-bike-bikon" className="border-primary/20 shadow-sm overflow-hidden">
                  <div className="bg-primary/5 p-4 border-b border-primary/10">
                      <div className="flex items-center justify-between mb-2">
                           <h3 className="font-semibold text-lg flex items-center gap-2">
                              Rastreador GPS
                           </h3>
                           <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-sm px-3 py-1 text-xs font-bold tracking-wide uppercase">
                              Bikon
                           </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-snug">
                          Localiza tu bicicleta en tiempo real con la red global de Google y Apple, <span className="font-bold text-foreground">sólo tú tendrás acceso a la ubicación de tu bicicleta.</span>
                      </p>
                  </div>
                  <CardContent className="pt-6 space-y-4">
                      <BikonLinker bike={bike} userId={user.id} />
                      
                      {!bike.bikonId && (
                          <div className="relative">
                              <div className="absolute inset-0 flex items-center">
                                  <span className="w-full border-t" />
                              </div>
                              <div className="relative flex justify-center text-xs uppercase">
                                  <span className="bg-background px-2 text-muted-foreground">¿Aún no tienes uno?</span>
                              </div>
                          </div>
                      )}

                      {!bike.bikonId && (
                          <Button variant="secondary" className="w-full gap-2 text-green-700 bg-green-50 hover:bg-green-100 border border-green-200" asChild>
                              <a href={mercadoLibreUrl} target="_blank" rel="noopener noreferrer">
                                  <ShoppingCart className="h-4 w-4" />
                                  Adquirir Rastreador Bikon
                              </a>
                          </Button>
                      )}
                  </CardContent>
              </Card>

              {/* Only show certificate download if serial is registered */}
              {!isPendingSerial && (
                  <Card id="tour-bike-certificate">
                      <CardHeader>
                          <CardTitle>Certificado y Etiqueta QR</CardTitle>
                          <CardDescription>
                              Documentación oficial para proteger y avalar la propiedad de tu bicicleta.
                          </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                          <BikePDFDownloader bike={bike} />
                          <BikeOwnershipCertificate bike={bike} user={user} />
                      </CardContent>
                  </Card>
              )}

              <OwnershipProofSection bike={bike} />

              {bike.status === 'stolen' && bike.theftReport && (
                   <Card className="border-destructive shadow-lg shadow-destructive/5">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0">
                          <div>
                            <CardTitle className="text-destructive">Detalles del Reporte de Robo</CardTitle>
                          </div>
                          <BikeTheftShareMenu bike={bike} user={user} />
                      </CardHeader>
                      <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <DetailItem label="Fecha del Reporte" value={new Date(bike.theftReport.date).toLocaleDateString('es-MX', { timeZone: 'UTC' })} />
                            <DetailItem label="Hora del Reporte" value={bike.theftReport.time} />
                            <DetailItem label="País" value={bike.theftReport.country} />
                            <DetailItem label="Estado/Provincia" value={bike.theftReport.state} />
                            <DetailItem label="Ubicación" value={bike.theftReport.location} />
                             {formattedReward && <DetailItem label="Recompensa" value={formattedReward} />}
                          </div>
                          <DetailItem label="Detalles del robo" value={bike.theftReport.details} />
                      </CardContent>
                  </Card>
              )}

              {/* Only allow theft report if serial is registered */}
              {!isPendingSerial && (
                  <Card id="tour-bike-report">
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
              )}
              
              {isTransferable && !isPendingSerial && (
                  <Card id="tour-bike-transfer">
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
              
              {/* Only show QR if serial is registered */}
              {!isPendingSerial && (
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
              )}
          </div>
        </div>
      )}
      
      <OnboardingTour user={user} tourType="bike" bike={bike} />
    </div>
  );
}
