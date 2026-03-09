import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface RewardFieldsProps {
    formData: any;
    handleChange: (field: string, value: any) => void;
}

export function RewardFieldsSection({ formData, handleChange }: RewardFieldsProps) {
    const isGiveaway = formData.type === 'giveaway';

    return (
        <div className="space-y-4 p-4 border rounded-md bg-amber-50/50">
            <h3 className="text-sm font-semibold text-amber-900 border-b pb-2">
                Configuración de {isGiveaway ? 'Sorteo / Rifa' : 'Recompensa'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="priceKm">Precio en KM *</Label>
                    <Input 
                        id="priceKm" 
                        type="number"
                        min="1"
                        placeholder="Ej. 150"
                        value={formData.priceKm || ''}
                        onChange={(e) => handleChange('priceKm', parseInt(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground">Costo que el ciclista pagará.</p>
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="totalCoupons">{isGiveaway ? 'Boletos Totales' : 'Cupones Disponibles'}</Label>
                    <Input 
                        id="totalCoupons" 
                        type="number"
                        min="0"
                        placeholder="0 = Ilimitado"
                        value={formData.totalCoupons === undefined ? '' : formData.totalCoupons}
                        onChange={(e) => handleChange('totalCoupons', e.target.value === '' ? 0 : parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Inventario total (0 es ilimitado).</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="maxPerUser">Máx por Usuario</Label>
                    <Input 
                        id="maxPerUser" 
                        type="number"
                        min="0"
                        placeholder="Default: 1"
                        value={formData.maxPerUser === undefined ? 1 : formData.maxPerUser}
                        onChange={(e) => handleChange('maxPerUser', e.target.value === '' ? 0 : parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Veces que 1 ciclista puede comprar (0 = sin límite).</p>
                </div>
            </div>

            <div className="space-y-2 mt-4">
                <Label htmlFor="description">Descripción Corta *</Label>
                <Textarea 
                    id="description" 
                    placeholder={isGiveaway ? "Ej. Participa por una bicicleta nueva de Montaña." : "Ej. Válido por un termo en tu siguiente visita a la tienda."}
                    value={formData.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={2}
                />
            </div>

            {!isGiveaway && (
                <div className="space-y-2 mt-4">
                    <Label htmlFor="conditions">Condiciones de Canje (Opcional)</Label>
                    <Textarea 
                        id="conditions" 
                        placeholder="- Presentar ID oficial\n- No acumulable con otras promociones"
                        value={formData.conditions || ''}
                        onChange={(e) => handleChange('conditions', e.target.value)}
                        rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                        Escribe las condiciones para canjear en tienda. Puedes usar guiones para viñetas.
                    </p>
                </div>
            )}
        </div>
    );
}
