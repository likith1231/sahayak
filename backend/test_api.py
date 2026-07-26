import requests
try:
    resp = requests.get("http://localhost:8000/api/listings", timeout=5)
    print("Status:", resp.status_code)
    print("Data:", resp.text[:200])
except Exception as e:
    print("Error:", e)
