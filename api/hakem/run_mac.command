#!/bin/bash

# Dosyanın bulunduğu dizine git
cd "$(dirname "$0")"

echo "Hakem Takip Sistemi Başlatılıyor..."

# Python kontrolü
if ! command -v python3 &> /dev/null; then
    echo "Python 3 bulunamadı! Lütfen Python'u yükleyin: https://www.python.org/downloads/"
    exit 1
fi

# Sanal ortam kontrolü ve oluşturma
if [ ! -d "venv" ]; then
    echo "İlk kurulum yapılıyor..."
    python3 -m venv venv
    source venv/bin/activate
    echo "Gerekli kütüphaneler yükleniyor..."
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Tarayıcıyı aç
echo "Tarayıcı açılıyor..."
open http://127.0.0.1:8000

# Uygulamayı başlat
echo "Uygulama çalışıyor. Durdurmak için pencereyi kapatabilirsiniz."
uvicorn main:app --reload --host 0.0.0.0 --port 8000
