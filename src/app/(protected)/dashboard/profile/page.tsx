import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthenticatedUser } from '@/lib/data';
import { ProfileForm } from '@/components/user-components';
import { NotificationSettings } from '@/components/notification-settings';
import EmergencySettings from '@/components/dashboard/emergency-settings';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut } from 'lucide-react';
import { logout } from '@/lib/actions';
import { ActionPanel } from '@/components/dashboard/action-panel';
import { DownloadEmergencyStickerButton } from '@/components/dashboard/download-sticker-button';

// --- Helper function to check if the user profile is complete ---
const isProfileComplete = (user: any): boolean => {
    return !!user.birthDate && !!user.country && !!user.state;
};

export default async function ProfilePage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login');
  }

  const profileIsComplete = isProfileComplete(user);

  return (
    <div className="container max-w-5xl mx-auto md:py-8 px-4 relative">
       {/* Shared Header (Action Panel) for both Mobile and Desktop */}
       <ActionPanel user={user} isComplete={profileIsComplete} />

       <div className="max-w-2xl mx-auto px-4 sm:px-0 space-y-8 mt-4 md:mt-0 pb-32 md:pb-0">
         <div className="mb-6 hidden md:block">
            <Button asChild variant="outline">
            <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Garaje
            </Link>
            </Button>
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

      {/* Mobile Floating Action Button for Emergency QR */}
      <div className="md:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-full px-6 flex justify-center">
            <DownloadEmergencyStickerButton 
                user={user} 
                className="h-12 rounded-full shadow-xl bg-red-600 hover:bg-red-700 text-white font-bold px-6 flex items-center gap-2 border-2 border-white w-auto"
            />
      </div>
    </div>
  );
}
