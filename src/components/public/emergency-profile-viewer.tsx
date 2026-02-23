'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, UserRound, Phone, MapPin, Loader2, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logEmergencyAccess } from '@/lib/actions/emergency-actions'; // You'll need to create this wrapper for server action
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface EmergencyProfileProps {
  uuid: string;
}

export default function EmergencyProfileViewer({ uuid }: EmergencyProfileProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const { toast } = useToast();

  const handleUnlock = async () => {
    setIsLoading(true);

    // 1. Request GPS (Best effort)
    let lat: number | undefined;
    let lng: number | undefined;

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });
      lat = position.coords.latitude;
      lng = position.coords.longitude;
    } catch (error) {
      console.warn("GPS denied or unavailable", error);
      // Proceed anyway, life is priority
    }

    // 2. Server Action to log and fetch data
    try {
      // Need to wrap the server action call because it's imported
      // For now, assuming direct call works if next.config allows or via API
      // const result = await logEmergencyAccess(uuid, { lat, lng, userAgent: navigator.userAgent });
      
      // Temporary fetch to API route to handle server action
      const response = await fetch('/api/emergency/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid, lat, lng })
      });
      
      const result = await response.json();

      if (result.success) {
        setProfileData(result.data);
        setIsUnlocked(true);
        toast({
          title: "Acceso Registrado",
          description: "Se ha notificado a los contactos de emergencia.",
          variant: "destructive" // Red for alert/importance
        });
      } else {
        toast({
          title: "Error",
          description: "Código QR inválido o expirado.",
          variant: "destructive"
        });
      }
    } catch (err) {
      toast({
        title: "Error de Conexión",
        description: "Intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <Card className="w-full max-w-md border-red-200 shadow-xl">
          <CardHeader className="text-center space-y-4 bg-red-100/50 rounded-t-lg pb-8 pt-8">
            <div className="mx-auto bg-red-100 p-4 rounded-full w-20 h-20 flex items-center justify-center border-4 border-red-500 animate-pulse">
              <AlertTriangle className="h-10 w-10 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-red-800">PERFIL MÉDICO DE EMERGENCIA</CardTitle>
            <CardDescription className="text-red-700 font-medium">
              ⚠️ Estás a punto de acceder a información confidencial.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6 text-center">
            <p className="text-sm text-gray-600">
              Al presionar "Ver Datos", se registrará tu ubicación GPS y se enviará una alerta inmediata a los contactos de emergencia del ciclista.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800 text-left">
              <strong>Aviso Legal:</strong> El acceso no autorizado a datos médicos privados puede ser sancionado. Solo accede si eres personal de auxilio o testigo de un accidente.
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full bg-red-600 hover:bg-red-700 text-white h-14 text-lg font-bold shadow-lg shadow-red-200"
              onClick={handleUnlock}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <ShieldAlert className="mr-2 h-5 w-5" />
                  Soy Personal de Auxilio / Ver Datos
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Unlocked View
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Sticky Warning Header */}
      <div className="sticky top-0 z-50 bg-red-600 text-white p-2 text-center text-sm font-bold shadow-md">
        MODO EMERGENCIA ACTIVO - UBICACIÓN RASTREADA
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Identity Card */}
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
                {profileData.photoUrl ? (
                  <img src={profileData.photoUrl} alt="User" className="h-full w-full object-cover" />
                ) : (
                  <UserRound className="h-full w-full p-3 text-gray-400" />
                )}
              </div>
              <div>
                <CardTitle className="text-xl">{profileData.name} {profileData.lastName}</CardTitle>
                <p className="text-gray-500 text-sm">Ciclista Identificado</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Medical Info */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-red-500">✚</span> Información Médica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg border">
                <p className="text-xs text-gray-500 uppercase">Tipo de Sangre</p>
                <p className="text-2xl font-bold text-gray-900">{profileData.bloodType || "N/A"}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border">
                 <p className="text-xs text-gray-500 uppercase">Seguro Médico</p>
                 <p className="text-sm font-medium text-gray-900 truncate">{profileData.insuranceInfo || "No registrado"}</p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-100 p-3 rounded-lg">
              <p className="text-xs text-red-600 uppercase font-bold mb-1">Alergias / Condiciones</p>
              <p className="text-base text-gray-900 font-medium">
                {profileData.allergies || "Ninguna registrada"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contacts */}
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Contacto de Emergencia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-lg font-bold">{profileData.emergencyContactName || "No especificado"}</p>
              <p className="text-gray-600">{profileData.emergencyContactPhone || "---"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sticky Action Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex flex-col gap-3 z-50">
        <a 
          href={`tel:${profileData.emergencyContactPhone}`}
          className={`w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-lg text-lg shadow-lg ${!profileData.emergencyContactPhone ? 'pointer-events-none opacity-50' : ''}`}
        >
          <Phone className="h-6 w-6" />
          LLAMAR A CONTACTO
        </a>
        
        {profileData.emergencyContactPhone && (
          <a
            href={`https://wa.me/${profileData.emergencyContactPhone.replace(/\D/g,'')}?text=${encodeURIComponent(`¡EMERGENCIA! He encontrado a ${profileData.name} y requiere asistencia. Mi ubicación aproximada es: https://maps.google.com/?q=${profileData.currentLat || ''},${profileData.currentLng || ''}`)}`}
            target="_blank"
            rel="noopener noreferrer" 
            className="w-full flex items-center justify-center gap-2 bg-white border border-green-600 text-green-700 font-bold py-3 rounded-lg hover:bg-green-50"
          >
            <MapPin className="h-5 w-5" />
            Enviar Ubicación por WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
