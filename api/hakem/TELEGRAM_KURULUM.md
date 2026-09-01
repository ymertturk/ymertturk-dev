# Telegram Bot Entegrasyonu Kılavuzu

Bu özellik, hakemlere otomatik Telegram mesajı göndermenizi ve gelen cevapları butonlarla ("Kabul", "Mazeret") otomatik olarak sisteme kaydetmenizi sağlar.

**ÖNEMLİ:** Sistem "Polling" (Sürekli Dinleme) yöntemini kullandığı için **Ngrok veya herhangi bir ek uygulama indirmeye gerek yoktur.** Program çalışırken Telegram'dan gelen mesajları otomatik olarak algılar.

## 1. Telegram Botu Oluşturma
*(Zaten yaptıysanız bu adımı geçin)*
1.  Telegram uygulamasını açın ve arama çubuğuna **@BotFather** yazın.
2.  BotFather ile sohbeti başlatın ve `/newbot` komutunu gönderin.
3.  Botunuza bir isim ve kullanıcı adı verin.
4.  Size verilen **HTTP API Token** bilgisini not edin.

## 2. Sistemi Yapılandırma
*(Sisteminiz zaten yapılandırıldı, tekrar yapmanıza gerek yok)*
Eğer token değiştirmek isterseniz:
1.  Terminali açın (`Hakem/referee_tracker` klasöründe).
2.  `python setup_telegram.py` komutunu çalıştırın.
3.  Token bilginizi girin.

## 3. Hakemleri Sisteme Bağlama
Hakemlerin size davet gönderebilmesi için öncelikle **Telefon Numaralarını Paylaşmaları** gerekmektedir.

1.  Hakemlere Botunuzun linkini gönderin (Örn: `t.me/HakemDavet_bot`).
2.  Hakem **Başlat** (/start) tuşuna bastığında bir **"Telefonumu Paylaş"** butonu görecektir.
3.  Bu butona bastıktan sonra sistem, gelen telefon numarası ile veritabanındaki hakemi eşleştirir.
4.  Eşleşme sağlandığında hakeme "Kaydınız tamamlandı" mesajı gider.

## 4. Kullanım
1.  Programda bekleyen davetlerin yanında **Mavi Uçak İkonu (✈)** göreceksiniz.
    -   **Gri İkon**: Hakem botu başlatmamış veya telefon paylaşmamış.
    -   **Mavi İkon**: Gönderime hazır.
2.  Mavi ikona tıkladığınızda davet gönderilir.
3.  Hakem, mesajın altındaki **"Kabul Ediyorum"** veya **"Mazeretliyim"** butonlarına tıklayarak cevap verir.
4.  **NOT:** 24 saat içinde cevap verilmeyen davetlerde butonlar otomatik olarak devre dışı kalır ve işlem yapılamaz.
