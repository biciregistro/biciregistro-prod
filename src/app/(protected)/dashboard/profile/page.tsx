import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthenticatedUser } from '@/lib/data';
import { ProfileForm } from '@/components/user-components';
import { NotificationSettings } from '@/components/notification-settings';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default async function ProfilePage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="container py-6 md:py-8">
       <div className="max-w-2xl mx-auto px-4 sm:px-0 space-y-8">
         <div className="mb-6">
            <Button asChild variant="outline">
            <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Garaje
            </Link>
            </Button>
        </div>
        
        <ProfileForm user={user} />
        
        {/* New component for browser notification permissions */}
        <NotificationSettings />
      </div>
    </div>
  );
}
