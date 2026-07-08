import urllib.request
import json

# Just testing the payload format error, so any dummy key is fine
url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyFakeKey"
headers = {'Content-Type': 'application/json'}
data = {
    "contents": [{"role": "user", "parts": [{"text": "hi"}]}],
    "system_instruction": {"parts": [{"text": "hi"}]}
}

req = urllib.request.Request(url, json.dumps(data).encode('utf-8'), headers)
try:
    urllib.request.urlopen(req)
except Exception as e:
    error_info = e.read().decode('utf-8')
    print("Error:", error_info)
