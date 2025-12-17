'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { saveFCMToken } from '@/lib/actions/bike-actions';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app } from '@/lib/firebase/client';
import { Bell, BellOff, Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function NotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isChecking, setIsChecking] = useState(true);
  const { toast } = useToast();

  // Check initial permission status on component mount
  useEffect(() => {
    // isSupported() must be checked before anything else
    isSupported().then(supported => {
      if (supported) {
        setPermission(Notification.permission);
      } else {
        // If not supported, we can consider it 'denied' for UI purposes
        setPermission('denied');
      }
      setIsChecking(false);
    });
  }, []);

  const handleRequestPermission = async () => {
    try {
      const messaging = getMessaging(app);
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult === 'granted') {
        toast({
          title: 'Permiso concedido',
          description: '¡Gracias! Ahora recibirás notificaciones importantes.',
        });
        
        // Get token and save it to the server
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
            console.error("VAPID key not found in environment variables.");
            toast({ title: "Error de configuración", description: "No se pudo registrar para notificaciones.", variant: "destructive"});
            return;
        }

        const currentToken = await getToken(messaging, { vapidKey: vapidKey });
        if (currentToken) {
          await saveFCMToken(currentToken);
        } else {
          console.log('No registration token available. Request permission to generate one.');
        }
      } else {
        toast({
          title: 'Permiso denegado',
          description: 'No recibirás notificaciones. Puedes cambiar esto desde la configuración de tu navegador.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error handling notification permission:', error);
      toast({
        title: 'Error',
        description: 'Ocurrió un error al solicitar el permiso de notificaciones.',
        variant: 'destructive',
      });
    }
  };

  const renderContent = () => {
    if (isChecking) {
      return <p className="text-sm text-muted-foreground">Verificando estado de los permisos...</p>;
    }

    switch (permission) {
      case 'granted':
        return (
          <Alert variant="default" className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
            <Bell className="h-5 w-5 text-green-600" />
            <AlertTitle className="text-green-800 dark:text-green-300">Notificaciones Activadas</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-400">
              Estás listo para recibir alertas de seguridad y otras notificaciones importantes.
            </AlertDescription>
          </Alert>
        );
      case 'denied':
        return (
          <Alert variant="destructive" className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
             <BellOff className="h-5 w-5 text-yellow-600" />
             <AlertTitle className="text-yellow-800 dark:text-yellow-300">Acción Requerida</AlertTitle>
             <AlertDescription className="text-yellow-700 dark:text-yellow-400 space-y-2">
                <p>Has bloqueado las notificaciones. Para habilitarlas, sigue estos pasos:</p>
                <div className="flex items-start gap-2 mt-2 bg-white/50 dark:bg-black/20 p-2 rounded">
                    <Lock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <ol className="list-decimal list-inside text-sm">
                        <li>Haz clic en el ícono de <strong>Ajustes</strong> o <strong>Candado</strong> a la izquierda de la URL.</li>
                        <li>Busca la opción "Notificaciones" y cambia el interruptor a <strong>Permitir</strong>.</li>
                        <li>Recarga esta página.</li>
                    </ol>
                </div>
             </AlertDescription>
          </Alert>
        );
      case 'default':
        return (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground mb-4 sm:mb-0 max-w-[70%]">
                    ¿Quieres recibir alertas de robo en tu zona? Activa las notificaciones push en este dispositivo.
                </p>
                <Button onClick={handleRequestPermission}>
                    <Bell className="mr-2 h-4 w-4" />
                    Activar Notificaciones
                </Button>
            </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permisos del Dispositivo</CardTitle>
        <CardDescription>
          Gestiona el permiso de este navegador para mostrar alertas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}
