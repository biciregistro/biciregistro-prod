import { Metadata } from 'next';
import { GamificationRulesEditor } from '@/components/admin/gamification/rules-editor';

export const metadata: Metadata = {
    title: 'Admin Gamificación | BiciRegistro',
    description: 'Gestiona las recompensas y niveles de la comunidad.',
};

export default function GamificationPage() {
    return (
        <div className="space-y-6 p-4">
            <h1 className="text-3xl font-bold tracking-tight">Gamificación "Rodada Infinita"</h1>
            <p className="text-muted-foreground">Configura los valores de Kilómetros que los usuarios ganan por sus acciones.</p>
            
            <div className="grid gap-6">
                <GamificationRulesEditor />
            </div>
        </div>
    );
}
