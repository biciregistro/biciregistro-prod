"use client"

import { Bike, User } from "@/lib/types"
import { BikeTheftShareMenu } from "@/components/dashboard/bike-theft-share-menu"
import { markBikeAsSharedAction } from "@/lib/actions/bike-actions"
import { useState } from "react"
import { CheckCircle2, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface AdminStolenShareWrapperProps {
  bike: Bike
  owner: User
}

export function AdminStolenShareWrapper({ bike, owner }: AdminStolenShareWrapperProps) {
  const [isShared, setIsShared] = useState(!!bike.adminSharedAt);

  const handleShareClick = async () => {
    // Al abrir el menú no marcamos, marcamos solo si el usuario interactuó con el componente.
    // Como no podemos saber con certeza si publicaron en FB (por limitaciones de API),
    // asumimos que si abrieron el menú de compartir de un admin, la intención es difundir.
    if (!isShared) {
        const result = await markBikeAsSharedAction(bike.id);
        if (result.success) {
            setIsShared(true);
        }
    }
  };

  return (
    <div className="flex flex-col gap-2 items-center sm:items-start" onClick={handleShareClick}>
      <BikeTheftShareMenu bike={bike} user={owner} />
      {isShared ? (
        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 gap-1 mt-1">
            <CheckCircle2 className="h-3 w-3" /> Difundido
        </Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground gap-1 mt-1 italic">
            <Clock className="h-3 w-3" /> Pendiente
        </Badge>
      )}
    </div>
  );
}
