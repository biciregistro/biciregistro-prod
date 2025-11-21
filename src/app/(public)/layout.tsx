import { Header } from '@/components/shared/header';
import { Footer } from '@/components/shared/footer';
import { getAuthenticatedUser } from '@/lib/data';

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={user} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
