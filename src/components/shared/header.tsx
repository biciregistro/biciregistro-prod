'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, ShieldCheck, User } from 'lucide-react';
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
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Logo } from '@/components/icons/logo';

type NavLink = {
  href: string;
  label: string;
  auth: boolean;
  admin?: boolean;
};

const navLinks: NavLink[] = [
  { href: '/', label: 'Inicio', auth: false },
  { href: '/search', label: 'Buscar Bicis', auth: false },
  { href: '/dashboard', label: 'Panel', auth: true },
  { href: '/admin', label: 'Admin', auth: true, admin: true },
];

export function Header({ user }: { user: UserType | null }) {
  const pathname = usePathname();

  const filteredNavLinks = navLinks.filter(link => {
    if (!link.auth) return true;
    if (link.auth && !user) return false;
    if (link.admin && user?.role !== 'admin') return false;
    return true;
  });

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-6 flex items-center">
          <Link href="/" className="mr-6">
            <Logo />
          </Link>
          <nav className="hidden items-center space-x-6 text-sm font-medium md:flex">
            {filteredNavLinks.map(link => (
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
        
        <div className="flex flex-1 items-center justify-end md:hidden">
           <Sheet>
              <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                      <Menu className="h-5 w-5" />
                      <span className="sr-only">Abrir Menú</span>
                  </Button>
              </SheetTrigger>
              <SheetContent side="left" className="pr-0">
                  <Link href="/" className="mr-6">
                      <Logo />
                  </Link>
                  <div className="flex flex-col space-y-3 pt-6">
                      {filteredNavLinks.map(link => (
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
                  </div>
              </SheetContent>
          </Sheet>
        </div>


        <div className="flex flex-1 items-center justify-end space-x-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback>
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">Panel</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="#">Perfil</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  {/* In a real app, this would be a form post to a logout action */}
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <nav className="flex items-center space-x-2">
              <Button asChild variant="ghost">
                <Link href="/login">Iniciar Sesión</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Registrarse</Link>
              </Button>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
