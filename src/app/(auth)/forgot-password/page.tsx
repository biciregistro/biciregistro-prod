import { ForgotPasswordForm } from '@/components/auth-components';
import { Suspense } from 'react';

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
