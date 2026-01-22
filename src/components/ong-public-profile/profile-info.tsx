import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Facebook, Instagram, Globe, MessageCircle } from 'lucide-react';
import type { OngUser } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

interface ProfileInfoProps {
  ong: Omit<OngUser, 'email' | 'role'>;
}

export function ProfileInfo({ ong }: ProfileInfoProps) {
  return (
    <Card className="shadow-sm border-primary/10 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-bold">Sobre Nosotros</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Description */}
        <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
          {ong.description || "Esta organización aún no ha proporcionado una descripción."}
        </p>

        <Separator className="bg-primary/5" />

        {/* Social Links & Location Info */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Conéctate con nosotros</h4>
          <div className="flex flex-wrap gap-3">
            {ong.facebookUrl && (
              <Button variant="outline" size="sm" className="rounded-full gap-2 border-primary/10 hover:border-primary/30" asChild>
                <a href={ong.facebookUrl} target="_blank" rel="noopener noreferrer">
                  <Facebook className="h-4 w-4 text-blue-600" />
                  <span className="hidden sm:inline">Facebook</span>
                </a>
              </Button>
            )}
            {ong.instagramUrl && (
              <Button variant="outline" size="sm" className="rounded-full gap-2 border-primary/10 hover:border-primary/30" asChild>
                <a href={ong.instagramUrl} target="_blank" rel="noopener noreferrer">
                  <Instagram className="h-4 w-4 text-pink-600" />
                  <span className="hidden sm:inline">Instagram</span>
                </a>
              </Button>
            )}
            {ong.websiteUrl && (
              <Button variant="outline" size="sm" className="rounded-full gap-2 border-primary/10 hover:border-primary/30" asChild>
                <a href={ong.websiteUrl} target="_blank" rel="noopener noreferrer">
                  <Globe className="h-4 w-4 text-primary" />
                  <span className="hidden sm:inline">Sitio Web</span>
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Contact Button */}
        <div className="pt-2">
          <Button className="w-full bg-green-500 hover:bg-green-600 text-white gap-2 h-12 text-lg shadow-md" asChild>
            <a 
              href={`https://wa.me/${ong.organizationWhatsapp.replace(/\+/g, '').replace(/\s/g, '')}`} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-5 w-5" />
              Contactar por WhatsApp
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
