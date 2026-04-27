import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Registro de Organizador | BiciRegistro',
  description: 'Crea tu cuenta de organizador para publicar eventos en BiciRegistro.',
};

/**
 * PATH BLOCKED FOR PUBLIC SELF-SERVICE
 * To maintain control over identity verification, this route is now redirect-only.
 * Any organization interested must contact support via WhatsApp from the landing page.
 */
export default function OngSignupPage() {
  redirect('/');
  return null;
}
