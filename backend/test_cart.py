import requests

# 1. Login
login_resp = requests.post("http://localhost:8000/api/auth/login", json={"phone": "8888888800", "password": "password123"})
token = login_resp.json().get("token")
print("Login token length:", len(token))

# 2. Get listings
listings_resp = requests.get("http://localhost:8000/api/listings")
listings_data = listings_resp.json()
first_listing_id = listings_data["listings"][0]["id"]

# 3. Add to cart
cart_add_resp = requests.post(
    "http://localhost:8000/api/cart/items", 
    json={"listingId": first_listing_id, "quantity": 1},
    headers={"Authorization": f"Bearer {token}"}
)
print("Add to cart response:", cart_add_resp.json())

# 4. Get cart
cart_get_resp = requests.get("http://localhost:8000/api/cart", headers={"Authorization": f"Bearer {token}"})
print("Get cart 1 items:", len(cart_get_resp.json().get("items", [])))

# 5. Login again to simulate logout/login
login_resp2 = requests.post("http://localhost:8000/api/auth/login", json={"phone": "8888888800", "password": "password123"})
token2 = login_resp2.json().get("token")
print("Login 2 token length:", len(token2))

# 6. Get cart again
cart_get_resp2 = requests.get("http://localhost:8000/api/cart", headers={"Authorization": f"Bearer {token2}"})
print("Get cart 2 items:", len(cart_get_resp2.json().get("items", [])))
