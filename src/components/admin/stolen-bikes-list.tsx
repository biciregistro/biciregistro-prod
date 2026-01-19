"use client"

import { Bike, User } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import { Calendar, MapPin, User as UserIcon, Archive, Share2 } from "lucide-react"
import { AdminStolenShareWrapper } from "./admin-stolen-share-wrapper"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface StolenBikesListProps {
  bikes: (Bike & { owner?: User })[]
}

export function StolenBikesList({ bikes }: StolenBikesListProps) {
  // Clasificar las bicicletas
  const pendingBikes = bikes.filter(bike => !bike.adminSharedAt);
  const sharedBikes = bikes.filter(bike => !!bike.adminSharedAt);

  if (bikes.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
        <p className="text-muted-foreground">No hay reportes de robo activos en el sistema.</p>
      </div>
    )
  }

  const renderBikeCard = (bike: Bike & { owner?: User }) => (
    <Card key={bike.id} className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          {/* Thumbnail */}
          <div className="w-full md:w-48 h-48 md:h-auto relative bg-muted">
            <Image
              src={bike.photos[0] || "/placeholder.svg"}
              alt={`${bike.make} ${bike.model}`}
              fill
              className="object-cover"
            />
          </div>

          {/* Contenido */}
          <div className="flex-1 p-4 flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                <div>
                  <h3 className="font-bold text-xl">{bike.make} {bike.model}</h3>
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{bike.serialNumber}</p>
                </div>
                {bike.owner && (
                  <div className="flex items-center gap-1.5 text-sm bg-muted/50 px-2 py-1 rounded text-muted-foreground">
                    <UserIcon className="h-3.5 w-3.5" />
                    <span className="font-medium">{bike.owner.name} {bike.owner.lastName}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>
                    Robada el: {bike.theftReport?.date ? new Date(bike.theftReport.date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Fecha no disponible'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="line-clamp-1">
                    Lugar: {bike.theftReport?.location}, {bike.theftReport?.city}
                  </span>
                </div>
              </div>
              
              {bike.theftReport?.reward && bike.theftReport.reward !== '0' && (
                <div className="mt-3 inline-block bg-red-50 text-red-700 text-xs font-bold px-2 py-1 rounded border border-red-100">
                    RECOMPENSA: ${new Intl.NumberFormat('es-MX').format(Number(bike.theftReport.reward))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end items-center border-t pt-4">
              {bike.owner ? (
                <AdminStolenShareWrapper bike={bike} owner={bike.owner} />
              ) : (
                <p className="text-xs text-destructive italic">Error: Propietario no encontrado</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Tabs defaultValue="pending" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="pending" className="gap-2">
          <Share2 className="h-4 w-4" />
          Pendientes ({pendingBikes.length})
        </TabsTrigger>
        <TabsTrigger value="shared" className="gap-2">
          <Archive className="h-4 w-4" />
          Difundidas / Historial ({sharedBikes.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="space-y-4">
        {pendingBikes.length > 0 ? (
          pendingBikes.map(renderBikeCard)
        ) : (
          <div className="text-center py-12 bg-muted/10 rounded-lg border-2 border-dashed">
            <p className="text-muted-foreground">¡Buen trabajo! No hay alertas pendientes de difundir.</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="shared" className="space-y-4">
        {sharedBikes.length > 0 ? (
          sharedBikes.map(renderBikeCard)
        ) : (
          <div className="text-center py-12 bg-muted/10 rounded-lg border-2 border-dashed">
            <p className="text-muted-foreground">Aún no has difundido alertas desde este panel.</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
