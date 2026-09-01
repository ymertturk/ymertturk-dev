import sqlite3
import os

DB_FILE = "referee_tracker.db"

def migrate():
    if not os.path.exists(DB_FILE):
        print("Database not found, skipping migration.")
        return

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Check if sicil_no exists in referees
    cursor.execute("PRAGMA table_info(referees)")
    columns = [info[1] for info in cursor.fetchall()]
    
    # Migrating referees table
    try:
        cursor.execute("ALTER TABLE referees ADD COLUMN sicil_no VARCHAR")
        print("Added sicil_no column to referees.")
    except sqlite3.OperationalError:
        print("sicil_no column already exists in referees.")

    try:
        cursor.execute("ALTER TABLE referees ADD COLUMN telegram_chat_id VARCHAR")
        print("Added telegram_chat_id column to referees.")
    except sqlite3.OperationalError:
        print("telegram_chat_id column already exists in referees.")


    # Migrating invitations table
    try:
        cursor.execute("ALTER TABLE invitations ADD COLUMN whatsapp_message_sid VARCHAR")
        print("Added whatsapp_message_sid column.")
    except sqlite3.OperationalError:
        print("whatsapp_message_sid column already exists.")

    try:
        cursor.execute("ALTER TABLE invitations ADD COLUMN telegram_message_id VARCHAR")
        print("Added telegram_message_id column.")
    except sqlite3.OperationalError:
        print("telegram_message_id column already exists.")

    try:
        cursor.execute("ALTER TABLE invitations ADD COLUMN sent_at DATETIME")
        print("Added sent_at column.")
    except sqlite3.OperationalError:
        print("sent_at column already exists.")

    try:
        cursor.execute("ALTER TABLE invitations ADD COLUMN last_response_at DATETIME")
        print("Added last_response_at column.")
    except sqlite3.OperationalError:
        print("last_response_at column already exists.")

    try:
        cursor.execute("ALTER TABLE invitations ADD COLUMN response_content VARCHAR")
        print("Added response_content column.")
    except sqlite3.OperationalError:
        print("response_content column already exists.")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
