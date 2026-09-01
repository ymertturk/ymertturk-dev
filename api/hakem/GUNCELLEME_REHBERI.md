# Hakem Takip Sistemi - Güncelleme Rehberi

Bu rehber, **Windows** işletim sisteminde çalışan mevcut yazılımınızı, verilerinizi kaybetmeden yeni sürüme nasıl güncelleyeceğinizi anlatır.

## ⚠️ ÖNEMLİ: Yedek Alma
Herhangi bir işlem yapmadan önce lütfen mevcut klasörünüzün yedeğini alın.
1. Mevcut program klasörünüzü kopyalayın.
2. `Yedek_Hakem` gibi bir isimle masaüstüne yapıştırın.
3. Bir sorun olursa bu yedekten geri dönebilirsiniz.

## Güncelleme Adımları

### 1. Dosyaları Kopyalayın
Size gönderilen **yeni sürüm dosyalarının tamamını**, mevcut programınızın olduğu klasörün içine sürükleyip bırakın.
- "Dosyaları değiştirilsin mi?" sorusuna **EVET (Tümünü Değiştir)** deyin.

### 2. Veritabanını Güncelleyin
Yeni gelen dosyalar arasında `guncelle.bat` (veya `update_db.py`) adında bir dosya göreceksiniz.

Bu script, **eski veritabanınızı tarayacak** ve Telegram, yarışlar, sicil no gibi **yeni özelliklerin hepsi için gerekli alanları otomatik olarak ekleyecektir.** Eski verileriniz korunurken, altyapınız en son sürüme yükseltilir.

1. `guncelle.bat` dosyasına çift tıklayın.
2. Açılan siyah pencerede güncelleme işlemlerinin yapıldığını göreceksiniz.
3. İşlem bittiğinde "GÜNCELLEME BAŞARIYLA TAMAMLANDI" yazısını göreceksiniz.
4. `Enter` tuşuna basarak pencereyi kapatın.

> **Not:** Eğer `guncelle.bat` çalışmazsa veya hata verirse, bilgisayarınızda Python yüklü olduğundan emin olun veya yöneticiyle iletişime geçin.

### 3. Programı Başlatın
Artık her zamanki gibi `main.exe` (veya `run_windows.bat`) dosyasını kullanarak programı açabilirsiniz. Eski verileriniz ve yeni özellikler bir arada çalışacaktır.

---
### Yeni Eklenen Özellikler
- **Yönetici Duyuru Sistemi:** Telegram üzerinden toplu duyuru yapabilme.
- **Manuel Durum Güncelleme:** Hakem davet durumlarını elle değiştirebilme.
- **Excel Düzeltmeleri:** Şampiyona isimlerindeki hata giderildi.
