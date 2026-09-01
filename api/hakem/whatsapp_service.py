from twilio.rest import Client
from sqlalchemy.orm import Session
from datetime import datetime
import crud

class WhatsAppService:
    def __init__(self, db: Session):
        self.db = db
        # Fetch config from DB
        self.account_sid = crud.get_system_config(db, "TWILIO_ACCOUNT_SID")
        self.auth_token = crud.get_system_config(db, "TWILIO_AUTH_TOKEN")
        self.from_number = crud.get_system_config(db, "TWILIO_FROM_NUMBER") # e.g. "whatsapp:+14155238886"
        
        self.client = None
        if self.account_sid and self.auth_token:
            try:
                self.client = Client(self.account_sid, self.auth_token)
            except Exception as e:
                print(f"Twilio init error: {e}")

    def send_invite(self, to_number, referee_name, event_name, event_date):
        if not self.client:
            return {"success": False, "error": "Twilio yapılandırılmamış."}
            
        if not to_number:
             return {"success": False, "error": "Telefon numarası eksik."}

        # Format number: Ensure it starts with +90 or generic +
        # Quick fix for common TR formats: 0555... -> +90555...
        formatted_number = to_number.strip().replace(" ", "")
        if formatted_number.startswith("0"):
            formatted_number = "+90" + formatted_number[1:]
        elif not formatted_number.startswith("+"):
            formatted_number = "+90" + formatted_number

        body = (
            f"Sayın {referee_name},\n"
            f"{event_date} tarihinde yapılacak olan {event_name} yarışında "
            f"görevlendirilmek üzeresiniz.\n\n"
            f"Lütfen 24 saat içinde cevap veriniz:\n"
            f"- 'KABUL' veya 'EVET'\n"
            f"- 'MAZERET' veya 'HAYIR'"
        )

        try:
            message = self.client.messages.create(
                from_=self.from_number,
                body=body,
                to=f"whatsapp:{formatted_number}"
            )
            return {"success": True, "sid": message.sid, "status": message.status}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def check_config(self):
         return {
             "configured": bool(self.account_sid and self.auth_token and self.from_number),
             "sid": self.account_sid,
             "from": self.from_number
         }
