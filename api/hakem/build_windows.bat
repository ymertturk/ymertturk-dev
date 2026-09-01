@echo off
echo Hakem Takip Sistemi - EXE Olusturucu
echo -------------------------------------
echo Bu islem Python gerektirir. Olusan EXE dosyasi Python gerektirmez.

REM Sanal ortam kontrolu
if not exist "venv" (
    echo Sanal ortam kuruluyor...
    python -m venv venv
    call venv\Scripts\activate
    pip install -r requirements.txt
    pip install pyinstaller
) else (
    call venv\Scripts\activate
    pip install pyinstaller
)

echo.
echo EXE dosyasi olusturuluyor...
echo Bu islem biraz zaman alabilir...

REM PyInstaller komutu
REM --onefile: Tek bir exe dosyasi olustur
REM --noconsole: Siyah pencere acilmasin
REM --add-data: Sablonlari exe icine gom
REM --name: Dosya adi

REM Static klasoru kontrolu (yoksa hata verebilir)
if not exist "static" mkdir static

pyinstaller --noconsole --onefile --name "HakemTakipSistemi" --add-data "templates;templates" --add-data "static;static" main.py

if %errorlevel% neq 0 (
    echo.
    echo HATA: EXE olusturulamadi!
    echo Lutfen yukaridaki hata mesajlarini kontrol edin.
    pause
    exit /b
)

echo.
echo Kullanim Kilavuzu kopyalaniyor...
copy KULLANIM_KILAVUZU.md dist\

echo.
echo Islem tamamlandi!
echo.
echo Olusan dosya surada olmali: dist\HakemTakipSistemi.exe
echo.
echo Eger dist klasorunu goremiyorsaniz, bu pencerenin oldugu klasoru kontrol edin.
pause
