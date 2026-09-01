import sqlite3
import os

DB_FILE = "referee_tracker.db"

def add_column_if_not_exists(cursor, table, column_def):
    """
    Adds a column to a table if it doesn't already exist.
    column_def example: "category VARCHAR"
    """
    column_name = column_def.split()[0]
    try:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column_def}")
        print(f"[SUCCESS] Added column '{column_name}' to table '{table}'")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print(f"[INFO] Column '{column_name}' already exists in table '{table}'")
        else:
            print(f"[ERROR] Failed to add column '{column_name}' to '{table}': {e}")

def fix_schema():
    if not os.path.exists(DB_FILE):
        print(f"Database file {DB_FILE} not found!")
        return

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    print("--- Fixing 'referees' table ---")
    referee_columns = [
        "category VARCHAR",
        "tc_no VARCHAR",
        "iban VARCHAR",
        "gender VARCHAR",
        "sicil_no VARCHAR",
        "telegram_chat_id VARCHAR"
    ]
    for col in referee_columns:
        add_column_if_not_exists(cursor, "referees", col)

    print("\n--- Fixing 'invitations' table ---")
    invitation_columns = [
        "reminder_sent INTEGER DEFAULT 0",
        "race_id INTEGER",
        "whatsapp_message_sid VARCHAR",
        "telegram_message_id VARCHAR",
        "sent_at DATETIME",
        "last_response_at DATETIME",
        "response_content VARCHAR"
    ]
    for col in invitation_columns:
        add_column_if_not_exists(cursor, "invitations", col)

    conn.commit()
    conn.close()
    print("\n[DONE] Schema update complete.")

if __name__ == "__main__":
    fix_schema()
