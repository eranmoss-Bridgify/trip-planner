import json
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from apps.common import db, auth_utils, email_utils


@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(View):
    def post(self, request):
        try:
            body = json.loads(request.body)
        except Exception:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        email = (body.get('email') or '').lower().strip()
        password = body.get('password', '')
        name = body.get('name')

        if not email or not password:
            return JsonResponse({'error': 'Email and password required'}, status=400)

        existing = db.query('SELECT id FROM trip_planner.users WHERE email = %s', [email])
        if existing:
            return JsonResponse({'error': 'Email already registered'}, status=409)

        password_hash = auth_utils.hash_password(password)
        rows = db.query(
            'INSERT INTO trip_planner.users (email, name, password_hash) VALUES (%s, %s, %s) RETURNING id, email, name',
            [email, name, password_hash],
        )
        user = rows[0]

        otp = auth_utils.generate_otp()
        auth_utils.save_otp(str(user['id']), otp)
        email_utils.send_otp_email(user['email'], otp)

        return JsonResponse({'userId': str(user['id']), 'step': 'verify-otp'})


@method_decorator(csrf_exempt, name='dispatch')
class LoginView(View):
    def post(self, request):
        try:
            body = json.loads(request.body)
        except Exception:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        email = (body.get('email') or '').lower().strip()
        password = body.get('password', '')

        if not email or not password:
            return JsonResponse({'error': 'Email and password required'}, status=400)

        rows = db.query(
            'SELECT id, email, name, password_hash FROM trip_planner.users WHERE email = %s',
            [email],
        )
        if not rows:
            return JsonResponse({'error': 'Invalid credentials'}, status=401)

        user = rows[0]
        if not auth_utils.verify_password(password, user['password_hash']):
            return JsonResponse({'error': 'Invalid credentials'}, status=401)

        otp = auth_utils.generate_otp()
        auth_utils.save_otp(str(user['id']), otp)
        email_utils.send_otp_email(user['email'], otp)

        return JsonResponse({'userId': str(user['id']), 'step': 'verify-otp'})


@method_decorator(csrf_exempt, name='dispatch')
class VerifyOtpView(View):
    def post(self, request):
        try:
            body = json.loads(request.body)
        except Exception:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        user_id = body.get('userId')
        otp = body.get('otp')

        if not user_id or not otp:
            return JsonResponse({'error': 'userId and otp required'}, status=400)

        if not auth_utils.verify_otp(str(user_id), str(otp)):
            return JsonResponse({'error': 'Invalid or expired code'}, status=401)

        rows = db.query(
            'SELECT id, email, name FROM trip_planner.users WHERE id = %s', [user_id]
        )
        if not rows:
            return JsonResponse({'error': 'User not found'}, status=404)

        user = rows[0]
        token = auth_utils.create_session(str(user['id']))

        res = JsonResponse({'user': {'id': str(user['id']), 'email': user['email'], 'name': user['name']}})
        auth_utils.set_session_cookie(res, token)
        return res


@method_decorator(csrf_exempt, name='dispatch')
class LogoutView(View):
    def post(self, request):
        token = request.COOKIES.get(auth_utils.SESSION_COOKIE)
        if token:
            auth_utils.delete_session(token)
        res = JsonResponse({'ok': True})
        auth_utils.clear_session_cookie(res)
        return res


class MeView(View):
    def get(self, request):
        user = auth_utils.require_user(request)
        if not user:
            return JsonResponse({'user': None})
        return JsonResponse({'user': {'id': str(user['id']), 'email': user['email'], 'name': user['name']}})
