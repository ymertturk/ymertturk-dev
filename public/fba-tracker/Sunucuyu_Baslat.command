#!/bin/bash
# Port 8080 üzerinde çalışan eski süreçleri temizle
kill -9 $(lsof -t -i:8080) 2>/dev/null
# Tarayıcıyı aç
open http://localhost:8080
# Sunucuyu terminalde ön planda çalıştır (böylece terminal açık kaldığı sürece sunucu aktif kalır)
python3 -m http.server 8080 --directory /Users/ymertturk/.gemini/antigravity/scratch/amazon-fba-stock-tracker
