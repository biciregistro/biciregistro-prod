'use client';

import { HomepageSection } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

import { SectionEditForm } from './section-edit-form';
import { AlliesEditForm } from './allies-edit-form';
import { FeatureItemEditForm } from './features-edit-form';
import { SecurityEditForm } from './security-edit-form';

function MissingSectionWarning({ sectionName }: { sectionName: string }) {
    return (
        <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Error de Datos</AlertTitle>
            <AlertDescription>
                La sección &quot;{sectionName}&quot; no se pudo encontrar.
                Es posible que los datos no existan en la base de datos o que haya un problema al cargarlos.
                Contacta a un administrador para verificar la colección <code className="font-mono bg-muted px-1 rounded-sm">homepage</code> en Firestore.
            </AlertDescription>
        </Alert>
    );
}

export function HomepageEditor({ sections }: { sections: HomepageSection[] }) {
    const heroSection = sections.find(s => s.id === 'hero');
    const alliesSection = sections.find(s => s.id === 'allies');
    const featuresSection = sections.find(s => s.id === 'features');
    const securitySection = sections.find(s => s.id === 'security');
    const ctaSection = sections.find(s => s.id === 'cta');
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Editor de Contenido de la Página Principal</CardTitle>
                <CardDescription>
                    Actualiza el contenido para las secciones de la página de inicio. Los cambios se reflejan inmediatamente.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="hero">
                    <TabsList className="grid w-full grid-cols-5"> {/* Increased grid cols */}
                        <TabsTrigger value="hero">Sección Hero</TabsTrigger>
                        <TabsTrigger value="allies">Aliados</TabsTrigger>
                        <TabsTrigger value="features">Características</TabsTrigger>
                        <TabsTrigger value="security">Seguridad</TabsTrigger> {/* New Tab */}
                        <TabsTrigger value="cta">Llamada a la Acción</TabsTrigger>
                    </TabsList>

                    <TabsContent value="hero" className="pt-6">
                        {heroSection ? <SectionEditForm section={heroSection} /> : <MissingSectionWarning sectionName="Hero" />}
                    </TabsContent>
                    
                    <TabsContent value="allies" className="pt-6">
                         {alliesSection && alliesSection.id === 'allies' 
                            ? <AlliesEditForm section={alliesSection} /> 
                            : <MissingSectionWarning sectionName="Aliados (Allies)" />
                         }
                    </TabsContent>

                    <TabsContent value="features" className="pt-6">
                        {featuresSection ? (
                            <>
                                <SectionEditForm section={featuresSection} />
                                <div className="my-6 border-t" />
                                <div className="space-y-6">
                                    <h3 className="text-lg font-semibold tracking-tight">
                                        Características Individuales
                                    </h3>
                                    {featuresSection.features?.map((feature: any, index: number) => (
                                       <FeatureItemEditForm key={feature.id || index} feature={feature} featureId={feature.id} />
                                    ))}
                                </div>
                            </>
                        ) : <MissingSectionWarning sectionName="Features" />}
                    </TabsContent>

                    <TabsContent value="security" className="pt-6">
                         {securitySection && securitySection.id === 'security'
                            ? <SecurityEditForm section={securitySection} />
                            : <MissingSectionWarning sectionName="Seguridad" />
                         }
                    </TabsContent>

                    <TabsContent value="cta" className="pt-6">
                         {ctaSection ? <SectionEditForm section={ctaSection} /> : <MissingSectionWarning sectionName="Call to Action (CTA)" />}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
