import requests
import os
import time

BASE_URL = "http://localhost:8000"

# Colors for output
GREEN = '\033[92m'
RED = '\033[91m'
RESET = '\033[0m'

def test(name, result):
    if result:
        print(f"{GREEN}[PASS]{RESET} {name}")
    else:
        print(f"{RED}[FAIL]{RESET} {name}")

def verify_ui_updates():
    session = requests.Session()
    # Login
    login_payload = {"username": "admin", "password": "admin123", "action": "login"}
    response = session.post(f"{BASE_URL}/login", data=login_payload)
    test("Admin Login", response.status_code == 200)

    # 1. Check Interactive Footer
    html = response.text
    test("Develoepr Modal Exists", '<dialog id="developer-modal"' in html)
    test("Contact Info - Phone", '+90 545 470 9233' in html)
    test("Contact Info - Email", 'ymertturk98@gmail.com' in html)
    test("BabilSoft Footer", 'BabilSoft' in html)
    test("Footer Trigger Button", 'onclick="document.getElementById(\'developer-modal\').showModal()"' in html)

    # 2. Check Parenthesis Fix
    test("Count UI Parenthesis Fix", "white-space: nowrap" in html and "(Toplam:" in html)

if __name__ == "__main__":
    try:
        verify_ui_updates()
    except Exception as e:
        print(f"{RED}Test Failed with Exception:{RESET} {e}")
