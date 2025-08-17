# Quick-start Flask backend for local/offline use
# - Auth with secure cookie sessions
# - SQLite via SQLAlchemy
# - Endpoints mimic the subset of Supabase features used by the frontend
# - CORS enabled with credentials for http://localhost:8080 by default

from __future__ import annotations

import os
import uuid
import json
from datetime import datetime, date
from pathlib import Path

from flask import Flask, request, jsonify, session, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / 'uploads'
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-change-me')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', f"sqlite:///{BASE_DIR / 'data.db'}")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Allow local dev preview origin; adjust or broaden as needed
CORS(app, supports_credentials=True, origins=[
    os.environ.get('FRONTEND_ORIGIN', 'http://localhost:8080')
])

db = SQLAlchemy(app)

# -----------------------------
# Models
# -----------------------------
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Plan(db.Model):
    __tablename__ = 'plans'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    price_cents = db.Column(db.Integer)
    credits_v1 = db.Column(db.Integer)
    credits_v2 = db.Column(db.Integer)
    credits_v3 = db.Column(db.Integer)
    ocr_bill_limit = db.Column(db.Integer)
    ocr_bank_limit = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Profile(db.Model):
    __tablename__ = 'profiles'
    id = db.Column(db.String(36), db.ForeignKey('users.id'), primary_key=True)
    email = db.Column(db.String(255))
    display_name = db.Column(db.String(255))
    avatar_url = db.Column(db.String(1024))
    bio = db.Column(db.Text)
    company = db.Column(db.String(255))
    location = db.Column(db.String(255))
    phone = db.Column(db.String(50))
    phone_verified = db.Column(db.Boolean, default=False)
    plan_id = db.Column(db.String(36), db.ForeignKey('plans.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class UserCredits(db.Model):
    __tablename__ = 'user_credits'
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), primary_key=True)
    v1 = db.Column(db.Integer, default=10)
    v2 = db.Column(db.Integer, default=20)
    v3 = db.Column(db.Integer, default=30)
    ocr_bill = db.Column(db.Integer, default=12)
    ocr_bank = db.Column(db.Integer, default=13)
    last_reset_month = db.Column(db.Date, default=date.today().replace(day=1))
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Chat(db.Model):
    __tablename__ = 'chats'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(255), default='New Chat')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Message(db.Model):
    __tablename__ = 'messages'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    chat_id = db.Column(db.String(36), db.ForeignKey('chats.id'), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'user' | 'assistant'
    content = db.Column(db.Text, nullable=False)  # JSON string
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    body = db.Column(db.Text)
    read_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class HelpRequest(db.Model):
    __tablename__ = 'help_requests'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    subject = db.Column(db.Text, nullable=False)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class OcrBillExtraction(db.Model):
    __tablename__ = 'ocr_bill_extractions'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    filename = db.Column(db.String(255))
    file_url = db.Column(db.String(1024))
    data = db.Column(db.Text, nullable=False)  # JSON string
    approved = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class OcrBankExtraction(db.Model):
    __tablename__ = 'ocr_bank_extractions'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    filename = db.Column(db.String(255))
    file_url = db.Column(db.String(1024))
    data = db.Column(db.Text, nullable=False)  # JSON string
    approved = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# -----------------------------
# Helpers
# -----------------------------

def current_user() -> User | None:
    uid = session.get('uid')
    if not uid:
        return None
    return db.session.get(User, uid)


def ensure_profile_and_credits(u: User):
    prof = db.session.get(Profile, u.id)
    if not prof:
        # ensure a basic plan exists
        plan = Plan.query.first()
        if not plan:
            plan = Plan(name='Free', price_cents=0, credits_v1=10, credits_v2=20, credits_v3=30, ocr_bill_limit=12, ocr_bank_limit=13)
            db.session.add(plan)
            db.session.commit()
        prof = Profile(id=u.id, email=u.email, plan_id=plan.id)
        db.session.add(prof)
    creds = db.session.get(UserCredits, u.id)
    if not creds:
        creds = UserCredits(user_id=u.id)
        db.session.add(creds)
    db.session.commit()


def row_to_dict(row):
    if isinstance(row, Message):
        return {
            'id': row.id,
            'chat_id': row.chat_id,
            'user_id': row.user_id,
            'role': row.role,
            'content': json.loads(row.content),
            'created_at': row.created_at.isoformat(),
        }
    # generic fallback
    d = {c.name: getattr(row, c.name) for c in row.__table__.columns}
    for k, v in list(d.items()):
        if isinstance(v, datetime):
            d[k] = v.isoformat()
    return d

# -----------------------------
# Auth endpoints
# -----------------------------
@app.post('/auth/signup')
def signup():
    payload = request.get_json(force=True)
    email = (payload.get('email') or '').strip().lower()
    password = payload.get('password')
    if not email or not password:
        return jsonify({'error': 'email and password required'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'user already exists'}), 400
    u = User(email=email, password_hash=generate_password_hash(password))
    db.session.add(u)
    db.session.commit()
    ensure_profile_and_credits(u)
    session['uid'] = u.id
    return jsonify({'user': {'id': u.id, 'email': u.email}})

@app.post('/auth/signin')
def signin():
    payload = request.get_json(force=True)
    email = (payload.get('email') or '').strip().lower()
    password = payload.get('password')
    u = User.query.filter_by(email=email).first()
    if not u or not check_password_hash(u.password_hash, password):
        return jsonify({'error': 'invalid_credentials'}), 400
    session['uid'] = u.id
    return jsonify({'user': {'id': u.id, 'email': u.email}})

@app.post('/auth/signout')
def signout():
    session.clear()
    return jsonify({'ok': True})

@app.get('/auth/session')
def get_session():
    u = current_user()
    if not u:
        return jsonify({'user': None})
    return jsonify({'user': {'id': u.id, 'email': u.email}})

@app.post('/auth/update_user')
def update_user():
    u = current_user()
    if not u:
        return jsonify({'error': 'unauthorized'}), 401
    payload = request.get_json(force=True)
    if 'password' in payload and payload['password']:
        u.password_hash = generate_password_hash(payload['password'])
    db.session.commit()
    return jsonify({'ok': True})

# -----------------------------
# RPC endpoints
# -----------------------------
@app.post('/rpc/reset_monthly_credits')
def reset_monthly_credits():
    u = current_user()
    if not u:
        return jsonify({'error': 'unauthorized'}), 401
    ensure_profile_and_credits(u)
    creds = db.session.get(UserCredits, u.id)
    # naive monthly reset
    now_month = date.today().replace(day=1)
    if creds.last_reset_month != now_month:
        creds.last_reset_month = now_month
        creds.v1, creds.v2, creds.v3 = 10, 20, 30
        db.session.commit()
    return jsonify({'v1': creds.v1, 'v2': creds.v2, 'v3': creds.v3})

@app.post('/rpc/reset_monthly_ocr_credits')
def reset_monthly_ocr_credits():
    u = current_user()
    if not u:
        return jsonify({'error': 'unauthorized'}), 401
    ensure_profile_and_credits(u)
    creds = db.session.get(UserCredits, u.id)
    now_month = date.today().replace(day=1)
    if creds.last_reset_month != now_month:
        creds.last_reset_month = now_month
        creds.ocr_bill, creds.ocr_bank = 12, 13
        db.session.commit()
    return jsonify({'ocr_bill': creds.ocr_bill, 'ocr_bank': creds.ocr_bank})

# -----------------------------
# Functions
# -----------------------------
@app.post('/functions/chat-router')
def chat_router():
    u = current_user()
    if not u:
        return jsonify({'error': 'unauthorized'}), 401
    payload = request.get_json(force=True)
    action = payload.get('action')
    version = payload.get('version')
    chat_id = payload.get('chatId')

    creds = db.session.get(UserCredits, u.id)
    if not creds:
        creds = UserCredits(user_id=u.id)
        db.session.add(creds)
        db.session.commit()

    # Simple credit usage by version
    if version == 'V1' and creds.v1 > 0:
        creds.v1 -= 1
    elif version == 'V2' and creds.v2 > 0:
        creds.v2 -= 1
    elif version == 'V3' and creds.v3 > 0:
        creds.v3 -= 1
    else:
        return jsonify({'error': 'no_credits'}), 400

    # Basic assistant echo logic (replace with real LLM if needed)
    if action == 'send':
        text = payload.get('text', '')
        if chat_id:
            # store user message
            db.session.add(Message(chat_id=chat_id, user_id=u.id, role='user', content=json.dumps({'text': text, 'version': version, 'meta': {}})))
        assistant_content = {'text': f"Echo: {text}", 'version': version, 'meta': {'source': 'flask'}}
        # create assistant message
        if chat_id:
            m = Message(chat_id=chat_id, user_id=u.id, role='assistant', content=json.dumps(assistant_content))
            db.session.add(m)
            db.session.commit()
            assistant = row_to_dict(m)
        else:
            assistant = {
                'id': str(uuid.uuid4()), 'chat_id': chat_id, 'user_id': u.id,
                'role': 'assistant', 'content': assistant_content,
                'created_at': datetime.utcnow().isoformat()
            }
        db.session.commit()
        return jsonify({'assistant': assistant, 'credits': {'v1': creds.v1, 'v2': creds.v2, 'v3': creds.v3}})
    elif action == 'regenerate':
        last_text = payload.get('lastUserText', '')
        assistant_content = {'text': f"Echo (regen): {last_text}", 'version': version, 'meta': {'source': 'flask'}}
        assistant = {
            'id': str(uuid.uuid4()), 'chat_id': chat_id, 'user_id': u.id,
            'role': 'assistant', 'content': assistant_content,
            'created_at': datetime.utcnow().isoformat()
        }
        db.session.commit()
        return jsonify({'assistant': assistant, 'credits': {'v1': creds.v1, 'v2': creds.v2, 'v3': creds.v3}})

    return jsonify({'error': 'unsupported_action'}), 400

@app.post('/functions/contact-support')
def contact_support():
    u = current_user()
    payload = request.get_json(force=True)
    subject = payload.get('subject') or 'Support'
    message = payload.get('message') or ''
    uid = u.id if u else None
    if uid:
        db.session.add(HelpRequest(user_id=uid, subject=subject, message=message))
        db.session.commit()
    # For offline, just acknowledge
    return jsonify({'ok': True})

# -----------------------------
# Generic DB endpoints used by the shim
# -----------------------------
MODEL_MAP = {
    'chats': Chat,
    'messages': Message,
    'notifications': Notification,
    'help_requests': HelpRequest,
    'profiles': Profile,
    'plans': Plan,
    'user_credits': UserCredits,
    'ocr_bill_extractions': OcrBillExtraction,
    'ocr_bank_extractions': OcrBankExtraction,
}

def apply_eq_filters(query, model, args):
    for key, value in args.items():
        if key.startswith('eq.'):
            col = key.split('.', 1)[1]
            if hasattr(model, col):
                query = query.filter(getattr(model, col) == value)
    return query

@app.route('/db/<table>', methods=['GET', 'POST', 'PATCH', 'DELETE'])
def table_gateway(table):
    u = current_user()
    if not u:
        return jsonify({'error': 'unauthorized'}), 401
    model = MODEL_MAP.get(table)
    if not model:
        return jsonify({'error': 'unknown_table'}), 400

    if request.method == 'GET':
        query = apply_eq_filters(model.query, model, request.args)
        order = request.args.get('order')  # e.g., created_at.asc
        if order:
            col, direction = order.split('.')
            if hasattr(model, col):
                expr = getattr(model, col)
                query = query.order_by(expr.asc() if direction == 'asc' else expr.desc())
        # Optional range
        frm = request.args.get('from', type=int)
        to = request.args.get('to', type=int)
        if frm is not None and to is not None and to >= frm:
            query = query.offset(frm).limit(to - frm + 1)
        rows = [row_to_dict(r) for r in query.all()]
        return jsonify(rows)

    if request.method == 'POST':
        data = request.get_json(force=True)
        if isinstance(data, dict):
            items = [data]
        else:
            items = data
        created = []
        for item in items:
            # Inject user_id when present in the model
            if hasattr(model, 'user_id') and 'user_id' not in item:
                item['user_id'] = u.id
            # Convert JSON fields
            if model is Message and isinstance(item.get('content'), (dict, list)):
                item['content'] = json.dumps(item['content'])
            if model in (OcrBillExtraction, OcrBankExtraction) and isinstance(item.get('data'), (dict, list)):
                item['data'] = json.dumps(item['data'])
            obj = model(**item)
            db.session.add(obj)
            created.append(obj)
        db.session.commit()
        return jsonify([row_to_dict(o) for o in created] if len(created) > 1 else row_to_dict(created[0]))

    if request.method == 'PATCH':
        data = request.get_json(force=True)
        query = apply_eq_filters(model.query, model, request.args)
        rows = query.all()
        for r in rows:
            for k, v in data.items():
                if model is Message and k == 'content' and isinstance(v, (dict, list)):
                    v = json.dumps(v)
                setattr(r, k, v)
        db.session.commit()
        return jsonify({'updated': len(rows)})

    if request.method == 'DELETE':
        query = apply_eq_filters(model.query, model, request.args)
        count = query.delete()
        db.session.commit()
        return jsonify({'deleted': count})

    return jsonify({'error': 'unsupported_method'}), 405

# -----------------------------
# Storage
# -----------------------------
@app.post('/storage/<bucket>/upload')
def storage_upload(bucket):
    u = current_user()
    if not u:
        return jsonify({'error': 'unauthorized'}), 401
    f = request.files.get('file')
    path = request.form.get('path')
    if not f or not path:
        return jsonify({'error': 'file_and_path_required'}), 400
    bucket_dir = UPLOAD_DIR / bucket
    target = bucket_dir / path
    target.parent.mkdir(parents=True, exist_ok=True)
    f.save(target)
    public_url = f"/storage/{bucket}/public/{path}"
    return jsonify({'path': path, 'publicUrl': public_url})

@app.route('/storage/<bucket>/public/<path:subpath>')
def storage_public(bucket, subpath):
    bucket_dir = UPLOAD_DIR / bucket
    full_path = bucket_dir / subpath
    return send_from_directory(full_path.parent, full_path.name)

# -----------------------------
# App bootstrap
# -----------------------------
@app.get('/')
def root():
    return jsonify({'ok': True, 'message': 'Flask backend running'})

@app.cli.command('init-db')
def init_db():
    db.create_all()
    if not Plan.query.first():
        db.session.add(Plan(name='Free', price_cents=0, credits_v1=10, credits_v2=20, credits_v3=30, ocr_bill_limit=12, ocr_bank_limit=13))
        db.session.commit()
    print('Database initialized')

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        if not Plan.query.first():
            db.session.add(Plan(name='Free', price_cents=0, credits_v1=10, credits_v2=20, credits_v3=30, ocr_bill_limit=12, ocr_bank_limit=13))
            db.session.commit()
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=True)
