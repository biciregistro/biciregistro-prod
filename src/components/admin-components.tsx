'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { createOngUser } from '@/lib/actions';
import type { User, OngUser } from '@/lib/types';
import { countries, type Country } from '@/lib/countries';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Search, X, Copy, Check, Eye, EyeOff } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PasswordStrengthIndicator } from './user-components';

// Re-export the modularized HomepageEditor
export { HomepageEditor } from '@/components/admin/homepage-editor/main-editor';


function SubmitButton({ text = "Guardar Cambios" }: { text?: string }) {
    const { pending } = useFormStatus();
    return <Button type="submit" disabled={pending}>{pending ? 'Guardando...' : text}</Button>;
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
