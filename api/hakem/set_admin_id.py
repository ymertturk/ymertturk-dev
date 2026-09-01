import sys
from sqlalchemy.orm import Session
import crud, db, models

def setup_admin_id():
    print("Yönetici Telegram Bildirim Ayarı")
    print("---------------------------------------")
    print("Bu ID, hakemler davetleri kabul ettiğinde bildirim alacak kişiyi belirler.")
    print("Telegram ID'nizi öğrenmek için @userinfobot gibi botları kullanabilirsiniz.")
    print("---------------------------------------")
    
    admin_chat_id = input("Telegram Chat ID'niz: ").strip()
    
    if not admin_chat_id:
        print("Hata: Chat ID boş olamaz.")
        return

    db_session = db.SessionLocal()
    try:
        crud.set_system_config(db_session, "ADMIN_TELEGRAM_CHAT_ID", admin_chat_id)
        print("---------------------------------------")
        print(f"✅ Yönetici Chat ID ({admin_chat_id}) başarıyla kaydedildi!")
    except Exception as e:
        print(f"❌ Bir hata oluştu: {e}")
    finally:
        db_session.close()

if __name__ == "__main__":
    setup_admin_id()
