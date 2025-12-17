// src/components/admin/landing-editor/landing-events-editor.tsx
'use client';

import React from 'react';
import { LandingEventsContent } from '@/lib/types';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Usar rutas absolutas
import { HeroForm } from '@/components/admin/landing-editor/hero-form';
import { PainPointsForm } from '@/components/admin/landing-editor/pain-points-form';
import { SolutionForm } from '@/components/admin/landing-editor/solution-form';
import { FeatureForm } from '@/components/admin/landing-editor/feature-form';
import { CtaForm } from '@/components/admin/landing-editor/cta-form';

interface LandingEventsEditorProps {
  content: LandingEventsContent;
}

export function LandingEventsEditor({ content }: LandingEventsEditorProps) {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Editor de Contenido - Landing "Events Manager"</CardTitle>
          <CardDescription>
            Modifica los textos e imágenes de cada sección de forma independiente.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Pass data as props to independent forms */}
      <HeroForm initialData={content.hero} />
      <PainPointsForm initialData={content.painPointsSection} />
      <SolutionForm initialData={content.solutionSection} />
      <FeatureForm initialData={content.featureSection} />
      {/* CtaForm handles both social proof and CTA section? 
          Originally it handled both. Let's keep it that way for UI cohesion, 
          OR split them. The schemas split them.
          Let's update CtaForm to handle both but maybe trigger two actions? 
          Or better, split CtaForm into SocialProofForm and CtaMainForm.
          For now, let's keep CtaForm but aware it might need to call two actions 
          or we update CtaForm to just handle the CTA part and create a new one for Allies.
          Looking at previous CtaForm, it had both. 
          To keep it simple per section save, let's split it visually or logically.
      */}
      <CtaForm 
        ctaData={content.ctaSection} 
        socialProofData={content.socialProofSection} 
      />
    </div>
  );
}
