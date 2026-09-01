import httpx
from sqlalchemy.orm import Session
import crud
import json
import re

# Simple in-memory state management
# Structure: {chat_id: {"step": "STEP_NAME", "data": {}}}
USER_STATES = {}

class TelegramService:
    def __init__(self, db: Session):
        self.db = db
        self.token = crud.get_system_config(db, "TELEGRAM_BOT_TOKEN")
        self.username = crud.get_system_config(db, "TELEGRAM_BOT_USERNAME")
        self.api_url = f"https://api.telegram.org/bot{self.token}" if self.token else None

    async def send_message(self, chat_id, text, reply_markup=None):
        if not self.api_url or not chat_id:
            return {"success": False, "error": "Bot yapılandırılmamış veya Chat ID eksik."}

        async with httpx.AsyncClient() as client:
            try:
                payload = {"chat_id": chat_id, "text": text}
                if reply_markup:
                    payload["reply_markup"] = reply_markup
                    
                response = await client.post(f"{self.api_url}/sendMessage", json=payload)
                data = response.json()
                
                if data.get("ok"):
                    return {"success": True, "message_id": str(data["result"]["message_id"])}
                else:
                    return {"success": False, "error": data.get("description", "Unknown error")}
            except Exception as e:
                return {"success": False, "error": str(e)}

            except Exception as e:
                return {"success": False, "error": str(e)}

    async def send_document(self, chat_id, document_file, caption=None):
        if not self.api_url or not chat_id:
            return {"success": False, "error": "Bot yapılandırılmamış."}

        async with httpx.AsyncClient() as client:
            try:
                # Prepare payload
                data = {"chat_id": chat_id}
                if caption:
                    data["caption"] = caption
                
                # document_file is expected to be a tuple (filename, file_content_bytes, content_type)
                # or a file-like object if using httpx properly. 
                # Let's assume we pass bytes content for simplicity in bulk loop
                files = {"document": document_file}
                
                response = await client.post(f"{self.api_url}/sendDocument", data=data, files=files)
                result = response.json()
                
                if result.get("ok"):
                    return {"success": True, "message_id": str(result["result"]["message_id"])}
                else:
                    return {"success": False, "error": result.get("description", "Unknown error")}
            except Exception as e:
                return {"success": False, "error": str(e)}

    async def delete_message(self, chat_id, message_id):
        if not self.api_url: return {"success": False, "error": "Bot yapılandırılmamış."}
        
        async with httpx.AsyncClient() as client:
            try:
                payload = {"chat_id": chat_id, "message_id": message_id}
                response = await client.post(f"{self.api_url}/deleteMessage", json=payload)
                data = response.json()
                
                if data.get("ok"):
                    return {"success": True}
                else:
                    # Log but don't fail hard
                    print(f"Failed to delete message: {data}")
                    return {"success": False, "error": data.get("description", "Unknown error")}
            except Exception as e:
                return {"success": False, "error": str(e)}

    async def send_invite(self, chat_id, referee_name, event_name, event_date, invitation_id):
        body = (
            f"Sayın {referee_name},\n"
            f"{event_date} tarihinde yapılacak olan {event_name} yarışında "
            f"görevlendirilmek üzeresiniz.\n\n"
            f"Lütfen 24 saat içinde cevap veriniz:"
        )
        
        keyboard = {
            "inline_keyboard": [
                [{"text": "Kabul Ediyorum", "callback_data": f"inv:{invitation_id}:ACCEPTED"}],
                [{"text": "Mazeretliyim, Kabul Edemiyorum", "callback_data": f"inv:{invitation_id}:EXCUSED"}]
            ]
        }
        return await self.send_message(chat_id, body, keyboard)

    async def answer_callback(self, callback_query_id, text=None, alert=False):
        if not self.api_url: return
        payload = {"callback_query_id": callback_query_id, "show_alert": alert}
        if text: payload["text"] = text
        async with httpx.AsyncClient() as client:
            await client.post(f"{self.api_url}/answerCallbackQuery", json=payload)

    async def edit_message_text(self, chat_id, message_id, text, reply_markup=None):
        if not self.api_url: return
        payload = {"chat_id": chat_id, "message_id": message_id, "text": text}
        if reply_markup: payload["reply_markup"] = reply_markup
        async with httpx.AsyncClient() as client:
            await client.post(f"{self.api_url}/editMessageText", json=payload)

    async def request_contact(self, chat_id):
        keyboard = {
            "keyboard": [[{"text": "Telefonumu Paylaş", "request_contact": True}]],
            "one_time_keyboard": True,
            "resize_keyboard": True
        }
        await self.send_message(chat_id, "🤖 *Hakem Davet Sistemi*\n\nSisteme hoş geldiniz.\nDevam etmek için lütfen telefon numaranızı paylaşın:", keyboard)
        return {"success": True}

    async def set_webhook(self, webhook_url):
        if not self.api_url: return {"success": False, "error": "Bot yapılandırılmamış."}
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(f"{self.api_url}/setWebhook?url={webhook_url}")
                return response.json()
            except Exception as e:
                return {"success": False, "error": str(e)}

    async def delete_webhook(self):
        if not self.api_url: return
        async with httpx.AsyncClient() as client:
            try: await client.get(f"{self.api_url}/deleteWebhook")
            except Exception: pass

    async def set_my_commands(self):
        if not self.api_url: return
        commands = [
            {"command": "start", "description": "Sistemi Başlat"},
            {"command": "duyuru", "description": "📢 Duyuru Yap (Admin)"}
        ]
        async with httpx.AsyncClient() as client:
            try: await client.post(f"{self.api_url}/setMyCommands", json={"commands": commands})
            except Exception: pass

    async def get_updates(self, offset=None):
        if not self.api_url: return []
        params = {"timeout": 30}
        if offset: params["offset"] = offset
        async with httpx.AsyncClient(timeout=40) as client:
            try:
                response = await client.get(f"{self.api_url}/getUpdates", params=params)
                data = response.json()
                if data.get("ok"): return data["result"]
            except Exception as e:
                print(f"Polling error: {e}")
            return []

    # --- Onboarding Flow Helpers ---

    async def ask_kvkk_consent(self, chat_id):
        """Show KVKK privacy notice and ask for consent before collecting personal data."""
        USER_STATES[chat_id] = {"step": "WAITING_KVKK", "data": {}}

        kvkk_text = (
            "📋 *KİŞİSEL VERİLERİN KORUNMASI HAKKINDA AYDINLATMA METNİ*\n"
            "\n"
            "6698 sayılı Kişisel Verilerin Korunması Kanunu (\"KVKK\") uyarınca, "
            "İstanbul Atletizm İl Temsilciliği olarak aşağıdaki bilgilendirmeyi yapmaktayız:\n"
            "\n"
            "*Veri Sorumlusu:* İstanbul Atletizm İl Temsilciliği\n"
            "\n"
            "*İşlenen Kişisel Veriler:*\n"
            "• Ad-Soyad\n"
            "• Telefon Numarası\n"
            "• TC Kimlik Numarası\n"
            "• IBAN\n"
            "• Cinsiyet\n"
            "• Hakem Sicil Numarası\n"
            "• Hakemlik Kategorisi\n"
            "\n"
            "*İşleme Amacı:*\n"
            "Kişisel verileriniz, atletizm yarışmalarına hakem davet süreçlerinin yönetimi, "
            "görev takibi ve iletişim amacıyla işlenmektedir.\n"
            "\n"
            "*Saklama Süresi:*\n"
            "Verileriniz, aktif hakemlik döneminiz boyunca saklanacak olup, "
            "talebiniz üzerine silinebilir.\n"
            "\n"
            "*Haklarınız:*\n"
            "KVKK'nın 11. maddesi kapsamında kişisel verilerinize erişim, "
            "düzeltme ve silme haklarına sahipsiniz.\n"
            "\n"
            "Devam etmek için aşağıdaki butonlardan birini seçiniz:"
        )

        keyboard = {
            "inline_keyboard": [
                [{"text": "✅ Kabul Ediyorum", "callback_data": "kvkk:accept"}],
                [{"text": "❌ Reddediyorum", "callback_data": "kvkk:reject"}]
            ]
        }
        await self.send_message(chat_id, kvkk_text, keyboard)

    async def start_onboarding_category(self, chat_id):
        USER_STATES[chat_id] = {"step": "WAITING_CATEGORY", "data": {}}
        keyboard = {
            "inline_keyboard": [
                [{"text": "İl Hakemi", "callback_data": "cat:İl"}, {"text": "Ulusal Hakem", "callback_data": "cat:Ulusal"}],
                [{"text": "Uluslararası Hakem", "callback_data": "cat:Uluslararası"}]
            ]
        }
        await self.send_message(chat_id, "Lütfen hakemlik kategorinizi seçiniz:", keyboard)

    async def ask_tc_no(self, chat_id):
        USER_STATES[chat_id]["step"] = "WAITING_TC"
        await self.send_message(chat_id, "Lütfen 11 haneli TC Kimlik numaranızı giriniz:")

    async def ask_iban(self, chat_id):
        USER_STATES[chat_id]["step"] = "WAITING_IBAN"
        await self.send_message(chat_id, "Lütfen IBAN numaranızı giriniz (TR ile başlamalı):")

    async def ask_gender(self, chat_id):
        USER_STATES[chat_id]["step"] = "WAITING_GENDER"
        keyboard = {
            "inline_keyboard": [
                [{"text": "Kadın", "callback_data": "gen:Kadın"}, {"text": "Erkek", "callback_data": "gen:Erkek"}]
            ]
        }
        await self.send_message(chat_id, "Lütfen cinsiyetinizi seçiniz:", keyboard)

    async def finalize_onboarding(self, chat_id, referee_id):
        state = USER_STATES.get(chat_id)
        if not state: return
        
        data = state.get("data", {})
        
        from datetime import datetime
        # Save to DB (including KVKK consent)
        crud.update_referee(self.db, referee_id, {
            "category": data.get("category"),
            "tc_no": data.get("tc"),
            "iban": data.get("iban"),
            "gender": data.get("gender"),
            "kvkk_consent": 1,
            "kvkk_consent_date": datetime.utcnow()
        })
        
        # Clear state
        if chat_id in USER_STATES:
            del USER_STATES[chat_id]
            
        await self.send_message(chat_id, "✅ Bilgileriniz başarıyla kaydedildi. Teşekkürler!", {"remove_keyboard": True})

    # --- Main Process Logic ---

    async def process_update(self, data):
        # 1. Handle Callback Query
        if "callback_query" in data:
            await self.handle_callback(data["callback_query"])
            return

        # 2. Handle Message
        message = data.get("message")
        if not message: return
        
        chat_id = message.get("chat", {}).get("id")
        text = message.get("text", "").strip()
        contact = message.get("contact")
        
        # Check explicit commands
        if text == "/start":
            import models 
            referee = self.db.query(models.Referee).filter(models.Referee.telegram_chat_id == str(chat_id)).first()
            if referee:
                # Check KVKK consent first
                if not referee.kvkk_consent:
                    await self.send_message(chat_id, "Devam etmeden önce KVKK onayı vermeniz gerekmektedir.")
                    await self.ask_kvkk_consent(chat_id)
                # Then check if missing info
                elif not all([referee.category, referee.tc_no, referee.iban, referee.gender]):
                     await self.send_message(chat_id, "Eksik bilgileriniz var, tamamlayalım.")
                     await self.start_onboarding_category(chat_id)
                else:
                     await self.send_message(chat_id, f"Merhaba {referee.full_name}, sistemde zaten kaydınız tam.")
            else:
                await self.request_contact(chat_id)
            return

        if text == "/duyuru":
            await self.handle_announcement_command(chat_id)
            return

        # Check State Machine for Data Collection
        if chat_id in USER_STATES:
            await self.handle_state_input(chat_id, text)
            return

        # Handle Contact Share (Registration Start)
        if contact:
            await self.handle_contact(contact, chat_id)
            return
            
        # Handle Broadcast Files/Photos (If in waiting state)
        if chat_id in USER_STATES and USER_STATES[chat_id]["step"] == "WAITING_BROADCAST_CONTENT":
            race_id = USER_STATES[chat_id]["data"].get("race_id")
            
            # Identify content type
            document = message.get("document")
            photo = message.get("photo") # List of sizes
            caption = message.get("caption")
            
            if race_id:
                if document:
                    file_id = document["file_id"]
                    await self.broadcast_to_race(chat_id, race_id, file_id=file_id, file_type="document", caption=caption)
                elif photo:
                    file_id = photo[-1]["file_id"] # Get largest
                    await self.broadcast_to_race(chat_id, race_id, file_id=file_id, file_type="photo", caption=caption)
                else:
                    await self.send_message(chat_id, "Desteklenmeyen dosya formatı. Sadece metin, belge veya fotoğraf gönderebilirsiniz.")
                    return # Don't reset state, let them try again
            
            # Reset state
            del USER_STATES[chat_id]
            return

        # Default fallback
        # If linked user sending random text -> Ignore or Warn
        import models
        referee = self.db.query(models.Referee).filter(models.Referee.telegram_chat_id == str(chat_id)).first()
        if referee:
             # Delete user message if possible to keep chat clean
             try:
                 msg_id = message.get("message_id")
                 async with httpx.AsyncClient() as client:
                     await client.post(f"{self.api_url}/deleteMessage", json={"chat_id": chat_id, "message_id": msg_id})
             except: pass
             await self.send_message(chat_id, "⚠️ Lütfen mesaj yazmak yerine size gönderilen butonları kullanınız.")
        else:
             await self.send_message(chat_id, "Kayıt olmak için /start komutunu kullanın.")

    async def handle_contact(self, contact, chat_id):
        phone_number = contact.get("phone_number", "")
        clean_phone = phone_number.replace("+", "").replace(" ", "").strip()
        short_phone = clean_phone[-10:]
        
        import models
        referees = self.db.query(models.Referee).all()
        target_referee = None
        for ref in referees:
            if ref.phone and ref.phone.replace(" ", "").replace("-", "")[-10:] == short_phone:
                target_referee = ref
                break
        
        if target_referee:
            target_referee.telegram_chat_id = str(chat_id)
            self.db.commit()
            
            # Check KVKK consent first
            if not target_referee.kvkk_consent:
                await self.send_message(chat_id, f"Merhaba {target_referee.full_name}, devam etmeden önce kişisel verilerin korunması hakkında bilgilendirilmeniz gerekmektedir.", {"remove_keyboard": True})
                await self.ask_kvkk_consent(chat_id)
            # Then check if info missing
            elif not all([target_referee.category, target_referee.tc_no, target_referee.iban, target_referee.gender]):
                await self.send_message(chat_id, f"Merhaba {target_referee.full_name}, kaydınızı tamamlamak için birkaç bilgiye ihtiyacımız var.", {"remove_keyboard": True})
                await self.start_onboarding_category(chat_id)
            else:
                await self.send_message(chat_id, f"✅ Hoş geldiniz {target_referee.full_name}, kaydınız başarıyla eşleştirildi.", {"remove_keyboard": True})
        else:
            await self.send_message(chat_id, "❌ Numaranız sistemde kayıtlı hakemler arasında bulunamadı.")

    async def handle_state_input(self, chat_id, text):
        state = USER_STATES[chat_id]
        step = state["step"]
        
        if step == "WAITING_TC":
            # Validation: 11 digits
            if not re.match(r"^\d{11}$", text):
                await self.send_message(chat_id, "❌ HATA: TC Kimlik numarası 11 haneli ve sadece rakamlardan oluşmalıdır. Lütfen tekrar giriniz:")
                return
            
            state["data"]["tc"] = text
            await self.ask_iban(chat_id)
            
        elif step == "WAITING_IBAN":
            # Validation: TR + 24 digits (total 26 chars), allow spaces/formatting removal
            clean_iban = text.replace(" ", "").upper()
            if not re.match(r"^TR\d{24}$", clean_iban):
                await self.send_message(chat_id, "❌ HATA: Geçersiz IBAN formatı.\nIBAN 'TR' ile başlamalı ve toplam 26 karakter olmalıdır. Lütfen tekrar giriniz:")
                return
            
            state["data"]["iban"] = clean_iban
            await self.ask_gender(chat_id)
            

        elif step == "WAITING_BROADCAST_CONTENT":
            # Admin sending broadcast content (Text)
            race_id = state["data"].get("race_id")
            if race_id:
                await self.broadcast_to_race(chat_id, race_id, text=text)
            
            # Reset state
            del USER_STATES[chat_id]
            
        else:
            # Should be handled by buttons (Category, Gender)
            # If user types instead of clicking button:
            await self.send_message(chat_id, "Lütfen seçeneklerden birini seçmek için butonları kullanınız.")

    def get_admin_ids(self):
        admin_config = crud.get_system_config(self.db, "ADMIN_TELEGRAM_CHAT_ID")
        if not admin_config: return []
        return [aid.strip() for aid in admin_config.split(",") if aid.strip()]

    async def handle_callback(self, cb):
        cb_id = cb["id"]
        chat_id = cb["message"]["chat"]["id"]
        message_id = cb["message"]["message_id"]
        data = cb.get("data", "")
        
        # KVKK Consent Callbacks
        if data == "kvkk:accept":
            if chat_id in USER_STATES and USER_STATES[chat_id]["step"] == "WAITING_KVKK":
                await self.answer_callback(cb_id, "KVKK onayı alındı.")
                # Save consent immediately
                import models
                from datetime import datetime
                referee = self.db.query(models.Referee).filter(models.Referee.telegram_chat_id == str(chat_id)).first()
                if referee:
                    referee.kvkk_consent = 1
                    referee.kvkk_consent_date = datetime.utcnow()
                    self.db.commit()
                await self.send_message(chat_id, "✅ KVKK onayınız kaydedildi. Şimdi bilgilerinizi tamamlayalım.")
                await self.start_onboarding_category(chat_id)
            else:
                await self.answer_callback(cb_id, "Bu işlem zaman aşımına uğramış.")
            return

        elif data == "kvkk:reject":
            if chat_id in USER_STATES and USER_STATES[chat_id]["step"] == "WAITING_KVKK":
                await self.answer_callback(cb_id, "KVKK onayı reddedildi.")
                if chat_id in USER_STATES:
                    del USER_STATES[chat_id]
                await self.send_message(chat_id, "❌ KVKK onayı vermeden kişisel bilgileriniz işlenemez. Kayıt işlemi iptal edildi.\n\nFikirlerinizi değiştirirseniz tekrar /start komutuyla başlayabilirsiniz.")
            else:
                await self.answer_callback(cb_id, "Bu işlem zaman aşımına uğramış.")
            return

        # Onboarding Callbacks
        elif data.startswith("cat:"):
            # Category selected
            category = data.split(":")[1]
            if chat_id in USER_STATES and USER_STATES[chat_id]["step"] == "WAITING_CATEGORY":
                USER_STATES[chat_id]["data"]["category"] = category
                await self.answer_callback(cb_id, f"Seçildi: {category}")
                # Transition
                await self.ask_tc_no(chat_id)
            else:
                await self.answer_callback(cb_id, "Bu işlem zaman aşımına uğramış.")

        elif data.startswith("gen:"):
            # Gender selected
            gender = data.split(":")[1]
            if chat_id in USER_STATES and USER_STATES[chat_id]["step"] == "WAITING_GENDER":
                USER_STATES[chat_id]["data"]["gender"] = gender
                await self.answer_callback(cb_id, f"Seçildi: {gender}")
                
                # Get Referee ID
                import models
                referee = self.db.query(models.Referee).filter(models.Referee.telegram_chat_id == str(chat_id)).first()
                if referee:
                    await self.finalize_onboarding(chat_id, referee.id)
                else:
                    await self.send_message(chat_id, "Hata: Kullanıcı bulunamadı.")
            else:
                await self.answer_callback(cb_id, "Bu işlem zaman aşımına uğramış.")

        # Invitation Callbacks (Existing Logic)
        elif data.startswith("inv:"):
            parts = data.split(":")
            if len(parts) == 3:
                await self.handle_invite_response(cb_id, chat_id, message_id, parts[1], parts[2], cb["message"]["text"])
        
        elif data.startswith("broadcast:"):
            race_id = data.split(":")[1]
            # Verify Admin again just in case
            admin_ids = self.get_admin_ids()
            if str(chat_id) in admin_ids:
                USER_STATES[chat_id] = {"step": "WAITING_BROADCAST_CONTENT", "data": {"race_id": race_id}}
                await self.answer_callback(cb_id, "Yarış seçildi.")
                await self.send_message(chat_id, "📢 Lütfen göndermek istediğiniz duyuru metnini yazın veya bir dosya/fotoğraf gönderin:")
            else:
                await self.answer_callback(cb_id, "Yetkisiz işlem.", alert=True)
        
        else:
            await self.answer_callback(cb_id, "Bilinmeyen işlem.")

    async def handle_invite_response(self, cb_id, chat_id, message_id, invite_id, action, msg_text):
        import models
        from datetime import datetime
        
        invitation = self.db.query(models.Invitation).filter(models.Invitation.id == int(invite_id)).first()
        if not invitation:
            await self.answer_callback(cb_id, "Davet bulunamadı.", alert=True)
            return

        if invitation.sent_at:
             if (datetime.utcnow() - invitation.sent_at).total_seconds() > 24 * 3600:
                 await self.answer_callback(cb_id, "Süre doldu.", alert=True)
                 return

        status_map = {"ACCEPTED": "✅ Kabul Edildi", "EXCUSED": "⚠️ Mazeret Bildirildi"}
        db_status = action  # ACCEPTED or EXCUSED
        
        invitation.status = db_status
        invitation.last_response_at = datetime.utcnow()
        invitation.response_content = f"BUTTON:{action}"
        self.db.commit()
        
        await self.answer_callback(cb_id, "Yanıt kaydedildi.")
        await self.edit_message_text(chat_id, message_id, f"{msg_text}\n\nSONUÇ: {status_map.get(action)}")

        # Send Notification to Admin if Accepted or Excused
        if action in ["ACCEPTED", "EXCUSED"]:
             await self.send_admin_notification(invitation.race_id)

    async def send_admin_notification(self, race_id):
        if not race_id: return
        import models
        
        admin_ids = self.get_admin_ids()
        if not admin_ids: return
        
        race = self.db.query(models.Race).filter(models.Race.id == race_id).first()
        if not race: return
        
        # Calculate Stats
        total_invited = len(race.invitations)
        accepted_invites = [i for i in race.invitations if i.status == "ACCEPTED"]
        excused_invites = [i for i in race.invitations if i.status == "EXCUSED"]
        waiting_invites = [i for i in race.invitations if i.status == "PENDING"]
        
        accepted_names = "\n".join([f"- {i.referee.full_name}" for i in accepted_invites])
        excused_names = "\n".join([f"- {i.referee.full_name}" for i in excused_invites])
        
        # Format Message
        message = f"📢 *{race.name}* - Güncel Durum\n\n"
        message += f"Toplam Davet Edilen: {total_invited}\n"
        message += f"✅ Kabul Edenler ({len(accepted_invites)}):\n"
        message += accepted_names if accepted_names else "- Henüz yok"
        message += "\n\n"
        
        message += f"❌ Reddedenler ({len(excused_invites)}):\n"
        message += excused_names if excused_names else "- Henüz yok"
        message += "\n\n"
        
        message += f"⏳ Bekleyenler ({len(waiting_invites)}):\n"
        
        invite_chunks = []
        current_chunk = message
        
        for inv in waiting_invites:
            line = f"- {inv.referee.full_name}\n"
            if len(current_chunk) + len(line) > 4000:
                invite_chunks.append(current_chunk)
                current_chunk = line
            else:
                current_chunk += line
                
        invite_chunks.append(current_chunk)
        
        for chunk in invite_chunks:
             for aid in admin_ids:
                 await self.send_message(aid, chunk)

    async def handle_announcement_command(self, chat_id):
        # 1. Check Admin Permission
        admin_ids = self.get_admin_ids()
        if str(chat_id) not in admin_ids:
            await self.send_message(chat_id, "⛔️ Bu komutu kullanmaya yetkiniz yok.")
            return

        # 2. Get Upcoming Races
        import models
        from datetime import date
        races = self.db.query(models.Race).filter(models.Race.date >= date.today()).all()
        
        if not races:
            await self.send_message(chat_id, "⚠️ Aktif/gelecek yarış bulunamadı.")
            return

        # 3. Show Selection Keyboard
        keyboard_buttons = []
        for race in races:
            keyboard_buttons.append([{"text": f"{race.date} - {race.name}", "callback_data": f"broadcast:{race.id}"}])
            
        keyboard = {"inline_keyboard": keyboard_buttons}
        await self.send_message(chat_id, "📢 Hangi yarış için duyuru yapmak istiyorsunuz?", reply_markup=keyboard)

    async def broadcast_to_race(self, admin_chat_id, race_id, text=None, file_id=None, file_type=None, caption=None):
        import models
        race = self.db.query(models.Race).filter(models.Race.id == race_id).first()
        if not race:
            await self.send_message(admin_chat_id, "❌ Yarış bulunamadı.")
            return

        # Filter Accepted Referees
        targets = [inv.referee for inv in race.invitations if inv.status == "ACCEPTED" and inv.referee.telegram_chat_id]
        
        if not targets:
            await self.send_message(admin_chat_id, "⚠️ Bu yarış için kabul etmiş hakem bulunamadı.")
            return

        success_count = 0
        fail_count = 0
        
        await self.send_message(admin_chat_id, f"🔄 Gönderim başlıyor... ({len(targets)} kişi)")

        async with httpx.AsyncClient() as client:
            for referee in targets:
                try:
                    payload = {"chat_id": referee.telegram_chat_id}
                    method = "sendMessage"
                    
                    if text:
                        payload["text"] = f"📢 DUYURU ({race.name})\n\n{text}"
                    elif file_id:
                        method = "sendDocument" if file_type == "document" else "sendPhoto"
                        payload[file_type] = file_id
                        full_caption = f"📢 DUYURU ({race.name})"
                        if caption: full_caption += f"\n\n{caption}"
                        payload["caption"] = full_caption

                    response = await client.post(f"{self.api_url}/{method}", json=payload)
                    res_data = response.json()
                    
                    if res_data.get("ok"):
                        success_count += 1
                    else:
                        print(f"Fail {referee.full_name}: {res_data}")
                        fail_count += 1
                except Exception as e:
                    print(f"Error {referee.full_name}: {e}")
                    fail_count += 1
        
        await self.send_message(admin_chat_id, f"✅ Duyuru Tamamlandı.\n\nBaşarılı: {success_count}\nBaşarısız: {fail_count}")
