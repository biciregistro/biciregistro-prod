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
  const bikeUrl = `${baseUrl}/bikes/${bike.serialNumber}`;
  
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

  const handleFacebookShare = () => {
    // Truco de UX: Copiamos el texto al portapapeles antes de abrir Facebook
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

  const handleCopyForInstagram = () => {
    navigator.clipboard.writeText(shareText)
    toast({
      title: "Alerta copiada",
      description: "Pega este texto en tu historia o post de Instagram.",
    })
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

        <DropdownMenuItem onClick={handleCopyForInstagram} className="cursor-pointer">
          <Instagram className="mr-2 h-4 w-4" />
          <span>Instagram (Copia mensaje)</span>
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
