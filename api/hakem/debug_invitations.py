from sqlalchemy.orm import Session
import db, models

session = db.SessionLocal()
# Find the specific referee
ref = session.query(models.Referee).filter(models.Referee.full_name.like("%YUSUF MERT%")).first()

if ref:
    print(f"Referee: {ref.full_name} (ID: {ref.id})")
    print(f"Telegram Chat ID: {ref.telegram_chat_id}")
    print("-" * 30)
    for inv in ref.invitations:
        print(f"Inv ID: {inv.id} | Date: {inv.event_date} | Status: '{inv.status}' (Type: {type(inv.status)})")
        print(f"   -> WA SID: {inv.whatsapp_message_sid}")
        print(f"   -> TG MSG ID: {inv.telegram_message_id}")
else:
    print("Referee 'YUSUF MERT TÜRK' not found.")

session.close()
