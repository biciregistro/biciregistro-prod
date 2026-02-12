
import { Suspense } from 'react';
import { getBikonDevices } from '@/lib/actions/bikon-actions';
import { BikonGenerator } from '@/components/admin/bikon-generator';

export default async function BikonAdminPage() {
  const devices = await getBikonDevices(50);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Administración de Dispositivos Bikon</h1>
      <Suspense fallback={<div>Cargando...</div>}>
        <BikonGenerator initialDevices={devices} />
      </Suspense>
    </div>
  );
}
