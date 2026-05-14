import { ProfileForm } from '@/components/user-components';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  // Modificado: El default ahora es ir al perfil para que el usuario nuevo complete su información
  const callbackUrl = typeof resolvedSearchParams.callbackUrl === 'string' ? resolvedSearchParams.callbackUrl : '/dashboard/profile';
  
  return <ProfileForm callbackUrl={callbackUrl} />;
}
