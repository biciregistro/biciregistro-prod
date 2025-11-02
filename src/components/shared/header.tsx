'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Menu } from 'lucide-react';
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
} from "@/components/ui/sheet"

const navLinks = [
  { href: '/', label: 'Inicio', auth: false },
  { href: '/search', label: 'Buscar Bicis', auth: false },
];

export function Header({ user }: { user: UserType | null }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container">
        <div className="flex h-16 items-center justify-between">
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
            {user ? (
                <div className="flex items-center gap-4">
                <Button asChild>
                    <Link href="/dashboard">Panel</Link>
                </Button>
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
                        <Link href="/dashboard/profile">Perfil</Link>
                    </DropdownMenuItem>
                    {user.role === 'admin' && (
                        <DropdownMenuItem asChild>
                        <Link href="/admin">Admin</Link>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                        Cerrar Sesión
                    </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                </div>
            ) : (
                <>
                    <nav className="hidden items-center space-x-2 md:flex">
                    <Button asChild variant="ghost">
                        <Link href="/login">Iniciar Sesión</Link>
                    </Button>
                    <Button asChild>
                        <Link href="/signup">Registra Tu Bici</Link>
                    </Button>
                    </nav>
                    <div className="md:hidden">
                        <Button asChild variant="ghost">
                            <Link href="/login">Iniciar Sesión</Link>
                        </Button>
                         <Button asChild>
                            <Link href="/signup">Registra Tu Bici</Link>
                        </Button>
                    </div>
                </>
            )}
            </div>
        </div>
      </div>
    </header>
  );
}