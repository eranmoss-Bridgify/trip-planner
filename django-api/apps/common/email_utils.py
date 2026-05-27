import os
import resend

resend.api_key = os.getenv('RESEND_API_KEY', '')
FROM = os.getenv('RESEND_FROM', 'onboarding@resend.dev')


def send_otp_email(to: str, otp: str):
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f'[OTP] {to} code={otp}')  # always log so devs can verify without email
    print(f'[OTP] {to} code={otp}', flush=True)
    try:
        resend.Emails.send({
            'from': FROM,
            'to': to,
            'subject': 'Your WanderVault verification code',
            'html': f'''
                <div style="font-family:sans-serif;max-width:400px;margin:0 auto">
                    <h2 style="color:#4f46e5">WanderVault</h2>
                    <p>Your one-time verification code is:</p>
                    <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#4f46e5;padding:16px 0">{otp}</div>
                    <p style="color:#6b7280;font-size:14px">This code expires in 10 minutes. Do not share it with anyone.</p>
                </div>
            ''',
        })
    except Exception as e:
        logger.warning(f'[OTP] email send failed (non-fatal): {e}')
