import os
import resend

resend.api_key = os.environ.get("RESEND_API_KEY", "")

def send_order_confirmation(to_email: str, order_details: dict):
    if not resend.api_key:
        print("RESEND_API_KEY not set. Skipping email send.")
        return
        
    try:
        html_content = f"""
        <h1>Order Confirmation</h1>
        <p>Thank you for your order on Sahayak!</p>
        <p><strong>Total Amount:</strong> ₹{order_details.get('total_amount', 0)}</p>
        <h3>Pickup Details:</h3>
        <ul>
        """
        
        for dc in order_details.get('pickup_details', []):
            html_content += f"<li><strong>{dc['dc']['name']}</strong>: {dc['dc']['address']}</li>"
            
        html_content += """
        </ul>
        <p>Please present your order ID at the pickup location.</p>
        """

        params = {
            "from": "Sahayak <onboarding@resend.dev>",
            "to": [to_email],
            "subject": "Your Sahayak Order Confirmation",
            "html": html_content
        }
        
        email = resend.Emails.send(params)
        print("Email sent successfully:", email)
        return email
    except Exception as e:
        print(f"Error sending email: {e}")
        return None
