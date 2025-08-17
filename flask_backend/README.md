# Flask backend for scribe-verse-chat (offline/local)

Quick start:
- python -m venv .venv && source .venv/bin/activate
- pip install -r requirements.txt
- export FLASK_APP=app.py
- export FRONTEND_ORIGIN=http://localhost:8080  # allow dev preview
- flask run --host 0.0.0.0 --port 5000

Notes:
- Data stored in SQLite at flask_backend/data.db
- File uploads saved under flask_backend/uploads/
- You can override API base in the frontend by setting in browser console:
  localStorage.setItem('FLASK_API_URL', 'http://YOUR_HOST:5000')
