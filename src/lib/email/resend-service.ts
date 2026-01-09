import { Resend } from 'resend';
import { getRegistrationEmailTemplate } from './templates/registration';
import { getWelcomeEmailTemplate } from './templates/welcome';
import { Event, User, EventRegistration } from '@/lib/types';

// Initialize Resend only if API key is present
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Sender Identity (Should be verified domain in production)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'BiciRegistro <no-reply@biciregistro.mx>';

interface RegistrationEmailData {
    event: Event;
    user: User;
    registration: EventRegistration;
}

export async function sendRegistrationEmail({ event, user, registration }: RegistrationEmailData) {
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
        console.log('--- [MOCK REGISTRATION EMAIL] ---');
        console.log(`To: ${user.email}`);
        console.log(`Subject: ${subject}`);
        console.log('---------------------------------');
        return { success: true, id: 'mock-reg-id' };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [user.email],
            subject: subject,
            html: html,
            text: text,
        });

        if (error) {
            console.error("Resend API Error (Registration):", error);
            return { success: false, error };
        }

        return { success: true, id: data?.id };
    } catch (error) {
        console.error("Email Service Exception (Registration):", error);
        return { success: false, error };
    }
}

interface WelcomeEmailData {
    name: string;
    email: string;
}

export async function sendWelcomeEmail({ name, email }: WelcomeEmailData) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://biciregistro.mx';
    const dashboardUrl = `${baseUrl}/dashboard`;
    const privacyPolicyUrl = `${baseUrl}/privacy`;

    const { subject, html, text } = getWelcomeEmailTemplate({
        name,
        dashboardUrl,
        privacyPolicyUrl,
    });

    if (!resend) {
        console.log('--- [MOCK WELCOME EMAIL] ---');
        console.log(`To: ${email}`);
        console.log(`Subject: ${subject}`);
        console.log('----------------------------');
        return { success: true, id: 'mock-welcome-id' };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [email],
            subject: subject,
            html: html,
            text: text,
        });

        if (error) {
            console.error("Resend API Error (Welcome):", error);
            return { success: false, error };
        }

        return { success: true, id: data?.id };
    } catch (error) {
        console.error("Email Service Exception (Welcome):", error);
        return { success: false, error };
    }
}
