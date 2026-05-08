import { OngSignupForm } from '@/components/auth/ong-signup-form';

export const metadata = {
  title: 'Registro de Organizador | BiciRegistro',
  description: 'Crea tu cuenta de organizador para publicar eventos en BiciRegistro.',
};

export default function OngSignupPage() {
  return (
    <div className="flex w-full items-center justify-center p-4">
      <div className="w-full max-w-md">
        <OngSignupForm />
      </div>
    </div>
  );
}
