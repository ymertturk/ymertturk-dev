@echo off
title Hakem Takip Sistemi Baslatiliyor...
echo Lutfen bekleyin, sistem hazirlaniyor...

REM Python kontrolu
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python bulunamadi! Lutfen Python'u yukleyin: https://www.python.org/downloads/
    echo Yuklerken "Add Python to PATH" secenegini isaretlemeyi unutmayin.
    pause
    exit
)

REM Sanal ortam kontrolu ve olusturma
if not exist "venv" (
    echo Kurulum yapiliyor (Sadece ilk seferde olur)...
    python -m venv venv
    call venv\Scripts\activate
    echo Gerekli kutuphaneler yukleniyor...
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate
)

REM Tarayiciyi ac
echo Tarayici aciliyor...
start http://127.0.0.1:8000

REM Uygulamayi baslat
echo Uygulama baslatiliyor...
echo Kapatmak icin bu pencereyi kapatin.
uvicorn main:app --reload --host 0.0.0.0 --port 8000

pause
