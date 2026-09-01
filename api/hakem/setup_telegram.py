import sys
from sqlalchemy.orm import Session
import crud, db, models

def setup_telegram_config():
    print("Telegram Entegrasyonu Kurulum Sihirbazı")
    print("---------------------------------------")
    print("1. Telegram'da @BotFather ile konuşarak yeni bir bot oluşturun (/newbot).")
    print("2. Size verilen TOKEN bilgisini aşağıya girin.")
    print("---------------------------------------")
    
    bot_token = input("Bot Token (Örn: 123456:ABC-DEF1234ghIkl...): ").strip()
    bot_username = input("Bot Kullanıcı Adı (Örn: HakemTakipBot - @ olmadan): ").strip()
    
    if not bot_token:
        print("Hata: Token zorunludur.")
        return

    if bot_username.startswith("@"):
        bot_username = bot_username[1:]

    db_session = db.SessionLocal()
    try:
        crud.set_system_config(db_session, "TELEGRAM_BOT_TOKEN", bot_token)
        crud.set_system_config(db_session, "TELEGRAM_BOT_USERNAME", bot_username)
        print("---------------------------------------")
        print("✅ Başarıyla kaydedildi!")
        print("Webhook ayarını yapmak için sistem çalışırken ilgili menüyü kullanabilirsiniz veya")
        print("manuel olarak şu URL'i çağırabilirsiniz:")
        print(f"https://api.telegram.org/bot{bot_token}/setWebhook?url=HTTPS_URL/webhook/telegram")
    finally:
        db_session.close()

if __name__ == "__main__":
    setup_telegram_config()
