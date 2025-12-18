'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import type { User as UserType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
  { href: '/search', label: 'Buscar Bicis', auth: false },
];

function UserNavLinks({ user }: { user: UserType }) {
    const dashboardHome = user.role === 'ong' ? '/dashboard/ong' : '/dashboard';
    const profilePath = user.role === 'ong' ? '/dashboard/ong/profile' : '/dashboard/profile';

    return (
        <>
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
                        <Link href="/dashboard?tab=events">Mis Eventos</Link>
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

export function Header({ user }: { user: UserType | null }) {
  const pathname = usePathname();
  const dashboardHome = user?.role === 'ong' ? '/dashboard/ong' : '/dashboard';
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Safe accessor to prevent crash if user.name is missing in DB
  const userNameInitial = (user?.name || user?.email || "?").charAt(0).toUpperCase();
  const displayName = user?.name || "Usuario";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
                        <Button asChild className="hidden md:inline-flex">
                            <Link href={dashboardHome}>Panel</Link>
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
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
                                        <button type="submit" className="w-full text-left">Cerrar Sesión</button>
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

                        {/* Mobile Navigation */}
                        <div className="md:hidden">
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
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </>
                )}
            </div>
            </div>
      </div>
    </header>
  );
}
