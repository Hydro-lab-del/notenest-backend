import nodemailer from 'nodemailer';

export async function sendEmail(to, subject, html) {
    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    const fromName = process.env.SENDER_FROM?.trim();
    const senderEmail = process.env.SENDER_EMAIL?.trim();
    const from = `"${fromName}" <${senderEmail}>`; 

    // 1. BREVO REST API (Bypasses Render SMTP Timeouts on port 465/587)
    if (host && host.toLowerCase().includes('brevo')) {
        console.log(`[Email] Sending via Brevo REST API to ${to}...`);
        try {
            const apiKey = (process.env.BREVO_API_KEY || pass || '').trim();
            if (!apiKey.startsWith('xkeysib-')) {
                console.warn('[Email] WARNING: The Brevo API key does not start with "xkeysib-". It might be an invalid or SMTP-only key.');
            }

            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': apiKey,
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    sender: { name: fromName, email: senderEmail },
                    to: [{ email: to }],
                    subject: subject,
                    htmlContent: html
                })
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Brevo API Error: ${response.status} - ${errorData}`);
            }

            console.log(`[Email] Email sent successfully via Brevo REST API!`);
            return await response.json();
        } catch (error) {
            console.error(`[Email] Error sending via Brevo API:`, error);
            throw error;
        }
    }

    // 2. STANDARD SMTP FALLBACK (For Gmail, SendGrid, etc.)
    const transportOptions = {
        host,
        port,
        secure: port === 465,
        auth: {
            user,
            pass
        },
        authMethod: 'PLAIN',
        tls: {
            rejectUnauthorized: false
        }
    };

    const transporter = nodemailer.createTransport(transportOptions);

    try {
        console.log(`[Email] Sending email to ${to} via SMTP...`);
        const info = await transporter.sendMail({ from, to, subject, html });
        console.log(`[Email] Email sent successfully via SMTP: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error(`[Email] Error sending email via SMTP:`, error);
        throw error;
    }
}