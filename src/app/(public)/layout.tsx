import { Header } from '@/components/shared/header';
import { Footer } from '@/components/shared/footer';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The public layout should not be concerned with the user's authentication state.
  // The Header component is designed to handle a null user gracefully.
  // Authentication checks and user data fetching should only happen in protected layouts.
  return (
    <div className="flex min-h-screen flex-col">
      <Header user={null} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
