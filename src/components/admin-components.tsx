'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updateHomepageSection } from '@/lib/actions';
import type { HomepageSection } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

function SubmitButton() {
    const { pending } = useFormStatus();
    return <Button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Save Changes'}</Button>;
}

function SectionEditForm({ section }: { section: HomepageSection }) {
    const [state, formAction] = useFormState(updateHomepageSection, null);
    const { toast } = useToast();
    
    useEffect(() => {
        if(state?.message) {
            toast({
                title: "Success",
                description: state.message,
            })
        }
        if(state?.error) {
            toast({
                variant: 'destructive',
                title: "Error",
                description: state.error,
            })
        }
    }, [state, toast])


    return (
        <form action={formAction} className="space-y-4">
            <input type="hidden" name="id" value={section.id} />
            <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" defaultValue={section.title} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input id="subtitle" name="subtitle" defaultValue={section.subtitle} />
            </div>
            {section.id === 'hero' && (
                 <div className="space-y-2">
                    <Label htmlFor="content">Content</Label>
                    <Textarea id="content" name="content" defaultValue={section.content} />
                </div>
            )}
            <SubmitButton />
        </form>
    );
}


export function HomepageEditor({ sections }: { sections: HomepageSection[] }) {
    const heroSection = sections.find(s => s.id === 'hero')!;
    const featuresSection = sections.find(s => s.id === 'features')!;
    const ctaSection = sections.find(s => s.id === 'cta')!;
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Homepage Content Editor</CardTitle>
                <CardDescription>
                    Update the text content for the main sections of the public homepage.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="hero">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="hero">Hero Section</TabsTrigger>
                        <TabsTrigger value="features">Features Section</TabsTrigger>
                        <TabsTrigger value="cta">CTA Section</TabsTrigger>
                    </TabsList>
                    <TabsContent value="hero" className="pt-4">
                        <SectionEditForm section={heroSection} />
                    </TabsContent>
                    <TabsContent value="features" className="pt-4">
                        <SectionEditForm section={featuresSection} />
                    </TabsContent>
                    <TabsContent value="cta" className="pt-4">
                        <SectionEditForm section={ctaSection} />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
