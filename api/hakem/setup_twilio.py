import sys
from sqlalchemy.orm import Session
import crud, db, models

def setup_twilio_config():
    print("WhatsApp Entegrasyonu Kurulum Sihirbazı")
    print("---------------------------------------")
    print("Lütfen Twilio hesap bilgilerinizi giriniz.")
    print("Bu bilgileri Twilio Console panelinden alabilirsiniz (twilio.com/console).")
    print("---------------------------------------")
    
    account_sid = input("Account SID (AC ile başlar): ").strip()
    auth_token = input("Auth Token: ").strip()
    from_number = input("Twilio WhatsApp Numarası (Örn: whatsapp:+14155238886): ").strip()
    
    if not account_sid or not auth_token or not from_number:
        print("Hata: Tüm alanlar zorunludur.")
        return

    db_session = db.SessionLocal()
    try:
        crud.set_system_config(db_session, "TWILIO_ACCOUNT_SID", account_sid)
        crud.set_system_config(db_session, "TWILIO_AUTH_TOKEN", auth_token)
        crud.set_system_config(db_session, "TWILIO_FROM_NUMBER", from_number)
        print("---------------------------------------")
        print("✅ Başarıyla kaydedildi!")
        print("Şimdi 'ngrok http 8000' komutunu çalıştırıp, çıkan URL'i Twilio Sandbox ayarlarındaki 'When a message comes in' kısmına '/webhook/whatsapp' ekleyerek yapıştırın.")
        print("Örnek: https://xxxx-xx-xx-xx.ngrok-free.app/webhook/whatsapp")
    finally:
        db_session.close()

if __name__ == "__main__":
    setup_twilio_config()
