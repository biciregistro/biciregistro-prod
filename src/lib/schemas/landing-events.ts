// src/lib/schemas/landing-events.ts
import { z } from "zod";

export const landingEventsHeroSchema = z.object({
    title: z.string().min(10, "El título es muy corto."),
    subtitle: z.string().min(10, "El subtítulo es muy corto."),
    ctaButton: z.string().min(5, "El texto del botón es muy corto."),
    trustCopy: z.string().min(10, "El texto de confianza es muy corto."),
    backgroundImageUrl: z.string().url("La URL de la imagen de fondo no es válida."),
});

export const landingEventsPainPointSchema = z.object({
    id: z.string(),
    title: z.string().min(5, "El título es muy corto."),
    description: z.string().min(10, "La descripción es muy corta."),
});

export const landingEventsSolutionSchema = z.object({
    id: z.string(),
    title: z.string().min(5, "El título es muy corto."),
    description: z.string().min(10, "La descripción es muy corta."),
});

export const landingEventsFeatureSchema = z.object({
    title: z.string().min(10, "El título es muy corto."),
    description: z.string().min(10, "La descripción es muy corta."),
    imageUrl: z.string().url("La URL de la imagen no es válida."),
});

export const landingEventsCtaSchema = z.object({
    title: z.string().min(10, "El título es muy corto."),
    description: z.string().min(10, "La descripción es muy corta."),
    ctaButton: z.string().min(5, "El texto del botón es muy corto."),
});

export const landingEventsAllySchema = z.object({
    name: z.string().min(3, "El nombre del aliado es muy corto."),
    logoUrl: z.string().url("La URL del logo no es válida."),
});

export const landingEventsPainPointsSectionSchema = z.object({
    title: z.string().min(10, "El título de la sección es muy corto."),
    points: z.tuple([landingEventsPainPointSchema, landingEventsPainPointSchema, landingEventsPainPointSchema]),
});

export const landingEventsSolutionSectionSchema = z.object({
    title: z.string().min(10, "El título de la sección es muy corto."),
    solutions: z.tuple([landingEventsSolutionSchema, landingEventsSolutionSchema, landingEventsSolutionSchema]),
});

export const landingEventsSocialProofSectionSchema = z.object({
    allies: z.array(landingEventsAllySchema).optional().default([]),
});

export const landingEventsCtaSectionSchema = landingEventsCtaSchema;

// Schema completo (útil para tipos, pero no se usará para la validación del formulario completo)
export const landingEventsContentSchema = z.object({
    hero: landingEventsHeroSchema,
    painPointsSection: landingEventsPainPointsSectionSchema,
    solutionSection: landingEventsSolutionSectionSchema,
    featureSection: landingEventsFeatureSchema,
    socialProofSection: landingEventsSocialProofSectionSchema,
    ctaSection: landingEventsCtaSectionSchema,
});
