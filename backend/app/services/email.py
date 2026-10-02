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
        """

        tracking = order_details.get('tracking_numbers') or []
        if tracking:
            html_content += f"<p><strong>Tracking number(s):</strong> {', '.join(tracking)}</p>"

        delivery = order_details.get('delivery')
        if delivery:
            html_content += f"""
            <h3>Home Delivery</h3>
            <p>{delivery.get('name')}<br/>{delivery.get('address')}<br/>{delivery.get('city')} - {delivery.get('pincode')}</p>
            <p><strong>Delivery slot:</strong> {delivery.get('date')}, {delivery.get('slot')}</p>
            <p>Track your order live from <em>My Orders</em> on Sahayak.</p>
            """
        elif order_details.get('pickup_details'):
            html_content += "<h3>Pickup Details:</h3><ul>"
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
