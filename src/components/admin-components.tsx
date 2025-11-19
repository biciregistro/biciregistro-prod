'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { updateHomepageSection, updateFeatureItem, createOngUser } from '@/lib/actions';
import type { HomepageSection, Feature, User, OngUser, ActionFormState } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from './shared/image-upload';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Search, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


function SubmitButton({ text = "Guardar Cambios" }: { text?: string }) {
    const { pending } = useFormStatus();
    return <Button type="submit" disabled={pending}>{pending ? 'Guardando...' : text}</Button>;
}

// Universal form for sections like Hero and CTA
function SectionEditForm({ section }: { section: HomepageSection }) {
    const [state, formAction] = useActionState(updateHomepageSection, null as ActionFormState);
    const { toast } = useToast();
    
    // Safely access imageUrl only if it exists on the section type
    const initialImageUrl = 'imageUrl' in section ? section.imageUrl : '';
    const [imageUrl, setImageUrl] = useState(initialImageUrl || '');

    useEffect(() => {
        if (state?.message) {
            toast({ title: "Éxito", description: state.message });
        }
        if (state?.error) {
            toast({ variant: 'destructive', title: "Error", description: state.error });
        }
    }, [state, toast]);

    const hasButtonText = 'buttonText' in section;
    const hasImage = 'imageUrl' in section;

    const getImageGuidelines = () => {
        if (section.id === 'hero') return "Recomendado: 1920x1080px";
        return "Recomendado: 1280x720px";
    };

    return (
        <form action={formAction} className="space-y-6">
            <input type="hidden" name="id" value={section.id} />
            {hasImage && <input type="hidden" name="imageUrl" value={imageUrl} />}

            <div className="space-y-2">
                <Label htmlFor={`title-${section.id}`}>Título</Label>
                <Input id={`title-${section.id}`} name="title" defaultValue={section.title} />
            </div>
            <div className="space-y-2">
                <Label htmlFor={`subtitle-${section.id}`}>Subtítulo</Label>
                <Textarea id={`subtitle-${section.id}`} name="subtitle" defaultValue={section.subtitle} rows={4} />
            </div>
            {hasButtonText && (
                <div className="space-y-2">
                    <Label htmlFor={`buttonText-${section.id}`}>Texto del Botón</Label>
                    <Input id={`buttonText-${section.id}`} name="buttonText" defaultValue={section.buttonText} />
                </div>
            )}
            {hasImage && (
                 <div className="space-y-2">
                    <Label>Imagen de Fondo</Label>
                    <div className="p-4 border rounded-md bg-muted/40">
                        <ImageUpload 
                            storagePath={`homepage/${section.id}`}
                            onUploadSuccess={setImageUrl}
                            guidelinesText={getImageGuidelines()}
                        />
                        {imageUrl && <p className="text-xs text-muted-foreground mt-2">URL actual: {imageUrl}</p>}
                    </div>
                </div>
            )}
            <SubmitButton />
        </form>
    );
}

// Specific form for a single feature item
function FeatureItemEditForm({ feature, featureId }: { feature: Feature, featureId: string }) {
    const [state, formAction] = useActionState(updateFeatureItem, null as ActionFormState);
    const { toast } = useToast();
    const [imageUrl, setImageUrl] = useState(feature.imageUrl || '');

    useEffect(() => {
        if (state?.message) {
            toast({ title: "Éxito", description: state.message });
        }
        if (state?.error) {
            toast({ variant: 'destructive', title: "Error", description: state.error });
        }
    }, [state, toast]);

    return (
        <form action={formAction} className="p-4 border rounded-lg space-y-4 bg-muted/20">
            <input type="hidden" name="featureId" value={featureId} />
            <input type="hidden" name="imageUrl" value={imageUrl} />
            <div className="space-y-2">
                <Label>Título de Característica</Label>
                <Input name="title" defaultValue={feature.title} />
            </div>
            <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea name="description" defaultValue={feature.description} />
            </div>
             <div className="space-y-2">
                <Label>Ícono / Imagen</Label>
                <div className="p-4 border rounded-md bg-background">
                    <ImageUpload 
                        storagePath="homepage/features"
                        onUploadSuccess={setImageUrl}
                        guidelinesText="Recomendado: 800x800px"
                    />
                     {imageUrl && <p className="text-xs text-muted-foreground mt-2">URL actual: {imageUrl}</p>}
                </div>
            </div>
            <SubmitButton text="Guardar Característica" />
        </form>
    )
}

function MissingSectionWarning({ sectionName }: { sectionName: string }) {
    return (
        <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Error de Datos</AlertTitle>
            <AlertDescription>
                La sección &quot;{sectionName}&quot; no se pudo encontrar.
                Es posible que los datos no existan en la base de datos o que haya un problema al cargarlos.
                Contacta a un administrador para verificar la colección <code className="font-mono bg-muted px-1 rounded-sm">homepage</code> en Firestore.
            </AlertDescription>
        </Alert>
    );
}

// Main component orchestrating the tabs and forms
export function HomepageEditor({ sections }: { sections: HomepageSection[] }) {
    const heroSection = sections.find(s => s.id === 'hero');
    const featuresSection = sections.find(s => s.id === 'features');
    const ctaSection = sections.find(s => s.id === 'cta');
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Editor de Contenido de la Página Principal</CardTitle>
                <CardDescription>
                    Actualiza el contenido para las secciones de la página de inicio. Los cambios se reflejan inmediatamente.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="hero">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="hero">Sección Hero</TabsTrigger>
                        <TabsTrigger value="features">Características</TabsTrigger>
                        <TabsTrigger value="cta">Llamada a la Acción</TabsTrigger>
                    </TabsList>

                    <TabsContent value="hero" className="pt-6">
                        {heroSection ? <SectionEditForm section={heroSection} /> : <MissingSectionWarning sectionName="Hero" />}
                    </TabsContent>

                    <TabsContent value="features" className="pt-6">
                        {featuresSection ? (
                            <>
                                <SectionEditForm section={featuresSection} />
                                <div className="my-6 border-t" />
                                <div className="space-y-6">
                                    <h3 className="text-lg font-semibold tracking-tight">
                                        Características Individuales
                                    </h3>
                                    {featuresSection.features?.map((feature: any, index: number) => (
                                       <FeatureItemEditForm key={feature.id || index} feature={feature} featureId={feature.id} />
                                    ))}
                                </div>
                            </>
                        ) : <MissingSectionWarning sectionName="Features" />}
                    </TabsContent>

                    <TabsContent value="cta" className="pt-6">
                         {ctaSection ? <SectionEditForm section={ctaSection} /> : <MissingSectionWarning sectionName="Call to Action (CTA)" />}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

function UserSearch() {
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get('query') || '';

  return (
    <form method="GET" className="flex items-center gap-2 mb-6">
      <Input
        type="search"
        name="query"
        placeholder="Buscar por email..."
        defaultValue={currentQuery}
        className="flex-grow"
      />
      <Button type="submit">
        <Search className="h-4 w-4 mr-2" />
        Buscar
      </Button>
      {currentQuery && (
        <Link href="/admin/users">
          <Button variant="outline">
            <X className="h-4 w-4 mr-2" />
            Limpiar
          </Button>
        </Link>
      )}
    </form>
  );
}

export function UsersTable({ users, nextPageToken }: { users: User[], nextPageToken?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuarios Registrados</CardTitle>
        <CardDescription>
          Lista de todos los usuarios registrados en la plataforma.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <UserSearch />
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Apellidos</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.lastName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No se encontraron usuarios.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export function OngCreationForm() {
  const [state, formAction] = useActionState(createOngUser, null);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.error) {
      toast({ variant: 'destructive', title: 'Error', description: state.error });
    }
  }, [state, toast]);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="organizationName">Nombre de la Organización</Label>
          <Input id="organizationName" name="organizationName" required />
          {state?.errors?.organizationName && <p className="text-destructive text-sm">{state.errors.organizationName[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactPerson">Persona de Contacto</Label>
          <Input id="contactPerson" name="contactPerson" required />
          {state?.errors?.contactPerson && <p className="text-destructive text-sm">{state.errors.contactPerson[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email de la Organización</Label>
          <Input id="email" name="email" type="email" required />
           {state?.errors?.email && <p className="text-destructive text-sm">{state.errors.email[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña Inicial</Label>
          <Input id="password" name="password" type="password" required />
           {state?.errors?.password && <p className="text-destructive text-sm">{state.errors.password[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="organizationWhatsapp">WhatsApp de la Organización</Label>
          <Input id="organizationWhatsapp" name="organizationWhatsapp" type="tel" required />
           {state?.errors?.organizationWhatsapp && <p className="text-destructive text-sm">{state.errors.organizationWhatsapp[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactWhatsapp">WhatsApp del Contacto</Label>
          <Input id="contactWhatsapp" name="contactWhatsapp" type="tel" required />
           {state?.errors?.contactWhatsapp && <p className="text-destructive text-sm">{state.errors.contactWhatsapp[0]}</p>}
        </div>
         <div className="space-y-2">
          <Label htmlFor="country">País</Label>
          <Input id="country" name="country" required />
           {state?.errors?.country && <p className="text-destructive text-sm">{state.errors.country[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">Estado/Provincia</Label>
          <Input id="state" name="state" required />
           {state?.errors?.state && <p className="text-destructive text-sm">{state.errors.state[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="websiteUrl">Página Web (Opcional)</Label>
          <Input id="websiteUrl" name="websiteUrl" />
           {state?.errors?.websiteUrl && <p className="text-destructive text-sm">{state.errors.websiteUrl[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="instagramUrl">Instagram (Opcional)</Label>
          <Input id="instagramUrl" name="instagramUrl" />
           {state?.errors?.instagramUrl && <p className="text-destructive text-sm">{state.errors.instagramUrl[0]}</p>}
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="facebookUrl">Facebook (Opcional)</Label>
          <Input id="facebookUrl" name="facebookUrl" />
           {state?.errors?.facebookUrl && <p className="text-destructive text-sm">{state.errors.facebookUrl[0]}</p>}
        </div>
      </div>
      <SubmitButton text="Crear Usuario ONG" />
    </form>
  );
}

export function OngUsersTable({ ongs }: { ongs: OngUser[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ONGs / Colectivos Registrados</CardTitle>
        <CardDescription>
          Lista de todas las organizaciones registradas en la plataforma.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre de la Organización</TableHead>
                <TableHead>Persona de Contacto</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Ubicación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ongs.length > 0 ? (
                ongs.map((ong) => (
                  <TableRow key={ong.id}>
                    <TableCell className="font-medium">{ong.organizationName}</TableCell>
                    <TableCell>{ong.contactPerson}</TableCell>
                    <TableCell>{ong.email}</TableCell>
                    <TableCell>{ong.state}, {ong.country}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No se encontraron ONGs.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
