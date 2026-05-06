'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, AlertTriangle, ShieldAlert, Loader2 } from 'lucide-react';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { app } from '@/lib/firebase/client';
import type { User as UserType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { restoreAdminSession } from '@/lib/actions/auth-actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Logo } from '@/components/icons/logo';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { logout } from '@/lib/actions';
import { Skeleton } from '@/components/ui/skeleton';

const navLinks = [
  { href: '/', label: 'Inicio', auth: false },
  { href: '/events', label: 'Eventos', auth: false },
  { href: '/search', label: 'Buscar Bicis', auth: false },
];

function UserNavLinks({ user }: { user: UserType }) {
    const dashboardHome = user.role === 'ong' ? '/dashboard/ong' : '/dashboard';
    const profilePath = user.role === 'ong' ? '/dashboard/ong/profile' : '/dashboard/profile';

    return (
        <>
            <DropdownMenuItem asChild>
                <Link href="/events" className="font-medium text-primary">
                    Próximos Eventos
                </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link href={dashboardHome}>
                    {user.role === 'ciclista' ? 'Mi Garaje' : 'Panel de Control'}
                </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
                <Link href={profilePath}>
                    {user.role === 'ong' ? 'Perfil de la Organización' : 'Mi Perfil'}
                </Link>
            </DropdownMenuItem>

            {user.role === 'ciclista' && (
                <>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard?tab=events">Mis Inscripciones</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/register">Registrar Bici</Link>
                    </DropdownMenuItem>
                </>
            )}

            {user.role === 'admin' && (
                <DropdownMenuItem asChild>
                    <Link href="/admin">Panel de Administrador</Link>
                </DropdownMenuItem>
            )}
        </>
    );
}

// Sub-componente para el Banner de Suplantación
function ImpersonationBanner({ userName }: { userName: string }) {
    const [isRestoring, setIsRestoring] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handleRestoreAdmin = async () => {
        setIsRestoring(true);
        try {
            // Leer UID original desde la sesión (esto asume que el backend o el client sabe quién es el admin original,
            // pero podemos limpiar la cookie temporalmente y pedir re-login si es complejo, 
            // O mejor aún: usar el auth-actions y leer el claim custom del token en el server)
            
            // Simpler approach for v1: We clear cookies and force re-login to Admin.
            // A more robust approach uses the `adminImpersonator` claim we set.
            // Let's call a logout which will clear the session, but we also want to remove our flag
            document.cookie = '__admin_impersonator=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            
            // For now, doing a standard logout is the safest way to restore state if we don't store the admin UID in plain text.
            // Ideally, the user logs back in as admin.
            await fetch('/api/auth/logout', { method: 'POST' });
            
            toast({
                title: "Sesión restaurada",
                description: "Por seguridad, por favor inicia sesión nuevamente como Administrador.",
            });
            window.location.href = '/login';
            
        } catch (error) {
            console.error(error);
            setIsRestoring(false);
        }
    };

    return (
        <div className="w-full bg-red-600 text-white px-4 py-2 flex items-center justify-between z-[60] sticky top-0 shadow-md">
            <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 animate-pulse" />
                <span className="text-sm font-medium">
                    Modo Suplantación: Actuando como <strong>{userName}</strong>
                </span>
            </div>
            <Button 
                variant="outline" 
                size="sm" 
                className="bg-transparent border-white text-white hover:bg-white hover:text-red-600 h-8 text-xs"
                onClick={handleRestoreAdmin}
                disabled={isRestoring}
            >
                {isRestoring ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Volver a ser Admin
            </Button>
        </div>
    );
}

export function Header({ user }: { user: UserType | null }) {
  const pathname = usePathname();
  const dashboardHome = user?.role === 'ong' ? '/dashboard/ong' : '/dashboard';
  const [isClient, setIsClient] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Check for the impersonator cookie
    const checkImpersonation = () => {
        const isImpersonator = document.cookie.split('; ').find(row => row.startsWith('__admin_impersonator=true'));
        setIsImpersonating(!!isImpersonator);
    };
    checkImpersonation();
  }, []);

  // Safe accessor to prevent crash if user.name is missing in DB
  const userNameInitial = (user?.name || user?.email || "?").charAt(0).toUpperCase();
  const displayName = user?.name || "Usuario";

  // Hide header on mobile if user is authenticated and is in dashboard area
  const isDashboardArea = pathname.startsWith('/dashboard');
  const hideOnMobile = user && isDashboardArea;

  return (
    <>
      {isImpersonating && user && <ImpersonationBanner userName={displayName} />}
      <header className={cn(
        "sticky z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        // Ajustamos top position si el banner está presente
        isImpersonating ? "top-[52px]" : "top-0", 
        hideOnMobile && "hidden md:flex"
      )}>
        <div className="container flex h-16 items-center px-4">
          <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-6">
                  <Link href="/" className="flex items-center space-x-2">
                      <Logo />
                  </Link>
                  <nav className="hidden items-center space-x-6 text-sm font-medium md:flex">
                      {navLinks.map(link => (
                      <Link
                          key={link.href}
                          href={link.href}
                          className={cn(
                          'transition-colors hover:text-foreground/80',
                          pathname === link.href ? 'text-foreground' : 'text-foreground/60'
                          )}
                      >
                          {link.label}
                      </Link>
                      ))}
                      
                      {/* Botón de Reporte de Robo en Desktop */}
                      <Button asChild variant="destructive" size="sm" className="bg-red-600 hover:bg-red-700 text-white shadow-sm">
                          <Link href="/reportar-robo" className="flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4" />
                              Reportar Robo
                          </Link>
                      </Button>
                  </nav>
              </div>
              
              <div className="flex items-center justify-end gap-2">
                  {!isClient ? (
                      <div className="flex items-center gap-4">
                          <Skeleton className="h-10 w-20 hidden md:inline-flex" />
                          <Skeleton className="h-8 w-8 rounded-full" />
                      </div>
                  ) : user ? (
                      <div className="flex items-center gap-4">
                          {/* Botón explícito hacia Eventos para usuarios logueados, adicional al nav */}
                          <Button asChild variant="ghost" className="hidden lg:inline-flex">
                              <Link href="/events">Explorar Eventos</Link>
                          </Button>

                          <Button asChild className="hidden md:inline-flex">
                              <Link href={dashboardHome}>Panel</Link>
                          </Button>
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className={cn("relative h-8 w-8 rounded-full", isImpersonating && "ring-2 ring-red-500")}>
                                      <Avatar className="h-8 w-8">
                                          <AvatarImage src={user.avatarUrl} alt={displayName} />
                                          <AvatarFallback className="bg-primary text-primary-foreground">
                                              {userNameInitial}
                                          </AvatarFallback>
                                      </Avatar>
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-56" align="end" forceMount>
                                  <DropdownMenuLabel className="font-normal">
                                      <div className="flex flex-col space-y-1">
                                      <p className="text-sm font-medium leading-none">{displayName}</p>
                                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                                      </div>
                                  </DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <UserNavLinks user={user} />
                                  <DropdownMenuSeparator />
                                  <form action={logout}>
                                      <DropdownMenuItem asChild>
                                          <button type="submit" className="w-full text-left" onClick={() => document.cookie = '__admin_impersonator=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'}>Cerrar Sesión</button>
                                      </DropdownMenuItem>
                                  </form>
                              </DropdownMenuContent>
                          </DropdownMenu>
                      </div>
                  ) : (
                      <>
                          {/* Desktop Navigation */}
                          <nav className="hidden items-center space-x-2 md:flex">
                              <Button asChild variant="ghost">
                                  <Link href="/login">Iniciar Sesión</Link>
                              </Button>
                              
                              <Button asChild variant="outline" className="hidden lg:inline-flex border-primary text-primary hover:bg-primary/10">
                                  <Link href="/events-manager">Soy Organizador</Link>
                              </Button>

                              <Button asChild>
                                  <Link href="/signup">Registra Tu Bici</Link>
                              </Button>
                          </nav>
                      </>
                  )}

                  {/* Mobile Navigation & Report Button */}
                  <div className="md:hidden flex items-center gap-2">
                       {/* Botón Reportar Robo Mobile (Visible siempre, incluso logueado) */}
                      <Button asChild variant="destructive" size="sm" className="h-8 bg-red-600 hover:bg-red-700 text-white text-xs px-2 shadow-sm">
                          <Link href="/reportar-robo" className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Reportar
                          </Link>
                      </Button>

                      <Sheet>
                          <SheetTrigger asChild>
                              <Button variant="ghost" size="icon">
                                  <Menu className="h-6 w-6" />
                                  <span className="sr-only">Menú</span>
                              </Button>
                          </SheetTrigger>
                          <SheetContent side="right">
                              <SheetHeader>
                                  <SheetTitle className="text-left">Menú</SheetTitle>
                              </SheetHeader>
                              <div className="flex flex-col gap-4 mt-6">
                                  {navLinks.map(link => (
                                      <SheetClose asChild key={link.href}>
                                          <Link
                                              href={link.href}
                                              className={cn(
                                                  'text-lg font-medium transition-colors hover:text-primary',
                                                  pathname === link.href ? 'text-primary' : 'text-foreground/60'
                                              )}
                                          >
                                              {link.label}
                                          </Link>
                                      </SheetClose>
                                  ))}
                                  <div className="border-t my-2" />
                                  
                                  <SheetClose asChild>
                                      <Button asChild variant="destructive" className="w-full justify-start text-lg bg-red-600 hover:bg-red-700 text-white">
                                          <Link href="/reportar-robo">
                                              <AlertTriangle className="w-5 h-5 mr-2" />
                                              Reportar Robo
                                          </Link>
                                      </Button>
                                  </SheetClose>

                                  {!user && (
                                      <>
                                          <SheetClose asChild>
                                              <Button asChild variant="outline" className="w-full justify-start text-lg border-primary text-primary">
                                                  <Link href="/events-manager">Soy Organizador</Link>
                                              </Button>
                                          </SheetClose>

                                          <SheetClose asChild>
                                              <Button asChild variant="ghost" className="justify-start px-0 text-lg">
                                                  <Link href="/login">Iniciar Sesión</Link>
                                              </Button>
                                          </SheetClose>
                                          <SheetClose asChild>
                                              <Button asChild className="w-full">
                                                  <Link href="/signup">Registra Tu Bici</Link>
                                              </Button>
                                          </SheetClose>
                                      </>
                                  )}
                                  
                                  {user && (
                                       <SheetClose asChild>
                                          <Button asChild className="w-full">
                                              <Link href={dashboardHome}>Ir a mi Panel</Link>
                                          </Button>
                                      </SheetClose>
                                  )}
                              </div>
                          </SheetContent>
                      </Sheet>
                  </div>
              </div>
              </div>
        </div>
      </header>
    </>
  );
}
