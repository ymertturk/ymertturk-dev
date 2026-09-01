import sys
import os

# Set working directory to api/hakem so templates and SQLite DB resolve natively
hakem_dir = os.path.join(os.path.dirname(__file__), 'hakem')
if hakem_dir not in sys.path:
    sys.path.insert(0, hakem_dir)

try:
    os.chdir(hakem_dir)
except Exception:
    pass

from main import app

# Export app for Vercel Python Serverless ASGI Handler
handler = app
