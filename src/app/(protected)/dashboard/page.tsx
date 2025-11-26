import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getAuthenticatedUser, getBikes, getUserEventRegistrations } from '@/lib/data';
import type { User } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DashboardTabs } from '@/components/dashboard/dashboard-tabs';

import { PlusCircle, Edit } from 'lucide-react';

// --- Helper function to check if the user profile is complete ---
const isProfileComplete = (user: User): boolean => {
    // A profile is considered incomplete if essential fields are missing.
    // birthDate is a good indicator as it is only added on the profile edit page.
    return !!user.birthDate && !!user.country && !!user.state;
};

// --- Action Panel Component ---
function ActionPanel({ user, isComplete }: { user: User, isComplete: boolean }) {
    return (
        <div className="p-6 bg-card border rounded-lg mb-8">
            <h1 className="text-2xl font-bold">¡Hola, {user.name}!</h1>
            <p className="text-muted-foreground mb-4">
                {isComplete 
                    ? "Bienvenido de nuevo a tu garaje. Desde aquí puedes gestionar tus bicicletas y tu perfil."
                    : "¡Bienvenido a BiciRegistro! Completa tu perfil para poder registrar tu primera bicicleta."
                }
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild>
                    <Link href="/dashboard/profile">
                        <Edit className="mr-2 h-4 w-4" />
                        {isComplete ? 'Editar Perfil' : 'Completa tu perfil'}
                    </Link>
                </Button>
                
                {isComplete ? (
                    <Button asChild>
                        <Link href="/dashboard/register">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Registrar Bici
                        </Link>
                    </Button>
                ) : (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                {/* The span is necessary for the tooltip to work on a disabled button */}
                                <span tabIndex={0}>
                                    <Button disabled className="w-full sm:w-auto">
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Registrar Bici
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Por favor completa tu perfil antes de registrar una bicicleta.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
        </div>
    );
}

// --- Main Dashboard Page ---
export default async function DashboardPage() {
    const user = await getAuthenticatedUser();
    
    if (!user) {
        redirect('/login');
    }

    const profileIsComplete = isProfileComplete(user);
    const bikes = profileIsComplete ? await getBikes(user.id) : [];
    // Optimization: Don't fetch registrations if profile is incomplete
    const allRegistrations = profileIsComplete ? await getUserEventRegistrations(user.id) : [];
    // Filter out cancelled registrations so they don't clutter the dashboard
    const registrations = allRegistrations.filter(reg => reg.status !== 'cancelled');

    return (
        <div className="container max-w-5xl mx-auto py-6 md:py-8 px-4">
            {/* Action Panel */}
            <ActionPanel user={user} isComplete={profileIsComplete} />

            {/* Tabs Section */}
            <DashboardTabs 
                bikes={bikes} 
                registrations={registrations} 
                user={user} 
                isProfileComplete={profileIsComplete}
            />
        </div>
    );
}
