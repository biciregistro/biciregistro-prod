import { notFound } from 'next/navigation';
import EmergencyProfileViewer from '@/components/public/emergency-profile-viewer';
import { adminDb as db } from '@/lib/firebase/server';
import { Metadata } from 'next';

interface PageProps {
  params: Promise<{
    uuid: string;
  }>;
}

// 🛡️ SECURITY: Prevent search engines from indexing emergency profiles
export const metadata: Metadata = {
  title: 'Emergencia Médica - Acceso Restringido',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default async function EmergencyPage(props: PageProps) {
  // Await params in Next.js 15+
  const params = await props.params;
  const uuid = params.uuid;

  if (!uuid) {
    notFound();
  }

  // We do NOT want to fetch user data here yet.
  // Security principle: Data is fetched only AFTER user interaction/consent on client side.
  // But we want to know if the UUID is even valid to show 404 immediately if not.
  
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('emergencyQrUuid', '==', uuid).limit(1).get();

    if (snapshot.empty) {
      notFound();
    }

    // If valid, render client component that handles the "Lock Screen"
    return (
      <EmergencyProfileViewer uuid={uuid} />
    );
  } catch (error) {
    console.error("Error accessing emergency profile:", error);
    // In case of DB error, fail safe to 404 or error page
    notFound();
  }
}
