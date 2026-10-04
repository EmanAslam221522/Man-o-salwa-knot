import resend
import logging
from config import settings

logger = logging.getLogger(__name__)

if settings.RESEND_API_KEY:
    resend.api_key = settings.RESEND_API_KEY

def send_food_alert(to_email: str, food_details: dict) -> None:
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY missing. Skipping email send.")
        return

    food_name = food_details.get("food_name", "Surplus Food")
    quantity = food_details.get("quantity", "")
    unit = food_details.get("unit", "")
    price = food_details.get("price", "Free")
    location = food_details.get("location_text", "Unknown location")
    seller = food_details.get("seller_name", "Local business")
    expiry = food_details.get("expiry_time", "Soon")
    post_id = food_details.get("id", "")
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; color: #001F3F; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">New Food Rescue Available!</h2>
        </div>
        <div style="padding: 20px;">
            <p>Hi there,</p>
            <p>A new surplus food item matching your alerts is available on ManOSalwaKnot.</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0;">
                <h3 style="margin-top: 0;">{food_name}</h3>
                <p><strong>Quantity:</strong> {quantity} {unit}</p>
                <p><strong>Price:</strong> Rs {price}</p>
                <p><strong>Location:</strong> {location}</p>
                <p><strong>Offered by:</strong> {seller}</p>
                <p><strong>Expires:</strong> {expiry}</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
                <a href="https://manosalwaknot.com/food/{post_id}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">View on ManOSalwaKnot</a>
            </div>
        </div>
        <div style="background-color: #f1f1f1; color: #666; padding: 15px; text-align: center; font-size: 12px;">
            <p>You received this because you subscribed to food alerts in this area.</p>
            <p>ManOSalwaKnot - Saving food, serving communities.</p>
        </div>
    </div>
    """

    try:
        params = {
            "from": "ManOSalwaKnot <onboarding@resend.dev>",
            "to": [to_email],
            "subject": f"Food Alert: {food_name} available near you!",
            "html": html_content
        }
        resend.Emails.send(params)
        logger.info(f"Email sent successfully to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
