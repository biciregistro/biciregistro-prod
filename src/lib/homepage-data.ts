// src/lib/homepage-data.ts
import type { HomepageSection } from './types';

/**
 * Provides the default, pre-defined content for the homepage sections.
 * This data is used as a fallback when the Firestore 'homepage' collection is empty.
 * It ensures that the homepage always displays meaningful content, even before
 * an administrator has configured it via a management panel.
 */
export const defaultHomepageData: { [key: string]: HomepageSection } = {
  hero: {
    id: 'hero',
    title: 'Registra tu Bici, Protege tu Pasión',
    subtitle: 'La plataforma comunitaria para registrar, transferir y reportar bicicletas de forma segura y confiable.',
    ctaButton: {
      text: 'Registra tu Bici Gratis',
      href: '/dashboard/register',
    },
    secondaryButton: {
      text: 'Buscar Bici por Serial',
      href: '/search',
    },
    imageUrl: 'https://images.unsplash.com/photo-1664853811022-33e391e36169?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw4fHxjeWNsaXN0JTIwc3Vuc2V0fGVufDB8fHx8MTc2MTg5MTcyMnww&ixlib=rb-4.1.0&q=80&w=1080',
    imageHint: 'Un ciclista en una ruta escénica al atardecer',
  },
  features: {
    id: 'features',
    title: '¿Por Qué BiciRegistro?',
    subtitle: 'Te ofrecemos herramientas simples y potentes para la seguridad de tu bicicleta.',
    items: [
      {
        title: 'Registro Único y Permanente',
        description: 'Asocia el número de serial de tu bici a tu identidad de forma permanente. Un registro digital que te acompaña siempre.',
        imageUrl: 'https://images.unsplash.com/photo-1602226348831-e263d0f7acd2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw4fHxiaWtlJTIwUVJjb2RlfGVufDB8fHx8MTc2MTkyNzAxN3ww&ixlib=rb-4.1.0&q=80&w=1080',
        imageHint: 'Persona escaneando un código QR en una bicicleta',
      },
      {
        title: 'Reporte de Robo Simplificado',
        description: 'En caso de robo, marca tu bici como robada al instante. Esto alerta a la comunidad y a potenciales compradores.',
        imageUrl: 'https://images.unsplash.com/photo-1732724081252-a0a92895558a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxtYXAlMjBsb2NhdGlvbnxlbnwwfHx8fDE3NjE4MzgzNzN8MA&ixlib=rb-4.1.0&q=80&w=1080',
        imageHint: 'Un mapa mostrando una ubicación reportada',
      },
      {
        title: 'Comunidad Conectada',
        description: 'Al buscar una bici de segunda mano, verifica su estado en nuestra base de datos para evitar comprar artículos robados.',
        imageUrl: 'https://images.unsplash.com/photo-1750064960540-4369ab71ccdc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHxjeWNsaXN0cyUyMGNvbW11bml0eXxlbnwwfHx8fDE3NjE5MjcwMTZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
        imageHint: 'Un grupo de ciclistas conversando',
      },
    ],
  },
  cta: {
    id: 'cta',
    title: '¿Listo para unirte a la comunidad?',
    subtitle: 'El registro es rápido, fácil y el primer paso para proteger tu bicicleta. No esperes a que sea demasiado tarde.',
    ctaButton: {
      text: 'Comienza Ahora',
      href: '/signup',
    },
    imageUrl: 'https://images.unsplash.com/photo-1605621290414-c8b7498408fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxiaWtlJTIwbG9ja3xlbnwwfHx8fDE3NjE5MjcwMTd8MA&ixlib=rb-4.1.0&q=80&w=1080',
    imageHint: 'Un ciclista asegurando su bicicleta en un estacionamiento',
  },
};
