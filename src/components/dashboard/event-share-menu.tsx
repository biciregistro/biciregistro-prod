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
import { Share2, Facebook, Link as LinkIcon, Instagram, MessageCircle, Twitter } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { format, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

interface EventShareMenuProps {
  eventName: string
  eventDate: Date | string
  eventUrl: string
  eventType?: string
  eventLevel?: string
  eventModality?: string
}

export function EventShareMenu({ 
  eventName, 
  eventDate, 
  eventUrl,
  eventType = "evento",
  eventLevel = "Todos",
  eventModality = "Ciclismo"
}: EventShareMenuProps) {
  
  // Formatear fecha para el texto de manera segura
  const formatDate = (dateInput: Date | string) => {
    try {
      const dateObj = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
      
      // Si falló parseISO (por ejemplo si no es string ISO), intentamos Date normal
      const finalDate = isValid(dateObj) ? dateObj : new Date(dateInput);

      if (!isValid(finalDate)) return "Fecha por confirmar";
      
      // Usamos el formato estandarizado del proyecto con date-fns
      // Esto respeta la visualización local del navegador del usuario
      return format(finalDate, "EEEE, d 'de' MMMM 'de' yyyy, h:mm a", { locale: es });
    } catch (e) {
      console.error("Error formatting date for sharing:", e);
      return "Próximamente";
    }
  }

  const formattedDate = formatDate(eventDate);

  // Texto optimizado según requerimiento
  const shareText = `¡Te invitamos a nuestra próxima ${eventType.toLowerCase()}! ¡No te lo puedes perder!

🏁 ${eventName}
📅 ${formattedDate}
🏆 Nivel: ${eventLevel}
🚵‍♂️ Modalidad: ${eventModality}

👉 Regístrate y conoce todos los detalles aquí: ${eventUrl}

#Biciregistro #Ciclismo #Deporte #Amigos #MTB #Ruta #Trek #Giant #TotalBike #Sacalabici`;

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: eventName,
          text: shareText,
          url: eventUrl,
        })
      } catch (error) {
        console.error("Error compartiendo:", error)
      }
    } else {
      handleCopyLink()
    }
  }

  const handleFacebookShare = () => {
    // Truco de UX: Copiamos el texto al portapapeles antes de abrir Facebook
    navigator.clipboard.writeText(shareText);
    
    toast({
      title: "Texto copiado",
      description: "Pega el mensaje en Facebook para compartir los detalles.",
      duration: 3000,
    });

    setTimeout(() => {
        const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`
        window.open(url, '_blank', 'width=600,height=400')
    }, 500);
  }
  
  const handleTwitterShare = () => {
    // Twitter tiene límite de caracteres, versión acortada
    const shortText = `¡Te invitamos a nuestra próxima ${eventType}! 🚴‍♂️\n\n🏁 ${eventName}\n📅 ${formattedDate}\n\n👉 Regístrate aquí:`;
    const hashtags = "Biciregistro,Ciclismo,Deporte,MTB"; 
    
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shortText)}&url=${encodeURIComponent(eventUrl)}&hashtags=${hashtags}`;
    window.open(url, '_blank', 'width=600,height=400')
  }

  const handleWhatsAppShare = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`
    window.open(url, '_blank')
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(eventUrl)
    toast({
      title: "Enlace copiado",
      description: "El enlace al evento ha sido copiado al portapapeles.",
    })
  }

  const handleCopyForInstagram = () => {
    navigator.clipboard.writeText(shareText)
    toast({
      title: "Texto copiado",
      description: "Pega este texto en tu historia o post de Instagram.",
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-9">
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Compartir</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Difundir Evento</DropdownMenuLabel>
        
        <DropdownMenuItem onClick={handleNativeShare} className="cursor-pointer md:hidden">
          <Share2 className="mr-2 h-4 w-4" />
          <span>Compartir (Móvil)</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="md:hidden" />

        <DropdownMenuItem onClick={handleWhatsAppShare} className="cursor-pointer">
          <MessageCircle className="mr-2 h-4 w-4" />
          <span>WhatsApp</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleFacebookShare} className="cursor-pointer">
          <Facebook className="mr-2 h-4 w-4" />
          <span>Facebook</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleTwitterShare} className="cursor-pointer">
            <Twitter className="mr-2 h-4 w-4" />
            <span>X (Twitter)</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleCopyForInstagram} className="cursor-pointer">
          <Instagram className="mr-2 h-4 w-4" />
          <span>Copiar para Instagram</span>
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
