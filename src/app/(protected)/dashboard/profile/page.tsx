import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthenticatedUser } from '@/lib/data';
import { ProfileForm } from '@/components/user-components';
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

       <div className="max-w-2xl mx-auto sm:px-0 space-y-4 mt-4 md:mt-0 pb-36 md:pb-0">
         <div className="mb-6 hidden md:block">
            <Button asChild variant="outline">
            <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Garaje
            </Link>
            </Button>
        </div>

        {/* 
            ProfileForm now internally handles Tabs, Emergency Settings, 
            Notification Settings, and Security for the Mobile App look 
        */}
        <ProfileForm user={user} />
        
        {/* Logout button Global Footer */}
        <div className="md:hidden mt-8 mb-4 pt-8 px-4 border-t border-border/50">
             <form action={logout}>
                <Button type="submit" variant="ghost" className="w-full h-12 text-lg font-medium text-red-600 hover:bg-red-50 hover:text-red-700">
                    <LogOut className="mr-2 h-5 w-5" />
                    Cerrar Sesión Segura
                </Button>
            </form>
            <p className="text-center text-xs text-muted-foreground mt-4">
                 Al cerrar sesión, dejarás de recibir notificaciones push en este dispositivo.
            </p>
        </div>
      </div>

      {/* Mobile Floating Action Button for Emergency QR */}
      {/* We only render the FAB if the profile is complete, guiding them to finish the form first */}
      {profileIsComplete && (
         <div className="md:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-full px-6 flex justify-center">
             <DownloadEmergencyStickerButton 
                 user={user} 
                 className="h-12 rounded-full shadow-xl bg-red-600 hover:bg-red-700 text-white font-bold px-6 flex items-center gap-2 border-2 border-white w-auto"
             />
         </div>
      )}
    </div>
  );
}
