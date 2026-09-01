"""
Migration script to add KVKK consent columns to the referees table.
Run this once on existing databases before deploying the KVKK update.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "referee_tracker.db")

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check existing columns
    cursor.execute("PRAGMA table_info(referees)")
    columns = [col[1] for col in cursor.fetchall()]

    added = []

    if "kvkk_consent" not in columns:
        cursor.execute("ALTER TABLE referees ADD COLUMN kvkk_consent INTEGER DEFAULT 0")
        added.append("kvkk_consent")

    if "kvkk_consent_date" not in columns:
        cursor.execute("ALTER TABLE referees ADD COLUMN kvkk_consent_date DATETIME")
        added.append("kvkk_consent_date")

    conn.commit()
    conn.close()

    if added:
        print(f"✅ Migration complete. Added columns: {', '.join(added)}")
    else:
        print("ℹ️  Columns already exist, no changes needed.")

if __name__ == "__main__":
    migrate()
