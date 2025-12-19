'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { OngFinancialForm } from '@/components/ong/ong-financial-form';
import type { OngUser } from '@/lib/types';

interface FinancialRegistrationModalProps {
  // We can pass partial profile data if needed, or an empty object if creating new
  ongProfile: Partial<OngUser>; 
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function FinancialRegistrationModal({ ongProfile, isOpen, onOpenChange, onSuccess }: FinancialRegistrationModalProps) {
  const handleSuccess = () => {
    onSuccess();
    onOpenChange(false);
  };
  
  // Cast partial profile to full because the form handles empty/default values gracefully
  const safeProfile = ongProfile as OngUser;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Datos Bancarios Requeridos</DialogTitle>
          <DialogDescription>
            Para activar la opción "Con Costo", necesitamos registrar tu cuenta bancaria. 
            Tus ganancias se depositarán aquí.
          </DialogDescription>
        </DialogHeader>
        <OngFinancialForm 
            ongProfile={safeProfile} 
            onSuccess={handleSuccess} 
            hideHeader={true} 
        />
      </DialogContent>
    </Dialog>
  );
}
