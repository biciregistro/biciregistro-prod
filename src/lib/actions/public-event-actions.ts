'use server';

import { adminDb as db } from '@/lib/firebase/server';
import { Event } from '@/lib/types';
import { startOfDay, endOfDay, isBefore, parseISO } from 'date-fns';

export type EventFilterParams = {
  search?: string;
  eventType?: string;
  modality?: string;
  country?: string;
  state?: string;
  startDate?: string;
  endDate?: string;
  isWeekend?: boolean;
};

// Helper para convertir fechas de Firestore (Timestamp) a String ISO
const sanitizeDate = (dateVal: any): string => {
  if (!dateVal) return new Date().toISOString(); // Fallback de seguridad
  if (typeof dateVal === 'string') return dateVal;
  // Si es un Timestamp de Firestore
  if (dateVal.toDate && typeof dateVal.toDate === 'function') {
    return dateVal.toDate().toISOString();
  }
  // Si es un objeto Date nativo
  if (dateVal instanceof Date) {
    return dateVal.toISOString();
  }
  return String(dateVal);
};

export async function getPublicEvents(filters: EventFilterParams): Promise<{ events: Event[]; error?: string }> {
  try {
    const eventsRef = db.collection('events');
    let query = eventsRef.where('status', '==', 'published');

    // 1. Filtrado Base en Firestore
    if (filters.country && filters.country !== 'all') {
      query = query.where('country', '==', filters.country);
    }
    
    if (filters.state && filters.state !== 'all') {
      query = query.where('state', '==', filters.state);
    }

    if (filters.eventType && filters.eventType !== 'all') {
      query = query.where('eventType', '==', filters.eventType);
    }

    if (filters.modality && filters.modality !== 'all') {
        query = query.where('modality', '==', filters.modality);
    }

    const snapshot = await query.get();
    
    // Mapeo y Sanitización de Datos
    let events = snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
        const data = doc.data();
        return { 
            id: doc.id, 
            ...data,
            // Asegurar que las fechas sean strings ISO
            date: sanitizeDate(data.date),
            registrationDeadline: data.registrationDeadline ? sanitizeDate(data.registrationDeadline) : undefined
        } as Event;
    });

    // 2. Filtrado en Memoria (Secondary Filtering)
    
    const now = new Date();
    const today = startOfDay(now);

    events = events.filter((event: Event) => {
        // Ahora event.date es seguro un string ISO
        const eventDate = parseISO(event.date);
        
        // A. Filtro de Fecha Base (Solo futuros o hoy)
        if (isBefore(eventDate, today)) {
            return false;
        }

        // B. Filtro de Cupo
        if (event.maxParticipants && event.currentParticipants && event.currentParticipants >= event.maxParticipants) {
            return false;
        }

        // C. Filtro de Búsqueda de Texto
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            const matchName = event.name.toLowerCase().includes(searchTerm);
            const matchDesc = event.description?.toLowerCase().includes(searchTerm) || false;
            const matchCity = event.state?.toLowerCase().includes(searchTerm) || false;
            
            if (!matchName && !matchDesc && !matchCity) {
                return false;
            }
        }

        // D. Filtro de Rango de Fechas
        if (filters.startDate) {
            const start = parseISO(filters.startDate);
            if (isBefore(eventDate, startOfDay(start))) return false;
        }

        if (filters.endDate) {
            const end = parseISO(filters.endDate);
            if (isBefore(endOfDay(end), eventDate)) return false;
        }

        return true;
    });

    events.sort((a: Event, b: Event) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { events };

  } catch (error) {
    console.error('Error fetching public events:', error);
    return { events: [], error: 'Failed to load events' };
  }
}
