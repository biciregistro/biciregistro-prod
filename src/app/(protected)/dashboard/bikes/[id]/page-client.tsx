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
import type { Bike, User, BikeStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pencil, FileDown, Loader2, MessageCircle, ShoppingCart, Zap, AlertCircle, ShieldAlert, Book, AlertTriangle, ShieldCheck, Lock } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  inventory: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

// Text mapping for the status badge
const bikeStatusTexts: { [key in BikeStatus]: string } = {
  safe: 'En Regla',
  stolen: 'Robada',
  in_transfer: 'En Transferencia',
  recovered: 'Recuperada',
  inventory: 'En Inventario',
};

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
    if (!value && value !== 0) return null;
    return (
        <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-base font-semibold">{value}</p>
        </div>
    );
}

/**
 * Componente para mostrar un estado bloqueado elegante cuando falta el número de serie
 */
function LockedFeatureCard({ title, description, onAction }: { title: string, description: string, onAction: () => void }) {
    return (
        <Card className="border-dashed bg-muted/30">
            <CardContent className="pt-6 text-center space-y-4">
                <div className="bg-background w-12 h-12 rounded-full flex items-center justify-center mx-auto shadow-sm border">
                    <Lock className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                    <h3 className="font-bold text-lg">{title}</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        {description}
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={onAction} className="gap-2">
                    <Pencil className="w-4 h-4" /> Agregar Número de Serie
                </Button>
            </CardContent>
        </Card>
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
        <Card id="tour-bike-ownership" className="overflow-hidden border-primary/10">
            <CardHeader className="bg-primary/5 pb-4">
                <CardTitle className="text-lg">Factura / Ticket de Compra</CardTitle>
                <CardDescription>Respalda legalmente la propiedad de tu unidad. Este documento es privado.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                {bike.ownershipProof ? (
                    <div className="flex flex-col gap-3">
                         <Badge variant="outline" className="w-fit bg-green-50 text-green-700 border-green-200 gap-1.5 py-1 px-3">
                            <ShieldCheck className="w-4 h-4" /> Documento Cargado
                        </Badge>
                        <Button asChild variant="secondary" className="w-full justify-center font-bold">
                            <a href={bike.ownershipProof} target="_blank" rel="noopener noreferrer">
                                <FileDown className="mr-2 h-4 w-4" />
                                Ver Documento Actual
                            </a>
                        </Button>
                    </div>
                ) : (
                    <div className="text-center">
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

export default function BikeDetailsPageClient({ user, bike: initialBike, insuranceRequest }: { user: User; bike: Bike; insuranceRequest: any | null }) {
  const [bike, setBike] = useState<Bike>(initialBike);
  const searchParams = useSearchParams();
  const editParam = searchParams.get('edit');
  const [isEditing, setIsEditing] = useState(editParam === 'true');

  const handleUpdateSuccess = async () => {
    setIsEditing(false);
    window.location.href = `/dashboard/bikes/${bike.id}`;
  }

  const formattedValue = bike.appraisedValue 
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(bike.appraisedValue) 
    : null;

  const formattedReward = bike.theftReport?.reward
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(bike.theftReport.reward))
    : null;

  const isTransferable = bike.status === 'safe' || bike.status === 'recovered' || bike.status === 'inventory';
  const isPendingSerial = bike.serialNumber.startsWith('PENDING_');

  const backUrl = user.role === 'ong' ? '/dashboard/ong?tab=garage' : '/dashboard';
  const mercadoLibreUrl = "https://articulo.mercadolibre.com.mx/MLM-4837649934-bikon-otag-doble-localizador-para-bicicleta-_JM";

  return (
    <div className="w-full py-6 md:py-8">
      {/* HEADER SECTION - Hidden on mobile entirely, visible on Desktop */}
      {!isEditing && (
          <div className="mb-6 hidden md:flex flex-col sm:flex-row items-center justify-between gap-4">
            <Button asChild variant="ghost" className="w-full sm:w-auto -ml-2 text-muted-foreground hover:text-primary transition-colors">
              <Link href={backUrl}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Garaje
              </Link>
            </Button>
            <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
                {bike.status === 'stolen' && (
                    <BikeTheftShareMenu bike={bike} user={user} />
                )}
            </div>
          </div>
      )}

      {isEditing ? (
        <div className="max-w-2xl mx-auto">
            <div className="mb-4">
                <Button variant="ghost" onClick={() => setIsEditing(false)} className="gap-2 text-muted-foreground">
                    <ArrowLeft className="h-4 w-4" /> Cancelar Edición
                </Button>
            </div>
            <BikeRegistrationForm userId={user.id} bike={bike} onSuccess={handleUpdateSuccess} />
        </div>
      ) : (
        <div className="space-y-8">
            {/* PENDING SERIAL BANNER - GLOBAL */}
            {isPendingSerial && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 text-amber-900 shadow-sm animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="flex items-start gap-4">
                        <div className="bg-amber-100 p-2 rounded-lg shrink-0">
                            <Zap className="w-6 h-6 text-amber-600 animate-pulse" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-black uppercase tracking-tight text-sm md:text-base mb-1 text-amber-900">Registro Incompleto (Express)</h3>
                            <p className="text-xs md:text-sm text-amber-800/90 leading-relaxed font-medium">
                                Para descargar tu Certificado Oficial Antirrobo y activar la protección de las autoridades, <span className="font-bold underline underline-offset-2 text-amber-950">es indispensable que agregues el número de serie</span> de tu unidad.
                            </p>
                        </div>
                        <Button onClick={() => setIsEditing(true)} size="sm" className="bg-amber-500 hover:bg-amber-600 text-white font-bold shrink-0 hidden md:flex">
                            Registrar Serie
                        </Button>
                    </div>
                    <Button onClick={() => setIsEditing(true)} size="sm" className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold mt-3 md:hidden">
                        Registrar Serie Ahora
                    </Button>
                </div>
            )}

            <Tabs defaultValue="passport" className="w-full">
                <div className="mb-6">
                    {/* TabsList style matching Profile */}
                    <TabsList className="grid grid-cols-3 h-14 bg-muted/30 p-1 mb-8 rounded-xl border border-border/50">
                        <TabsTrigger value="passport" className="flex flex-col gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-lg py-2 transition-all">
                            <Book className="w-4 h-4" /> 
                            <span className="text-[10px] sm:text-xs font-bold">Pasaporte</span>
                        </TabsTrigger>
                        <TabsTrigger value="emergency" className="flex flex-col gap-1 data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-2 transition-all">
                            <AlertTriangle className="w-4 h-4" /> 
                            <span className="text-[10px] sm:text-xs font-bold">Emergencia</span>
                        </TabsTrigger>
                        <TabsTrigger value="shield" className="flex flex-col gap-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-2 transition-all">
                            <ShieldCheck className="w-4 h-4" /> 
                            <span className="text-[10px] sm:text-xs font-bold">Blindaje</span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* TAB 1: PASAPORTE (IDENTIDAD Y PROPIEDAD) */}
                <TabsContent value="passport" className="space-y-6 focus-visible:outline-none animate-in fade-in duration-300">
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* LEFT COLUMN: PHOTOS & DOCUMENTS & TRANSFER */}
                        <div className="space-y-6">
                            {/* PHOTOS SECTION */}
                            <div className="space-y-4">
                                <Carousel className="w-full">
                                    <CarouselContent>
                                        {bike.photos.length > 0 ? bike.photos.map((photo, index) => (
                                        <CarouselItem key={index}>
                                            <div className="aspect-video relative rounded-2xl overflow-hidden border shadow-sm">
                                            <Image src={photo} alt={`Foto de la bicicleta ${index + 1}`} fill className="object-cover" />
                                            </div>
                                        </CarouselItem>
                                        )) : (
                                        <CarouselItem>
                                            <div className="aspect-video bg-muted/40 rounded-2xl flex items-center justify-center border-2 border-dashed border-muted-foreground/20">
                                                <p className="text-muted-foreground font-medium">Sin fotografías cargadas</p>
                                            </div>
                                        </CarouselItem>
                                        )}
                                    </CarouselContent>
                                    {bike.photos.length > 1 && <>
                                        <CarouselPrevious className="hidden md:flex ml-12" />
                                        <CarouselNext className="hidden md:flex mr-12" />
                                    </>}
                                </Carousel>
                                <div className="flex justify-center gap-1.5">
                                    {bike.photos.map((_, i) => (
                                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/20" />
                                    ))}
                                </div>
                            </div>

                            {/* INVOICE SECTION (Moved from Right to Left) */}
                            <OwnershipProofSection bike={bike} />

                            {/* TRANSFER SECTION (Moved from Right to Left) */}
                            {isTransferable && (
                                !isPendingSerial ? (
                                    <Card className="border-muted-foreground/10 bg-muted/5">
                                        <CardHeader className="pb-4">
                                            <CardTitle className="text-lg">Transferir o Vender</CardTitle>
                                            <CardDescription>
                                                Cede la propiedad digital a otro usuario de BiciRegistro.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <TransferOwnershipForm 
                                                bikeId={bike.id} 
                                                bikeName={`${bike.make} ${bike.model}`}
                                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                            />
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <LockedFeatureCard 
                                        title="Pasaporte - Transferencia" 
                                        description="No puedes transferir una unidad sin número de serie registrado."
                                        onAction={() => setIsEditing(true)}
                                    />
                                )
                            )}
                        </div>

                        {/* RIGHT COLUMN: INFO & CERTIFICATE */}
                        <div className="space-y-6">
                            {/* INFO & DOCS SECTION */}
                            <Card className="border-primary/10 shadow-sm overflow-hidden">
                                <CardHeader className="pb-4 border-b border-muted/50 mb-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-2xl font-black uppercase tracking-tight">{bike.make} {bike.model}</CardTitle>
                                            <CardDescription className="font-mono text-sm mt-1">
                                                {isPendingSerial ? 'S/N: PENDIENTE DE REGISTRO' : `S/N: ${bike.serialNumber}`}
                                            </CardDescription>
                                        </div>
                                        <Badge className={cn(bikeStatusStyles[bike.status], "font-bold uppercase tracking-wider text-[10px]")}>
                                            {bikeStatusTexts[bike.status]}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-0">
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                                        <DetailItem label="Marca" value={bike.make} />
                                        <DetailItem label="Modelo" value={bike.model} />
                                        <DetailItem label="Año" value={bike.modelYear} />
                                        <DetailItem label="Color" value={bike.color} />
                                        <DetailItem label="Modalidad" value={bike.modality} />
                                        <DetailItem label="Valor Estimado" value={formattedValue} />
                                    </div>
                                    
                                    <div className="pt-4 border-t border-muted/50">
                                        <Button 
                                            variant="outline" 
                                            onClick={() => setIsEditing(true)} 
                                            className="w-full border-primary/20 hover:bg-primary/5 gap-2 font-bold"
                                        >
                                            <Pencil className="h-4 w-4" /> Editar Información
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* CERTIFICATE SECTION */}
                            {!isPendingSerial ? (
                                <Card className="border-primary/20 bg-primary/[0.02] shadow-sm">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <ShieldCheck className="w-5 h-5 text-primary" /> Certificado de Propiedad
                                        </CardTitle>
                                        <CardDescription>Avala la propiedad legal de tu unidad ante terceros y autoridades.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-3">
                                        <BikeOwnershipCertificate 
                                            bike={bike} 
                                            user={user} 
                                            className="bg-blue-600 hover:bg-blue-700 text-white border-0 font-bold shadow-md" 
                                        />
                                    </CardContent>
                                </Card>
                            ) : (
                                <LockedFeatureCard 
                                    title="Pasaporte - Certificado" 
                                    description="Para generar tu certificado oficial con validez jurídica, es necesario asignar el número de serie."
                                    onAction={() => setIsEditing(true)}
                                />
                            )}
                        </div>
                    </div>
                </TabsContent>

                {/* TAB 2: EMERGENCIA (ROBO Y QR) */}
                <TabsContent value="emergency" className="space-y-6 focus-visible:outline-none animate-in fade-in duration-300 px-4 sm:px-0">
                    <div className="max-w-3xl mx-auto space-y-6">
                        {/* THEFT REPORT STATUS OR FORM */}
                        {bike.status === 'stolen' && bike.theftReport ? (
                            <Card className="border-red-500 border-2 shadow-xl shadow-red-100 bg-red-50/30 overflow-hidden">
                                <div className="bg-red-600 text-white p-4 text-center font-black uppercase tracking-widest flex items-center justify-center gap-3">
                                    <AlertTriangle className="w-6 h-6 animate-pulse" /> ALERTA DE ROBO ACTIVA
                                </div>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-red-800">Detalles del Incidente</CardTitle>
                                        <BikeTheftShareMenu bike={bike} user={user} />
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-2">
                                    <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-red-100">
                                        <DetailItem label="Fecha" value={new Date(bike.theftReport.date).toLocaleDateString('es-MX', { timeZone: 'UTC' })} />
                                        <DetailItem label="Hora" value={bike.theftReport.time} />
                                        <DetailItem label="Ciudad" value={`${bike.theftReport.city}, ${bike.theftReport.state}`} />
                                        <DetailItem label="Recompensa" value={formattedReward || 'No especificada'} />
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border border-red-100">
                                        <DetailItem label="Relato de los hechos" value={bike.theftReport.details} />
                                    </div>
                                    <RecoverBikeButton bikeId={bike.id} />
                                </CardContent>
                            </Card>
                        ) : (
                            !isPendingSerial ? (
                                <Card className="border-red-200">
                                    <CardHeader className="bg-red-50/50 pb-4">
                                        <CardTitle className="text-red-700 flex items-center gap-2">
                                            <AlertTriangle className="w-6 h-6" /> Reportar Robo
                                        </CardTitle>
                                        <CardDescription>Inicia el protocolo de búsqueda y notifica a las autoridades y comunidad.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <TheftReportForm bike={bike} />
                                    </CardContent>
                                </Card>
                            ) : (
                                <LockedFeatureCard 
                                    title="Emergencia - Reporte" 
                                    description="Para generar un reporte oficial válido ante el Ministerio Público, tu unidad debe tener su número de serie registrado."
                                    onAction={() => setIsEditing(true)}
                                />
                            )
                        )}

                        {/* EMERGENCY QR SECTION - DISSUASIVE LABEL */}
                        {!isPendingSerial ? (
                            <Card className="border-amber-200 shadow-sm overflow-hidden">
                                <CardHeader className="pb-4 bg-amber-50/50">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <ShieldAlert className="w-5 h-5 text-amber-600" /> Etiqueta Disuasiva QR
                                    </CardTitle>
                                    <CardDescription className="text-amber-900 font-medium">
                                        Descarga esta etiqueta disuasiva, imprímela y pegala en tu bicicleta en un lugar visible. Al estar visible le decimos al ladrón: <span className="italic">"Esta bicicleta está registrada y va a ser difícil venderla"</span>.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-6">
                                    <div className="hidden md:block border p-4 rounded-xl bg-white shadow-inner">
                                        <QRCodeGenerator serialNumber={bike.serialNumber} />
                                    </div>
                                    <BikePDFDownloader 
                                        bike={bike} 
                                        label="Descargar etiqueta disuasiva"
                                        className="bg-yellow-400 hover:bg-yellow-500 text-black font-black border-2 border-yellow-500 shadow-md h-12 text-base" 
                                    />
                                </CardContent>
                            </Card>
                        ) : (
                            <LockedFeatureCard 
                                title="Emergencia - Etiqueta Disuasiva" 
                                description="La etiqueta disuasiva se genera a partir de tu número de serie para garantizar la identidad de la unidad."
                                onAction={() => setIsEditing(true)}
                            />
                        )}
                    </div>
                </TabsContent>

                {/* TAB 3: BLINDAJE (SEGURO Y BIKON) */}
                <TabsContent value="shield" className="space-y-6 focus-visible:outline-none animate-in fade-in duration-300 px-4 sm:px-0">
                    <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
                        {/* INSURANCE COMPONENT */}
                        {!isPendingSerial ? (
                             <InsuranceCard bike={bike} user={user} insuranceRequest={insuranceRequest} />
                        ) : (
                            <LockedFeatureCard 
                                title="Blindaje - Seguros" 
                                description="Las aseguradoras requieren validar el número de serie oficial para emitir una póliza de protección."
                                onAction={() => setIsEditing(true)}
                            />
                        )}

                        {/* BIKON COMPONENT */}
                        {!isPendingSerial ? (
                            <Card id="tour-bike-bikon" className="border-primary/20 shadow-sm overflow-hidden flex flex-col h-full">
                                <div className="bg-primary/5 p-4 border-b border-primary/10">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-black uppercase tracking-tight text-base flex items-center gap-2 text-blue-700">
                                            Localización GPS
                                        </h3>
                                        <Badge className="bg-blue-600 text-white border-0 shadow-sm px-3 py-0.5 text-[10px] font-bold uppercase">
                                            Bikon
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-snug">
                                        Rastreo en tiempo real con la red de <span className="font-bold">Google y Apple</span>. Privacidad absoluta garantizada.
                                    </p>
                                </div>
                                <CardContent className="pt-6 space-y-4 flex-1 flex flex-col justify-between">
                                    <BikonLinker bike={bike} userId={user.id} />
                                    
                                    {!bike.bikonId && (
                                        <div className="space-y-4">
                                            <div className="relative">
                                                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                                                <div className="relative flex justify-center text-[10px] uppercase font-bold text-muted-foreground">
                                                    <span className="bg-background px-2">¿Aún no tienes uno?</span>
                                                </div>
                                            </div>
                                            <Button variant="secondary" className="w-full gap-2 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 font-bold" asChild>
                                                <a href={mercadoLibreUrl} target="_blank" rel="noopener noreferrer">
                                                    <ShoppingCart className="h-4 w-4" />
                                                    Adquirir Rastreador Bikon
                                                </a>
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            <LockedFeatureCard 
                                title="Blindaje - Rastreador GPS" 
                                description="Vincula un localizador físico a la identidad digital de tu bicicleta para máxima protección."
                                onAction={() => setIsEditing(true)}
                            />
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
      )}
      
      <OnboardingTour user={user} tourType="bike" bike={bike} />
    </div>
  );
}
