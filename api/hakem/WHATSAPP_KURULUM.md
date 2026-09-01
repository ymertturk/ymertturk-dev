# WhatsApp Entegrasyonu Kurulum Rehberi

Bu özellik, hakemlere otomatik WhatsApp mesajı göndermenizi ve gelen cevapları ("Kabul", "Mazeret") otomatik olarak sisteme kaydetmenizi sağlar.

## 1. Twilio Hesabı Oluşturma
1.  [Twilio.com](https://www.twilio.com/try-twilio) adresine gidin ve ücretsiz bir hesap oluşturun.
2.  Giriş yaptıktan sonra sol menüden **Messaging > Try it out > Send a WhatsApp message** kısmına gidin.
3.  Burada size verilen **Sandbox Numarasını** (Örn: `whatsapp:+14155238886`) not edin.
4.  Kendi telefon numaranıza verilen kodu (örn: `join whatever-word`) göndererek Sandbox'a bağlanın.
5.  **Account SID** ve **Auth Token** bilgilerinizi Twilio anasayfasında (Dashboard) bulabilirsiniz.

## 2. Sistemi Yapılandırma
1.  Terminal/Komut Satırı penceresini açın.
2.  Proje klasörüne gidin (`cd /Users/ymertturk/Desktop/Hakem/referee_tracker`)
3.  Sanal ortamı aktif edin (zaten aktifse gerek yok).
4.  Şu komutu çalıştırarak bilgileri sisteme kaydedin:
    ```bash
    python setup_twilio.py
    ```
5.  Size sorulan bilgileri (SID, Token, Numara) girin ve enter'a basın.

## 3. Ngrok Kurulumu (Cevapları Alabilmek İçin)
Bilgisayarınızdaki sistemin WhatsApp'tan gelen cevapları duyabilmesi için sisteminizi internete açmanız gerekir.
1.  [Ngrok.com](https://ngrok.com/download) adresinden Ngrok'u indirin ve kurun.
2.  Terminalden şu komutu çalıştırın:
    ```bash
    ngrok http 8000
    ```
3.  Ekranda çıkan **Forwarding** adresini (Örn: `https://a1b2-88-255-xx.ngrok-free.app`) kopyalayın.

## 4. Webhook Ayarı
1.  Twilio Panelinde **Messaging > Settings > WhatsApp Sandbox Settings** kısmına gidin.
2.  **"When a message comes in"** kutucuğuna kopyaladığınız Ngrok adresinin sonuna `/webhook/whatsapp` ekleyerek yapıştırın.
    *   Örnek: `https://a1b2-88-255-xx.ngrok-free.app/webhook/whatsapp`
3.  **Save** butonuna basarak kaydedin.

## Kullanım
-   Artık programda bekleyen davetlerin yanında **Yeşil Telefon İkonu (✆)** göreceksiniz.
-   Tıkladığınızda o hakeme otomatik şablon mesajı gönderilir.
-   Hakem "Kabul" veya "Mazeret" yazdığında sistem saniyeler içinde durumu günceller.
