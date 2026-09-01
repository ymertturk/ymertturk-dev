 # Hakem Takip Sistemi

Atletizm yarışmaları için hakem ve davet takip sistemi.

## 📦 Kurulumsuz Çalıştırma (EXE Oluşturma)

Bu programı Python yüklü olmayan bilgisayarlarda çalıştırmak için "tek dosya" haline getirebilirsiniz.

### Windows İçin EXE Oluşturma (sadece Yönetici yapar)
1. Bu klasörü, **Python yüklü olan** bir Windows bilgisayara indirin.
2. **`build_windows.bat`** dosyasına çift tıklayın. (Bu işlem gerekli paketleri yükleyip paketlemeyi yapar).
3. İşlem bittiğinde **`dist`** klasörünün içinde **`HakemTakipSistemi.exe`** oluşacaktır.

### Dağıtım (Kullanıcılara Gönderme)
Oluşturduğunuz `HakemTakipSistemi.exe` dosyasını (ve yanındaki `KULLANIM_KILAVUZU.md` dosyasını) alıp **Python olmayan herhangi bir bilgisayara** gönderebilirsiniz. 
**Kullanıcının Python kurmasına, kütüphane yüklemesine veya kurulum yapmasına gerek yoktur.** Sadece dosyaya çift tıklaması yeterlidir.

### Mac İçin Uygulama Oluşturma
1. **`build_mac.command`** dosyasına çift tıklayın.
2. İşlem bittiğinde **`dist`** klasörünün içinde **`HakemTakipSistemi`** dosyası oluşacaktır.

---

## 🚀 Geliştirici Modunda Çalıştırma

Eğer kodları değiştirmek veya geliştirmek isterseniz:

### Windows
**`run_windows.bat`** dosyasına tıklayın.

### Mac
**`run_mac.command`** dosyasına tıklayın.

---

## ☁️ İnternet Üzerinden Erişim (Web Sitesi)
Programı bir web sitesi olarak yayınlamak isterseniz (telefondan erişim için en kolayı):
1. Bu kodları GitHub'a yükleyin.
2. **Render.com**'da yeni bir "Web Service" oluşturun.
3. GitHub hesabınızı bağlayıp bu projeyi seçin.
4. Render otomatik olarak kurup size bir link verecektir.

---

## Özellikler
- **Hakemler**: Ekleme, arama, silme.
- **Davetler**: Durum takibi (Beklemede, Kabul, Mazeretli).
- **Toplu Ekleme**: Excel/CSV'den veya kopyala-yapıştır ile hızlı ekleme.
- **Güvenli Silme**: "HEPSİNİ SİL" onayı ile veri sıfırlama.
