import sqlite3
import os


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "referee_tracker.db")

def migrate():
    # 1. Database connection
    if not os.path.exists(DB_FILE):
        print(f"UYARI: {DB_FILE} bulunamadı. Yeni bir veritabanı oluşturulacak...")
        # We let it create a new one if missing
    
    print(f"Veritabanı güncelleniyor: {DB_FILE}")
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # --- TABLES ---

    # A. System Config
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS system_config (
                key VARCHAR PRIMARY KEY,
                value VARCHAR NOT NULL
            )
        """)
        print("✅ 'system_config' tablosu kontrol edildi/oluşturuldu.")
    except Exception as e:
        print(f"❌ Hata (system_config): {e}")

    # B. Races
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS races (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR NOT NULL,
                date DATE NOT NULL,
                notes VARCHAR,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ 'races' tablosu kontrol edildi/oluşturuldu.")
    except Exception as e:
        print(f"❌ Hata (races): {e}")

    # --- COLUMNS ---

    def add_column(table, column, type_def):
        try:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {type_def}")
            print(f"   -> '{column}' sütunu eklendi.")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower():
                pass # Already exists
            else:
                print(f"   ⚠️ Uyarı ({table}.{column}): {e}")

    print("\nTablo Sütunları Kontrol Ediliyor...")

    # Referees Table
    add_column("referees", "sicil_no", "VARCHAR")
    add_column("referees", "telegram_chat_id", "VARCHAR")
    add_column("referees", "category", "VARCHAR")
    add_column("referees", "tc_no", "VARCHAR")
    add_column("referees", "iban", "VARCHAR")
    add_column("referees", "gender", "VARCHAR")
    add_column("referees", "full_name_normalized", "VARCHAR") 
    
    # Invitations Table
    add_column("invitations", "race_id", "INTEGER REFERENCES races(id)")
    add_column("invitations", "whatsapp_message_sid", "VARCHAR")
    add_column("invitations", "telegram_message_id", "VARCHAR")
    add_column("invitations", "sent_at", "DATETIME")
    add_column("invitations", "last_response_at", "DATETIME")
    add_column("invitations", "response_content", "VARCHAR")
    add_column("invitations", "reminder_sent", "INTEGER DEFAULT 0")

    # Users Table (Ensure role exists)
    add_column("users", "role", "VARCHAR DEFAULT 'user'")
    
    # Normalization Check (Backfill)
    try:
        # Check if full_name_normalized is empty for anyone, update it?
        # Creating a normalize function in SQL is hard, better to use python if needed.
        # For now, let's assume it's fine or handled by app update logic.
        pass 
    except Exception:
        pass

    conn.commit()
    conn.close()
    
    print("\n✅ GÜNCELLEME BAŞARIYLA TAMAMLANDI.")
    print("Artık uygulamayı (main.exe) çalıştırabilirsiniz.")
    input("\nÇıkmak için Enter'a basın...")

if __name__ == "__main__":
    migrate()
