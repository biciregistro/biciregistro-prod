'use client';

import { useActionState, useEffect, useState, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { updateHomepageSection, updateFeatureItem, createOngUser } from '@/lib/actions';
import type { HomepageSection, Feature, User, OngUser, ActionFormState } from '@/lib/types';
import { countries, type Country } from '@/lib/countries';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from './shared/image-upload';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Search, X, Copy, Check, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PasswordStrengthIndicator } from './user-components';


function SubmitButton({ text = "Guardar Cambios" }: { text?: string }) {
    const { pending } = useFormStatus();
    return <Button type="submit" disabled={pending}>{pending ? 'Guardando...' : text}</Button>;
}

// Universal form for sections like Hero and CTA
function SectionEditForm({ section }: { section: HomepageSection }) {
    const [state, formAction] = useActionState(updateHomepageSection, null as ActionFormState);
    const { toast } = useToast();
    
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
    // CORRECCIÓN: Permitir imagen explícitamente para 'hero' y 'cta'
    const hasImage = section.id === 'hero' || section.id === 'cta';

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
            
            {'subtitle' in section && (
                <div className="space-y-2">
                    <Label htmlFor={`subtitle-${section.id}`}>Subtítulo</Label>
                    <Textarea id={`subtitle-${section.id}`} name="subtitle" defaultValue={section.subtitle} rows={4} />
                </div>
            )}
            
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

// Allies (Sponsors) Edit Form
function AlliesEditForm({ section }: { section: Extract<HomepageSection, { id: 'allies' }> }) {
    const [state, formAction] = useActionState(updateHomepageSection, null as ActionFormState);
    const { toast } = useToast();
    const [sponsors, setSponsors] = useState(section.sponsors || []);

    useEffect(() => {
        if (state?.message) {
            toast({ title: "Éxito", description: state.message });
        }
        if (state?.error) {
            toast({ variant: 'destructive', title: "Error", description: state.error });
        }
    }, [state, toast]);

    const addSponsor = () => {
        setSponsors([...sponsors, { name: '', url: '' }]);
    };

    const removeSponsor = (index: number) => {
        const newSponsors = [...sponsors];
        newSponsors.splice(index, 1);
        setSponsors(newSponsors);
    };

    const updateSponsor = (index: number, field: 'name' | 'url', value: string) => {
        const newSponsors = [...sponsors];
        newSponsors[index] = { ...newSponsors[index], [field]: value };
        setSponsors(newSponsors);
    };

    return (
        <form action={formAction} className="space-y-6">
            <input type="hidden" name="id" value="allies" />
            <input type="hidden" name="sponsorsJson" value={JSON.stringify(sponsors)} />

            <div className="space-y-2">
                <Label htmlFor="title-allies">Título de la Sección</Label>
                <Input id="title-allies" name="title" defaultValue={section.title} />
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <Label>Lista de Aliados</Label>
                    <Button type="button" onClick={addSponsor} size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-2" /> Agregar Aliado
                    </Button>
                </div>
                
                <div className="space-y-4">
                    {sponsors.map((sponsor, index) => (
                        <Card key={index} className="p-4 relative">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => removeSponsor(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nombre del Aliado</Label>
                                    <Input 
                                        value={sponsor.name || ''} 
                                        onChange={(e) => updateSponsor(index, 'name', e.target.value)}
                                        placeholder="Ej. Gobierno de la Ciudad"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Logo</Label>
                                    <div className="flex items-center gap-4">
                                        {sponsor.url && (
                                            <div className="h-10 w-10 relative border rounded bg-muted/20 flex-shrink-0">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={sponsor.url} alt="Logo Preview" className="h-full w-full object-contain p-1" />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <ImageUpload 
                                                storagePath="homepage/allies"
                                                onUploadSuccess={(url) => updateSponsor(index, 'url', url)}
                                                buttonText={sponsor.url ? "Cambiar Logo" : "Subir Logo"}
                                                guidelinesText=""
                                            />
                                        </div>
                                    </div>
                                    <Input 
                                        type="hidden"
                                        value={sponsor.url} 
                                        name={`sponsor-url-${index}`}
                                    />
                                </div>
                            </div>
                        </Card>
                    ))}
                    {sponsors.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg">
                            No hay aliados configurados. Haz clic en "Agregar Aliado" para comenzar.
                        </p>
                    )}
                </div>
            </div>

            <SubmitButton text="Guardar Sección de Aliados" />
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
    const alliesSection = sections.find(s => s.id === 'allies');
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
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="hero">Sección Hero</TabsTrigger>
                        <TabsTrigger value="allies">Aliados</TabsTrigger>
                        <TabsTrigger value="features">Características</TabsTrigger>
                        <TabsTrigger value="cta">Llamada a la Acción</TabsTrigger>
                    </TabsList>

                    <TabsContent value="hero" className="pt-6">
                        {heroSection ? <SectionEditForm section={heroSection} /> : <MissingSectionWarning sectionName="Hero" />}
                    </TabsContent>
                    
                    <TabsContent value="allies" className="pt-6">
                         {alliesSection && alliesSection.id === 'allies' 
                            ? <AlliesEditForm section={alliesSection} /> 
                            : <MissingSectionWarning sectionName="Aliados (Allies)" />
                         }
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
  const currentTab = searchParams.get('tab');

  return (
    <form method="GET" className="flex items-center gap-2 mb-6">
      {currentTab && <input type="hidden" name="tab" value={currentTab} />}
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
        <Link href={currentTab ? `/admin?tab=${currentTab}` : '/admin'}>
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
  
  const [selectedCountry, setSelectedCountry] = useState<Country | undefined>();
  const [states, setStates] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState<string>('');
  
  // Password state for UI feedback
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);


  useEffect(() => {
    if (state?.error) {
      toast({ variant: 'destructive', title: 'Error', description: state.error });
    }
  }, [state, toast]);

  const handleCountryChange = (countryName: string) => {
    const country = countries.find(c => c.name === countryName);
    setSelectedCountry(country);
    setStates(country?.states || []);
    setSelectedState(''); // Reset state selection
  };

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="country" value={selectedCountry?.name || ''} />
      <input type="hidden" name="state" value={selectedState} />
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
        
        {/* Improved Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña Inicial</Label>
          <div className="relative">
              <Input 
                id="password" 
                name="password" 
                type={showPassword ? 'text' : 'password'} 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
              >
                  {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </Button>
          </div>
          <PasswordStrengthIndicator password={password} />
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
          <Label>País</Label>
          <Select onValueChange={handleCountryChange} required>
              <SelectTrigger>
                  <SelectValue placeholder="Selecciona un país" />
              </SelectTrigger>
              <SelectContent>
                  {countries.map(country => (
                      <SelectItem key={country.code} value={country.name}>{country.name}</SelectItem>
                  ))}
              </SelectContent>
          </Select>
           {state?.errors?.country && <p className="text-destructive text-sm">{state.errors.country[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label>Estado/Provincia</Label>
           <Select value={selectedState} onValueChange={setSelectedState} disabled={!selectedCountry} required>
              <SelectTrigger>
                  <SelectValue placeholder="Selecciona un estado/provincia" />
              </SelectTrigger>
              <SelectContent>
                  {states.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
              </SelectContent>
          </Select>
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

function CopyButton({ textToCopy }: { textToCopy: string }) {
    const [isCopied, setIsCopied] = useState(false);
    const { toast } = useToast();

    const handleCopy = () => {
        navigator.clipboard.writeText(textToCopy).then(() => {
            setIsCopied(true);
            toast({ title: "¡Copiado!", description: "El link de invitación ha sido copiado al portapapeles." });
            setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
        }, (err) => {
            console.error('Could not copy text: ', err);
            toast({ variant: 'destructive', title: "Error", description: "No se pudo copiar el link." });
        });
    };

    return (
        <Button variant="outline" size="icon" onClick={handleCopy} className="h-8 w-8">
            {isCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        </Button>
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
                <TableHead>Ubicación</TableHead>
                <TableHead>Link de Invitación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ongs.length > 0 ? (
                ongs.map((ong) => (
                  <TableRow key={ong.id}>
                    <TableCell className="font-medium">{ong.organizationName}</TableCell>
                    <TableCell>{ong.contactPerson}</TableCell>
                    <TableCell>{ong.state}, {ong.country}</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <Input value={ong.invitationLink} readOnly className="flex-1 h-8 text-xs bg-muted/50" />
                            <CopyButton textToCopy={ong.invitationLink} />
                        </div>
                    </TableCell>
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
