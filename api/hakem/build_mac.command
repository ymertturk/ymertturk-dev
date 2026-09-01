#!/bin/bash
cd "$(dirname "$0")"

echo "Hakem Takip Sistemi - Uygulama Oluşturucu"
echo "-----------------------------------------"

# Sanal ortam kontrolü
if [ ! -d "venv" ]; then
    echo "Sanal ortam kuruluyor..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    pip install pyinstaller
else
    source venv/bin/activate
    pip install pyinstaller
fi

echo ""
echo "Uygulama oluşturuluyor..."

# PyInstaller komutu
# Mac için --add-data formatı farklıdır (source:dest)
pyinstaller --noconsole --onefile --name "HakemTakipSistemi" --add-data "templates:templates" --add-data "static:static" main.py

echo ""
echo "Kullanım Kılavuzu kopyalanıyor..."
cp KULLANIM_KILAVUZU.md dist/

echo ""
echo "İşlem tamamlandı!"
echo ""
echo "Oluşan dosya: dist/HakemTakipSistemi"
echo ""
echo "Bu dosyayı diğer Mac bilgisayarlarda çalıştırabilirsiniz."
