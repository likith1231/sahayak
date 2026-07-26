import requests

response = requests.post(
    "http://127.0.0.1:8000/api/agent/chat",
    json={"message": "What is the price of tomatoes in Kolar?", "history": []},
    headers={"Authorization": "Bearer fake"}
)
print("Status:", response.status_code)
print("Response:", response.json())
