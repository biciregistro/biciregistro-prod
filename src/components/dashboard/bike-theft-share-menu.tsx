"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Share2, Facebook, Link as LinkIcon, Instagram, MessageCircle, AlertTriangle } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Bike, User } from "@/lib/types"

interface BikeTheftShareMenuProps {
  bike: Bike
  user: User
}

export function BikeTheftShareMenu({ bike, user }: BikeTheftShareMenuProps) {
  
  if (bike.status !== 'stolen' || !bike.theftReport) return null;

  const report = bike.theftReport;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://biciregistro.mx';
  
  // Añadimos timestamp para romper caché de OG
  const bikeUrl = `${baseUrl}/bikes/${bike.serialNumber}?v=${new Date().getTime().toString().slice(0, 8)}`;
  
  // Formatear recompensa
  const formattedReward = report.reward && report.reward !== '0'
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(report.reward))
    : null;

  // Construir el mensaje modificado
  const shareText = `🚨 Alerta Bicicleta Robada en ${report.location} 🚨

Atención su apoyo para localizar la siguiente bicicleta que se robaron en ${report.location}, ${report.city || ''}, ${report.country || ''}

🚲 Marca: ${bike.make}, Modelo: ${bike.model}, Color: ${bike.color}, Numero de serie: ${bike.serialNumber}

📄 Detalles del robo: ${report.details}

🥷 Detalles del ladrón: ${report.thiefDetails || 'No especificados'}

${formattedReward ? `💰 Se ofrece recompensa de: ${formattedReward}` : ''}

Cualquier información que tengan les agradecería ponerse en contacto con: ${user.name} ${user.lastName || ''} y 📱 ${user.whatsapp || user.phone || 'Mensaje Directo'} o por mensaje directo en facebook o instagram.

Link de la bicicleta: ${bikeUrl}

#Biciregistro #Ciclismo #Deporte #Amigos #MTB #Ruta #Trek #Giant #TotalBike #Sacalabici`;

  // Construir URL de la imagen dinámica para descargar
  const getOgImageUrl = (relative = false) => {
    const params = new URLSearchParams({
      brand: bike.make,
      model: bike.model || '',
      status: bike.status,
      image: bike.photos[0] || '',
    });
    
    if (report.reward) params.append('reward', report.reward.toString());
    if (report.location) params.append('location', report.location);
    
    const path = `/api/og/bike?${params.toString()}`;
    return relative ? path : `${baseUrl}${path}`;
  };

  const handleFacebookShare = () => {
    navigator.clipboard.writeText(shareText);
    toast({
      title: "Alerta copiada",
      description: "Pega el mensaje en Facebook para difundir el robo.",
    });

    setTimeout(() => {
        const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(bikeUrl)}`
        window.open(url, '_blank', 'width=600,height=400')
    }, 500);
  }

  const handleWhatsAppShare = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`
    window.open(url, '_blank')
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bikeUrl)
    toast({
      title: "Enlace copiado",
      description: "El enlace a la bicicleta ha sido copiado.",
    })
  }

  const handleInstagramShare = async () => {
    // 1. Copiar texto
    navigator.clipboard.writeText(shareText);
    toast({
      title: "Preparando Instagram...",
      description: "Texto copiado. Descargando imagen de alerta...",
    });

    try {
      // 2. Descargar Imagen usando ruta relativa
      const imageUrl = getOgImageUrl(true);
      const response = await fetch(imageUrl);
      
      if (!response.ok) throw new Error('Error de red al obtener imagen');

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `ALERTA-ROBO-${bike.serialNumber}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 3. Abrir Instagram con lógica de Intención Nativa (Deep Links)
      setTimeout(() => {
         const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
         const isAndroid = /android/i.test(userAgent);
         const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;

         if (isAndroid) {
             // Intent de Android: fuerza la apertura en la app de Instagram
             window.location.href = "intent://instagram.com/#Intent;package=com.instagram.android;scheme=https;end";
         } else if (isIOS) {
             // Esquema iOS directo
             window.location.href = "instagram://app";
             // Fallback web si el esquema falla después de 2 segundos
             setTimeout(() => {
                if (document.hasFocus()) {
                    window.open("https://www.instagram.com/", '_blank');
                }
             }, 2000);
         } else {
             // Desktop
             window.open("https://www.instagram.com/", '_blank');
         }
         
         toast({
            title: "¡Todo listo!",
            description: "Imagen descargada. Sube la foto y pega el texto en Instagram.",
         });
      }, 1500);

    } catch (error) {
      console.error("Error descargando imagen:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No pudimos descargar la imagen automáticamente. Intenta tomar una captura.",
      });
      window.open("https://www.instagram.com/", '_blank');
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-2 animate-pulse hover:animate-none">
          <AlertTriangle className="h-4 w-4" />
          <span>Compartir Robo</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Difundir Alerta de Robo</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleWhatsAppShare} className="cursor-pointer">
          <MessageCircle className="mr-2 h-4 w-4" />
          <span>WhatsApp</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleFacebookShare} className="cursor-pointer">
          <Facebook className="mr-2 h-4 w-4" />
          <span>Facebook (Copia mensaje)</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleInstagramShare} className="cursor-pointer">
          <Instagram className="mr-2 h-4 w-4" />
          <span>Instagram (Descarga + Copia)</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
          <LinkIcon className="mr-2 h-4 w-4" />
          <span>Copiar Enlace</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
