import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthenticatedUser } from '@/lib/data';
import { ProfileForm } from '@/components/user-components';
import { NotificationSettings } from '@/components/notification-settings';
import EmergencySettings from '@/components/dashboard/emergency-settings';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut } from 'lucide-react';
import { logout } from '@/lib/actions';

export default async function ProfilePage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="container py-6 md:py-8">
       <div className="max-w-2xl mx-auto px-4 sm:px-0 space-y-8">
         <div className="mb-6 hidden md:block">
            <Button asChild variant="outline">
            <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Garaje
            </Link>
            </Button>
        </div>
        
        {/* Mobile Title - Back button is handled by Bottom Nav */}
        <div className="md:hidden mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Mi Perfil</h1>
            <form action={logout}>
                <Button type="submit" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                    <LogOut className="h-5 w-5" />
                    <span className="sr-only">Cerrar Sesión</span>
                </Button>
            </form>
        </div>

        {/* New Emergency Section */}
        <EmergencySettings user={user} />

        <ProfileForm user={user} />
        
        <NotificationSettings />

        {/* Logout button at the very bottom for mobile */}
        <div className="md:hidden mt-12 mb-8 pt-8 border-t border-border/50">
             <form action={logout}>
                <Button type="submit" variant="destructive" className="w-full h-12 text-lg font-medium">
                    <LogOut className="mr-2 h-5 w-5" />
                    Cerrar Sesión
                </Button>
            </form>
            <p className="text-center text-xs text-muted-foreground mt-4">
                 Al cerrar sesión, dejarás de recibir notificaciones push en este dispositivo.
            </p>
        </div>
      </div>
    </div>
  );
}
