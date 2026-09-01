# Hakem Takip Sistemi - Kullanım Kılavuzu

Bu kılavuz, Hakem Takip Sistemi'nin tüm özelliklerini, kurulumunu ve kullanım detaylarını kapsar.

## 0. Kurulum ve Başlangıç
Bu program **kurulum gerektirmez**. Size gönderilen klasör içerisindeki `HakemTakipSistemi` (veya benzeri) çalıştırılabilir dosyayı açmanız yeterlidir. 

### İlk Çalıştırma ve Lisanslama
Program açıldığında sizi bir **Giriş (Login)** ekranı karşılayacaktır.

*   **Test Kullanıcısı**: Sistemi denemek için.
    *   Kullanıcı Adı: `test`
    *   Şifre: `test`
    *   *Kısıtlama: Bu kullanıcı MAC adresi kontrolüne takılmaz.*

*   **Yönetici (Admin)**: Tam yetkili kullanıcıdır.
    *   Kullanıcı Adı: `admin`
    *   Şifre: `admin123`
    *   *Özellik: Her bilgisayardan giriş yapabilir, tüm ayarları değiştirebilir.*

*   **Standart Kullanıcı**: Günlük kullanım içindir.
    *   Kullanıcı Adı: `selahattinsahin`
    *   Şifre: `selahattin1234`
    *   **Önemli**: Bu kullanıcı ile ilk kez hangi bilgisayardan giriş yapılırsa, lisans o bilgisayara kilitlenir (MAC Adresi Eşleşmesi). Başka bir bilgisayardan aynı kullanıcı adı ile giriş yapılamaz.
    *   **EK YETKİ**: Bu kullanıcı "Verileri Sıfırla" yetkisine sahiptir.

## 1. Hakem Yönetimi
Ana ekranda tüm hakemleri listeleyebilir, arayabilir ve yönetebilirsiniz.

### Hakem Ekleme
*   Sağ menüde yer alan **"Yeni Hakem Ekle"** formunu kullanın.
*   **Ad Soyad** zorunludur.
*   **Sicil No**, **Telefon** ve **Bölge** bilgileri isteğe bağlıdır ancak girilmesi önerilir.
*   "Kaydet" butonuna bastığınızda liste anında güncellenir ve veritabanı yedeği alınır.

### Hakem Arama ve Filtreleme
*   **Arama**: Üst kısımdaki arama kutusuna isim yazarak anlık filtreleme yapabilirsiniz.
*   **Sekmeler**:
    *   **Tüm Hakemler**: Kayıtlı herkesi gösterir.
    *   **Hiç Davet Almayanlar**: Henüz sisteme herhangi bir yarış için kaydedilmemiş hakemleri listeler.
*   **Yarış Filtresi**: Belirli bir yarış seçerek, sadece o yarışa davet edilmiş hakemleri görebilirsiniz.

## 2. Davet (Yarış Görevi) Yönetimi
Bir hakemin ismine tıklayarak **Detay Sayfasına** gidin.

### Davet Oluşturma
*   Sağ menüden tarih seçerek yeni bir davet oluşturabilirsiniz.
*   **Yarış Adı** (Örn: "2024 İl Şampiyonası") girebilirsiniz.
*   **Durum**:
    *   **BEKLEMEDE**: Henüz yanıt alınmadı.
    *   **KABUL**: Görevi kabul etti (Yeşil).
    *   **MAZERETLİ**: Gelemeyeceğini belirtti (Kırmızı).

### Google Forms veya Excel'den Toplu Yanıt İşleme
Google Forms anket sonuçlarını veya elinizdeki Excel listesini sisteme işleyebilirsiniz.
1.  Üst menüden **"İçe Aktar"** -> **"Form Yanıtları"** (veya benzeri) bölümüne gidin.
2.  **Yarış Tarihi** ve **Yarış Adı** girin.
3.  Google Sheets/Excel'den kopyaladığınız veriyi (İsim ve Yanıt sütunları) yapıştırın.
4.  Sistem şu kelimeleri otomatik tanır:
    *   "Kabul", "Geliyorum" -> **KABUL**
    *   "Mazeret", "Hayır", "Kabul Edemiyorum" -> **MAZERETLİ**
5.  **"Verileri İşle"** diyerek işlemi tamamlayın.

## 3. Veri Aktarımı (Import / Export)

### İçe Aktarma (Import) - Akıllı Güncelleme
Üst menüdeki **"İçe Aktar"** sayfasından üç yöntemle veri yükleyebilirsiniz:
1.  **Kopyala-Yapıştır**: Excel'den kopyalayıp yapıştırarak.
2.  **CSV Dosyası**: Bilgisayarınızdaki bir dosyayı seçerek.
3.  **Google Drive**: Herkese açık bir Google Sheets bağlantısı girerek.

**Akıllı Güncelleme (Upsert) Özelliği**:
*   Sistem, yüklediğiniz kişileri önce **Sicil No**, sonra **İsim** benzerliğine göre kontrol eder.
*   Kişi zaten varsa: Telefon, Bölge vb. bilgileri günceller.
*   Dosyada yarış bilgisi (Yarış Adı, Durum) varsa, o kişinin davet durumunu da günceller.
*   Kişi yoksa: Yeni kayıt oluşturur.

### Dışa Aktarma (Export) - Excel İndir
Üst menüdeki **"Excel İndir"** butonuna tıklayın.
*   **Kimi İndireyim?**: Tüm Hakemler veya (Detay sayfasındaysanız) Tek Hakem.
*   **Hangi Yarış Verileri?**:
    *   **Tüm Yarışlar**: Genel liste.
    *   **Belirli Bir Yarış**: Seçtiğiniz yarışın davet durumlarını (Kabul/Red) içeren özel bir liste oluşturur. Bu listeyi üzerinde değişiklik yapıp tekrar sisteme yükleyebilirsiniz (Smart Import).

## 4. Güvenlik ve Yedekleme

### Otomatik Yedekleme
*   Sistemde yaptığınız her değişiklikte (Ekleme, Silme, Güncelleme), **otomatik olarak** bir yedek alınır.
*   Yedekler `backups` klasöründe tarih-saat ismiyle saklanır.
*   Bir hata durumunda bu dosyalardan geri dönüş yapılabilir.

### Verileri Sıfırlama
*   **Admin** veya **Selahattin Şahin** kullanıcısı, **"Verileri Sıfırla"** menüsünü görebilir.
*   Bu işlem tüm hakem ve davet kayıtlarını siler. Geri alınamaz (Yedekler hariç).

## 6. Telegram Bildirim Kurulumu
Selahattin Şahin'in telefonuna bildirim gelmesi için (veya genel sistem botu kurulumu için) şu adımları izleyin:

### Adım 1: Bot Oluşturma
1.  Telegram'da **@BotFather** kullanıcısını bulun ve mesaj atın.
2.  `/newbot` komutunu gönderin.
3.  Sizden bir bot ismi (örn: `HakemTakip`) ve kullanıcı adı (örn: `HakemTakipBot`) isteyecektir.
4.  İşlem sonunda size uzun bir **TOKEN** verecektir. Bu token'ı kopyalayın.

### Adım 2: Yönetici ID Öğrenme
1.  Telegram'da **@userinfobot** kullanıcısını bulun ve başlatın.
2.  Size `Id: 12345678` şeklinde bir numara verecektir. Bu numarayı kaydedin.

### Adım 3: Sisteme Kaydetme
1.  Hakem Takip Programını açın.
2.  **admin** kullanıcısı ile giriş yapın (Şifre: `admin123`).
3.  Üst menüden **"⚙️ Ayarlar"** kısmına tıklayın.
4.  **Bot Token** kısmına @BotFather'dan aldığınız token'ı yapıştırın.
5.  **Bot Kullanıcı Adı** kısmına botunuzun kullanıcı adını yazın (@ işareti olmadan).
6.  **Yönetici Chat ID** kısmına @userinfobot'tan aldığınız numarayı yazın.
7.  **Kaydet** butonuna basın.

Artık hakemler "Kabul Ediyorum" butonuna bastığında, "Yönetici Chat ID" kısmına yazdığınız kişiye otomatik bildirim gelecektir.

### Yönetici Duyuru Sistemi
Yönetici (Admin) veya yetkili kullanıcı, Telegram üzerinden belirli bir yarışa katılan hakemlere toplu mesaj gönderebilir.

1.  Botunuzun olduğu sohbete gidin.
2.  `/duyuru` komutunu yazın ve gönderin.
3.  Bot size aktif yarışların listesini buton olarak gösterecektir.
4.  Duyuru yapmak istediğiniz yarışı seçin.
5.  Bot "Mesajınızı gönderin" dediğinde:
    *   İster **yazılı bir mesaj** yazın,
    *   İster **fotoğraf** veya **dosya (PDF vb.)** gönderin.
6.  Gönderdiğiniz içerik, o yarış için "KABUL" durumundaki tüm hakemlere otomatik olarak iletilir.
7.  İşlem sonunda bot size "X kişiye gönderildi" şeklinde rapor verir.

## 7. Manuel Durum Güncelleme
Bir hakem sizi telefonla arayıp "Gelemiyorum" veya "Geleceğim" derse, panelden durumunu elle değiştirebilirsiniz.

1.  Admin kullanıcısı ile sisteme giriş yapın.
2.  İlgili hakemin detay sayfasına gidin.
3.  Davet listesinde, durumun yazdığı yerin (örn: BEKLEMEDE) artık bir **açılır menü** olduğunu göreceksiniz.
4.  Bu menüyü değiştirerek (KABUL, MAZERETLİ vb.) hakemin durumunu anında güncelleyebilirsiniz.

## 8. İpuçları
*   **Sicil No**: Hakemlerin benzersiz kimliğidir. Mümkünse mutlaka sicil no giriniz, bu sayede isim benzerliği karışıklıkları önlenir.
*   **Performans**: Sistem binlerce hakem kaydını sorunsuz işleyebilir.
*   **Tarayıcı**: Arayüz, modern web teknolojileri kullanır ve tüm güncel tarayıcılarda (Chrome, Edge, Firefox) çalışır.
