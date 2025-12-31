import { Resend } from 'resend';
import { getRegistrationEmailTemplate } from './templates/registration';
import { Event, User, EventRegistration } from '@/lib/types';

// Initialize Resend only if API key is present
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Sender Identity (Should be verified domain in production)
// For development/testing without domain, Resend uses 'onboarding@resend.dev'
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'BiciRegistro <no-reply@biciregistro.mx>';

interface EmailServiceData {
    event: Event;
    user: User;
    registration: EventRegistration;
}

export async function sendRegistrationEmail({ event, user, registration }: EmailServiceData) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://biciregistro.mx';
    const dashboardUrl = `${baseUrl}/dashboard/events/${event.id}`;
    
    const { subject, html, text } = getRegistrationEmailTemplate({
        event,
        user,
        registration,
        publicUrl: `${baseUrl}/events/${event.id}`,
        dashboardUrl,
        ticketUrl: dashboardUrl
    });

    if (!resend) {
        console.log('------------------------------------------------');
        console.log(`[MOCK EMAIL SERVICE]`);
        console.log(`To: ${user.email}`);
        console.log(`Subject: ${subject}`);
        console.log(`Link: ${dashboardUrl}`);
        console.log('------------------------------------------------');
        return { success: true, id: 'mock-id-123' };
    }

    try {
        const data = await resend.emails.send({
            from: FROM_EMAIL,
            to: [user.email],
            subject: subject,
            html: html,
            text: text,
        });

        if (data.error) {
            console.error("Resend API Error:", data.error);
            return { success: false, error: data.error };
        }

        return { success: true, id: data.data?.id };
    } catch (error) {
        console.error("Email Service Exception:", error);
        return { success: false, error };
    }
}
