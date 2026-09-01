import db, crud
from sqlalchemy.orm import Session

def set_admin_ids():
    session = db.SessionLocal()
    try:
        new_val = "6071298895,1151328177"
        crud.set_system_config(session, "ADMIN_TELEGRAM_CHAT_ID", new_val)
        
        current_val = crud.get_system_config(session, "ADMIN_TELEGRAM_CHAT_ID")
        print(f"✅ Yönetici ID'leri güncellendi: {current_val}")
    except Exception as e:
        print(f"❌ Hata: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    set_admin_ids()
