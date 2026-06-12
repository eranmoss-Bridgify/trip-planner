import { Resend } from 'resend';

// Lazy init — constructing Resend at module scope throws when the API key is
// absent, which breaks `next build` (no .env.local inside the Docker build).
let resend: Resend | null = null;
function getResend(): Resend {
    resend ??= new Resend(process.env.RESEND_API_KEY);
    return resend;
}
const from = process.env.RESEND_FROM ?? 'onboarding@resend.dev';

export async function sendOtpEmail(to: string, otp: string) {
    await getResend().emails.send({
        from,
        to,
        subject: 'Your WanderVault verification code',
        html: `
            <div style="font-family:sans-serif;max-width:400px;margin:0 auto">
                <h2 style="color:#4f46e5">WanderVault</h2>
                <p>Your one-time verification code is:</p>
                <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#4f46e5;padding:16px 0">${otp}</div>
                <p style="color:#6b7280;font-size:14px">This code expires in 10 minutes. Do not share it with anyone.</p>
            </div>
        `,
    });
}
