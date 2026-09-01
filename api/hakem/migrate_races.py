from sqlalchemy import create_engine, text
from db import SQLALCHEMY_DATABASE_URL

def migrate():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    with engine.connect() as conn:
        print("Starting Race Migration...")
        
        # 1. Create races table
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS races (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR NOT NULL,
                    date DATE NOT NULL,
                    notes VARCHAR,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """))
            print("Table 'races' checked/created.")
        except Exception as e:
            print(f"Error creating races table: {e}")

        # 2. Add columns to invitations
        # Check if columns exist first to avoid error
        try:
            # SQLite doesn't support IF NOT EXISTS for columns easily in one go, 
            # so we just try to add and ignore "duplicate column" error
            conn.execute(text("ALTER TABLE invitations ADD COLUMN race_id INTEGER REFERENCES races(id)"))
            print("Column 'race_id' added to invitations.")
        except Exception as e:
            if "duplicate column" in str(e).lower():
                print("Column 'race_id' already exists.")
            else:
                print(f"Error adding race_id: {e}")

        try:
            conn.execute(text("ALTER TABLE invitations ADD COLUMN reminder_sent INTEGER DEFAULT 0"))
            print("Column 'reminder_sent' added to invitations.")
        except Exception as e:
            if "duplicate column" in str(e).lower():
                print("Column 'reminder_sent' already exists.")
            else:
                print(f"Error adding reminder_sent: {e}")
                
        print("Migration completed.")

if __name__ == "__main__":
    migrate()
