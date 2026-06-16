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
import { ArrowLeft, Pencil, FileDown, Loader2, MessageCircle, ShoppingCart, Zap, AlertCircle, ShieldAlert, Book, AlertTriangle, ShieldCheck, Lock, Settings2, Target, RefreshCw } from 'lucide-react';
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
import { PromotionalBanner } from '@/components/dashboard/promotional-banner';

// NUEVO: Importación del Wizard de Componentes y Completeness Tracker
import { BikeComponentsWizard } from '@/components/bike-components/bike-components-wizard';
import { CompletenessTracker, getBikeCompleteness } from '@/components/bike-components/completeness-tracker';
import { COMPONENT_CATALOG, ComponentCategoryKey } from '@/lib/constants/bike-components';

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
 * Renderiza la Cuadrícula de Componentes en la Ficha Técnica (Pasaporte)
 */
function BikeTechSpecs({ bike, onUpdateClick }: { bike: Bike, onUpdateClick: () => void }) {
    const hasComponents = bike.frameMaterial || (bike.components && Object.keys(bike.components).length > 0);
    
    if (!hasComponents) {
        return (
            <div className="bg-muted/30 border border-dashed border-border p-6 rounded-xl text-center space-y-3 mt-6">
                <Settings2 className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
                <div className="space-y-1">
                    <p className="font-bold text-foreground">Añade los Componentes</p>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        Registra la transmisión, suspensión y más detalles para completar el ADN de tu máquina.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={onUpdateClick} className="mt-2 text-xs">
                    Completar ADN Ahora
                </Button>
            </div>
        );
    }

    const renderSpec = (label: string, category: ComponentCategoryKey) => {
        const comp = bike.components?.[category];
        if (!comp) return null;
        let displayValue = '';
        if (comp.isNotApplicable) displayValue = 'No Aplica';
        else if (comp.isGeneric) displayValue = 'Genérico';
        else if (comp.brand) displayValue = `${comp.brand} ${comp.model && comp.model !== 'Standard' ? comp.model : ''}`.trim();
        
        if (!displayValue) return null;
        return <DetailItem label={label} value={displayValue} />;
    };

    return (
        <div className="mt-6 pt-6 border-t border-border/50">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-black uppercase tracking-tight text-foreground/80 flex items-center gap-2">
                    <Settings2 className="w-4 h-4" /> Ficha Técnica
                </h4>
                <Button variant="ghost" size="sm" onClick={onUpdateClick} className="text-xs h-7 text-muted-foreground hover:text-primary">
                    <Pencil className="w-3 h-3 mr-1" /> Editar
                </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                {bike.frameMaterial && <DetailItem label="Cuadro" value={bike.frameMaterial} />}
                {renderSpec('Transmisión', 'drivetrain')}
                {renderSpec('Suspensión Del.', 'fork')}
                {renderSpec('Suspensión Tras.', 'shock')}
                {renderSpec('Frenos', 'brakes')}
                {renderSpec('Llantas', 'tires')}
                {renderSpec('Motor E-Bike', 'motor')}
                {renderSpec('Sillín (Asiento)', 'saddle')}
                {renderSpec('Puños (Grips)', 'grips')}
                {renderSpec('Pedales', 'pedals')}
            </div>
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
    const [isReplacing, setIsReplacing] = useState(false);
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
                    setIsReplacing(false);
                    router.refresh();
                } else {
                    toast({
                        title: "Documento Rechazado",
                        description: result.error || "El documento no cumple con los requisitos para ser válido.",
                        variant: "destructive",
                    });
                }
            } catch (error) {
                toast({
                    title: "Error",
                    description: "No se pudo procesar el documento. Por favor, inténtalo de nuevo.",
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
                {bike.ownershipProof && !isReplacing ? (
                    <div className="flex flex-col gap-3">
                         <div className="flex items-center justify-between">
                            <Badge variant="outline" className="w-fit bg-green-50 text-green-700 border-green-200 gap-1.5 py-1 px-3">
                                <ShieldCheck className="w-4 h-4" /> Documento Cargado
                            </Badge>
                         </div>
                        <Button asChild variant="secondary" className="w-full justify-center font-bold">
                            <a href={bike.ownershipProof} target="_blank" rel="noopener noreferrer">
                                <FileDown className="mr-2 h-4 w-4" />
                                Ver Documento Actual
                            </a>
                        </Button>
                        <div className="mt-2 text-center">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setIsReplacing(true)}
                                className="text-xs text-muted-foreground hover:text-primary gap-1"
                            >
                                <RefreshCw className="w-3 h-3" /> ¿Subiste el archivo incorrecto? Actualizar
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center space-y-4">
                        {bike.ownershipProof && isReplacing && (
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-amber-600">Reemplazando documento</span>
                                <Button variant="ghost" size="sm" onClick={() => setIsReplacing(false)} className="h-6 text-xs">Cancelar</Button>
                            </div>
                        )}
                        {isPending ? (
                             <Button disabled className="w-full bg-blue-600 text-white hover:bg-blue-700">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sprock está analizando tu documento...
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
  const tabParam = searchParams.get('tab');
  
  const [isEditing, setIsEditing] = useState(editParam === 'true');
  const [activeTab, setActiveTab] = useState<string>(tabParam || 'passport');

  // Hidratar estado reactivo cuando cambian las props del servidor (Evita pérdida de estado) - HU DEBUGIN
  useEffect(() => {
    setBike(initialBike);
  }, [initialBike]);

  // Evalua la completitud de forma reactiva (HU Algoritmo 100%)
  const metrics = getBikeCompleteness(bike);

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

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                    {/* TabsList ampliado a 4 columnas con scroll en móvil */}
                    <TabsList className="flex w-max min-w-full sm:grid sm:grid-cols-4 h-14 bg-muted/30 p-1 rounded-xl border border-border/50">
                        <TabsTrigger value="passport" className="flex-1 flex-col gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-lg py-2 transition-all min-w-[90px]">
                            <Book className="w-4 h-4" /> 
                            <span className="text-[10px] sm:text-xs font-bold">Pasaporte</span>
                        </TabsTrigger>
                        <TabsTrigger value="components" className="flex-1 flex-col gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-lg py-2 transition-all min-w-[100px]">
                            <Settings2 className="w-4 h-4" /> 
                            <span className="text-[10px] sm:text-xs font-bold flex items-center gap-1">
                                Componentes
                                {!metrics.isVerified && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger value="emergency" className="flex-1 flex-col gap-1 data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-2 transition-all min-w-[90px]">
                            <AlertTriangle className="w-4 h-4" /> 
                            <span className="text-[10px] sm:text-xs font-bold">Emergencia</span>
                        </TabsTrigger>
                        <TabsTrigger value="shield" className="flex-1 flex-col gap-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-2 transition-all min-w-[90px]">
                            <ShieldCheck className="w-4 h-4" /> 
                            <span className="text-[10px] sm:text-xs font-bold">Blindaje</span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* TAB 1: PASAPORTE (IDENTIDAD Y PROPIEDAD) */}
                <TabsContent value="passport" className="space-y-6 focus-visible:outline-none animate-in fade-in duration-300">
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* LEFT COLUMN: PHOTOS & INFO */}
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

                            {/* ZIENGARNIK: TRACKER INYECTADO (HU 4) */}
                            {!isPendingSerial && (
                                <CompletenessTracker metrics={metrics} />
                            )}

                            {/* INFO & DOCS SECTION */}
                            <Card className="border-primary/10 shadow-sm overflow-hidden">
                                <CardHeader className="pb-4 border-b border-muted/50 mb-4">
                                    <div className="flex flex-col gap-3">
                                        {/* Row 1: Badges de Estado, Completitud y Verificación alineados en la misma línea */}
                                        <div className="flex justify-end gap-2 items-center flex-wrap">
                                            {/* Badge "Bicicleta Verificada" inyectado en el detalle de la bicicleta */}
                                            {metrics.isVerified && bike.status !== 'stolen' && (
                                                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-wider text-[10px] gap-1 shadow-sm border-0">
                                                    <ShieldCheck className="w-3.5 h-3.5" /> Bicicleta Verificada
                                                </Badge>
                                            )}
                                            <Badge className={cn("font-bold uppercase tracking-wider text-[10px]", 
                                                metrics.isVerified ? "bg-green-100 text-green-800 border-green-300" : "bg-orange-100 text-orange-800 border-orange-300"
                                            )} variant="outline">
                                                {metrics.percentage}% Perfil
                                            </Badge>
                                            <Badge className={cn(bikeStatusStyles[bike.status], "font-bold uppercase tracking-wider text-[10px]")}>
                                                {bikeStatusTexts[bike.status]}
                                            </Badge>
                                        </div>
                                        {/* Row 2: Título a ancho completo */}
                                        <div>
                                            <CardTitle className="text-2xl md:text-3xl font-black uppercase tracking-tight w-full break-words">
                                                {bike.make} {bike.model}
                                            </CardTitle>
                                            <CardDescription className="font-mono text-sm mt-1">
                                                {isPendingSerial ? 'S/N: PENDIENTE DE REGISTRO' : `S/N: ${bike.serialNumber}`}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    {/* SECCIÓN INFORMACIÓN BASE CON TITULO Y LAPIZ DE EDICIÓN ESTANDARIZADO (HCI UX) */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="text-sm font-black uppercase tracking-tight text-foreground/80 flex items-center gap-2">
                                                <Book className="w-4 h-4 text-primary" /> Información Base
                                            </h4>
                                            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="text-xs h-7 text-muted-foreground hover:text-primary">
                                                <Pencil className="w-3 h-3 mr-1" /> Editar
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-x-4 gap-y-6 bg-muted/10 p-4 rounded-xl border border-border/30">
                                            <DetailItem label="Año Modelo" value={bike.modelYear} />
                                            <DetailItem label="Color Principal" value={bike.color} />
                                            <DetailItem label="Modalidad" value={bike.modality} />
                                            <DetailItem label="Valor Estimado" value={formattedValue} />
                                        </div>
                                    </div>
                                    
                                    {/* Ficha Técnica Resumida */}
                                    <BikeTechSpecs bike={bike} onUpdateClick={() => setActiveTab('components')} />
                                </CardContent>
                            </Card>

                            {/* INJECTION OF CONTEXTUAL BANNER ON BIKE PASSPORT TAB */}
                            <div className="my-2">
                                <PromotionalBanner placement="bike_passport" userCountry={user.country} userState={user.state} />
                            </div>

                        </div>

                        {/* RIGHT COLUMN: CERTIFICATE, TRANSFER & INVOICE */}
                        <div className="space-y-6">
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

                             {/* INVOICE SECTION (Moved to right column to balance) */}
                             <OwnershipProofSection bike={bike} />

                            {/* TRANSFER SECTION */}
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
                    </div>
                </TabsContent>

                {/* TAB NUEVA: COMPONENTES (B2B) */}
                <TabsContent value="components" className="space-y-6 focus-visible:outline-none animate-in fade-in duration-300 px-0 sm:px-0">
                    <div className="max-w-2xl mx-auto">
                        <BikeComponentsWizard bike={bike} />
                    </div>
                </TabsContent>

                {/* TAB 3: EMERGENCIA (ROBO Y QR) */}
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

                {/* TAB 4: BLINDAJE (SEGURO Y BIKON) */}
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

                    {/* INJECTION OF CONTEXTUAL BANNER ON BIKE SHIELD TAB */}
                    <div className="max-w-4xl mx-auto mt-6">
                        <PromotionalBanner placement="bike_blindaje" userCountry={user.country} userState={user.state} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
      )}
      
      <OnboardingTour user={user} tourType="bike" bike={bike} />
    </div>
  );
}