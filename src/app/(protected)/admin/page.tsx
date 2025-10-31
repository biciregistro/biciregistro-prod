import { redirect } from 'next/navigation';
import { getAuthenticatedUser, getHomepageContent } from '@/lib/data';
import { HomepageEditor } from '@/components/admin-components';

export default async function AdminPage() {
  const user = await getAuthenticatedUser();

  if (!user || user.role !== 'admin') {
    // In a real app, you might want to show an "Unauthorized" page
    // or just redirect to the main dashboard.
    redirect('/dashboard');
  }

  const homepageSections = await getHomepageContent();

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
            <p className="text-muted-foreground">Manage your application settings.</p>
        </div>
      </div>
      <div className="max-w-3xl mx-auto">
        <HomepageEditor sections={homepageSections} />
      </div>
    </div>
  );
}
