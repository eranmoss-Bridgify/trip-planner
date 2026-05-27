import os
import random
import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
from apps.common import db

SESSION_COOKIE = 'wv_session'
SESSION_DAYS = 7


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def generate_otp() -> str:
    return str(random.randint(100000, 999999))


def save_otp(user_id: str, otp: str):
    expires = datetime.now(timezone.utc) + timedelta(minutes=10)
    db.query(
        'INSERT INTO trip_planner.otp_tokens (user_id, token, expires_at) VALUES (%s, %s, %s)',
        [user_id, otp, expires],
    )


def verify_otp(user_id: str, otp: str) -> bool:
    rows = db.query(
        '''SELECT id FROM trip_planner.otp_tokens
           WHERE user_id = %s AND token = %s AND used = false AND expires_at > NOW()
           ORDER BY created_at DESC LIMIT 1''',
        [user_id, otp],
    )
    if not rows:
        return False
    db.query('UPDATE trip_planner.otp_tokens SET used = true WHERE id = %s', [rows[0]['id']])
    return True


def create_session(user_id: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)
    token = jwt.encode(
        {'sub': str(user_id), 'exp': expires},
        os.environ['JWT_SECRET'],
        algorithm='HS256',
    )
    db.query(
        'INSERT INTO trip_planner.sessions (user_id, token, expires_at) VALUES (%s, %s, %s)',
        [user_id, token, expires],
    )
    return token


def get_session_user(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, os.environ['JWT_SECRET'], algorithms=['HS256'])
        user_id = payload['sub']
        rows = db.query(
            'SELECT id, email, name FROM trip_planner.users WHERE id = %s',
            [user_id],
        )
        return rows[0] if rows else None
    except Exception:
        return None


def delete_session(token: str):
    db.query('DELETE FROM trip_planner.sessions WHERE token = %s', [token])


def require_user(request) -> dict | None:
    token = request.COOKIES.get(SESSION_COOKIE)
    if not token:
        return None
    return get_session_user(token)


def set_session_cookie(response, token: str):
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=SESSION_DAYS * 86400,
        httponly=True,
        samesite='Lax',
        secure=not __debug__,
        path='/',
    )


def clear_session_cookie(response):
    response.delete_cookie(SESSION_COOKIE, path='/')
