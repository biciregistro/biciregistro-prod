import { ProfileForm } from '@/components/user-components';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  // Modificado: Ahora el default es ir al dashboard (Garaje) en lugar del default que enviaba a perfil
  const callbackUrl = typeof resolvedSearchParams.callbackUrl === 'string' ? resolvedSearchParams.callbackUrl : '/dashboard';
  
  return <ProfileForm callbackUrl={callbackUrl} />;
}
