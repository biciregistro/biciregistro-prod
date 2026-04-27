import { OngSignupForm } from '@/components/auth/ong-signup-form';

export const metadata = {
  title: 'Registro de Organizador | BiciRegistro',
  description: 'Crea tu cuenta de organizador para publicar eventos en BiciRegistro.',
};

export default function OngSignupPage() {
  return <OngSignupForm />;
}
