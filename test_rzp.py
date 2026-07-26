import razorpay
try:
    client = razorpay.Client(auth=("rzp_test_1DP5mmOlF5G5ag", "1234567890")) # usually secret is needed.
    order = client.order.create({"amount": 100, "currency": "INR", "receipt": "test_1"})
    print("SUCCESS", order)
except Exception as e:
    print("ERROR", e)
