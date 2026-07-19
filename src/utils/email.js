import nodemailer from 'nodemailer';

export async function sendEmail(to, subject, html) {

    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    const fromName = process.env.SENDER_FROM?.trim();
    const senderEmail = process.env.SENDER_EMAIL?.trim();
    const from = `"${fromName}" <${senderEmail}>`; 

    
    const transportOptions = {
        host,
        port,
        secure: port === 465, // True for 465, false for 587
        auth: {
            user,
            pass
        },
        authMethod: 'PLAIN', // Forces Nodemailer to avoid picking conflicting MD5 handshake sequences
        tls: {
            rejectUnauthorized: false // Prevents local Windows network/firewall policies from blocking the handshake
        }
    };

    const transporter = nodemailer.createTransport(transportOptions);

    // 3. ATTEMPTING EXECUTION
    try {
        console.log(`[Email] Sending email to ${to} with subject "${subject}"...`);

        const info = await transporter.sendMail({
            from,
            to,
            subject,
            html
        });

        console.log(`[Email] Email sent successfully: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error(`[Email] Error sending email to ${to}:`, error);
        throw error;
    }
}