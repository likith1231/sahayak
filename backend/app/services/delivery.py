"""Delivery & tracking rules: slots, fees, serviceability and status flows."""
import random
import string
from datetime import datetime, timedelta, date
from typing import Optional

from app.models import FulfillmentStatus, FulfillmentType, Order, OrderTrackingEvent

# All timestamps in the DB are naive UTC; slots are expressed in IST for users.
IST_OFFSET = timedelta(hours=5, minutes=30)

DELIVERY_SLOTS = [
    {"id": "MORNING", "label": "Morning", "window": "8 AM – 12 PM", "start": 8, "end": 12},
    {"id": "AFTERNOON", "label": "Afternoon", "window": "12 PM – 4 PM", "start": 12, "end": 16},
    {"id": "EVENING", "label": "Evening", "window": "4 PM – 8 PM", "start": 16, "end": 20},
]
SLOT_BY_ID = {s["id"]: s for s in DELIVERY_SLOTS}

# Farmers need time to harvest/pack, so the earliest slot starts this many hours out.
MIN_LEAD_HOURS = 6
SLOT_DAYS_AHEAD = 5

# Pickup orders: farmer typically has produce at the center within a day.
PICKUP_READY_HOURS = 24

DELIVERY_FEE = 40.0
FREE_DELIVERY_THRESHOLD = 500.0

# Distribution centers are in Karnataka, whose pincodes run 560xxx–599xxx.
SERVICEABLE_PREFIXES = tuple(str(p) for p in range(56, 60))

DELIVERY_FLOW = [
    FulfillmentStatus.PLACED,
    FulfillmentStatus.CONFIRMED,
    FulfillmentStatus.PACKED,
    FulfillmentStatus.IN_TRANSIT,
    FulfillmentStatus.OUT_FOR_DELIVERY,
    FulfillmentStatus.DELIVERED,
]
PICKUP_FLOW = [
    FulfillmentStatus.PLACED,
    FulfillmentStatus.CONFIRMED,
    FulfillmentStatus.PACKED,
    FulfillmentStatus.READY_FOR_PICKUP,
    FulfillmentStatus.DELIVERED,
]

# Consumers may cancel until the order leaves the farm / is waiting at the center.
CANCELLABLE = {FulfillmentStatus.PLACED, FulfillmentStatus.CONFIRMED, FulfillmentStatus.PACKED}

STATUS_COPY = {
    FulfillmentType.DELIVERY: {
        FulfillmentStatus.PLACED: ("Order placed", "We've received your order and notified the farmer."),
        FulfillmentStatus.CONFIRMED: ("Order confirmed", "The farmer has accepted your order."),
        FulfillmentStatus.PACKED: ("Packed", "Your produce has been harvested and packed."),
        FulfillmentStatus.IN_TRANSIT: ("Shipped", "Your order is on its way to your city."),
        FulfillmentStatus.OUT_FOR_DELIVERY: ("Out for delivery", "Your order will reach you today."),
        FulfillmentStatus.DELIVERED: ("Delivered", "Your order has been delivered."),
        FulfillmentStatus.CANCELLED: ("Cancelled", "This order was cancelled."),
    },
    FulfillmentType.PICKUP: {
        FulfillmentStatus.PLACED: ("Order placed", "We've received your order and notified the farmer."),
        FulfillmentStatus.CONFIRMED: ("Order confirmed", "The farmer has accepted your order."),
        FulfillmentStatus.PACKED: ("Packed", "Your produce has been harvested and packed."),
        FulfillmentStatus.READY_FOR_PICKUP: ("Ready for pickup", "Your order is waiting at the distribution center."),
        FulfillmentStatus.DELIVERED: ("Picked up", "You collected this order."),
        FulfillmentStatus.CANCELLED: ("Cancelled", "This order was cancelled."),
    },
}


def now_ist() -> datetime:
    return datetime.utcnow() + IST_OFFSET


def ist_to_utc(dt: datetime) -> datetime:
    return dt - IST_OFFSET


def flow_for(fulfillment_type: FulfillmentType) -> list:
    return DELIVERY_FLOW if fulfillment_type == FulfillmentType.DELIVERY else PICKUP_FLOW


def status_title(fulfillment_type: FulfillmentType, status: FulfillmentStatus) -> str:
    return STATUS_COPY[fulfillment_type][status][0]


def next_status(fulfillment_type: FulfillmentType, status: FulfillmentStatus) -> Optional[FulfillmentStatus]:
    flow = flow_for(fulfillment_type)
    if status not in flow:
        return None
    idx = flow.index(status)
    return flow[idx + 1] if idx + 1 < len(flow) else None


def is_serviceable(pincode: str) -> bool:
    return bool(pincode) and len(pincode) == 6 and pincode.isdigit() and pincode.startswith(SERVICEABLE_PREFIXES)


def available_slots(pincode: Optional[str] = None) -> list:
    """Bookable delivery slots for the next few days, in IST."""
    current = now_ist()
    earliest = current + timedelta(hours=MIN_LEAD_HOURS)
    # Outside Bengaluru urban (560xxx), produce needs an extra day on the road.
    extra_days = 0 if (pincode or "").startswith("560") or not pincode else 1

    days = []
    for offset in range(SLOT_DAYS_AHEAD + extra_days):
        day = (current + timedelta(days=offset)).date()
        if offset < extra_days:
            continue
        slots = []
        for s in DELIVERY_SLOTS:
            start = datetime.combine(day, datetime.min.time()) + timedelta(hours=s["start"])
            slots.append({
                "id": s["id"],
                "label": s["label"],
                "window": s["window"],
                "available": start >= earliest,
            })
        if any(sl["available"] for sl in slots):
            days.append({
                "date": day.isoformat(),
                "label": _day_label(day, current.date()),
                "slots": slots,
            })
    return days


def validate_slot(day_str: str, slot_id: str, pincode: Optional[str]) -> Optional[datetime]:
    """Return the slot's end time (UTC) if the slot is bookable, else None."""
    if slot_id not in SLOT_BY_ID:
        return None
    for d in available_slots(pincode):
        if d["date"] == day_str:
            for s in d["slots"]:
                if s["id"] == slot_id and s["available"]:
                    day = date.fromisoformat(day_str)
                    end = datetime.combine(day, datetime.min.time()) + timedelta(hours=SLOT_BY_ID[slot_id]["end"])
                    return ist_to_utc(end)
    return None


def delivery_fee(subtotal: float) -> float:
    return 0.0 if subtotal >= FREE_DELIVERY_THRESHOLD else DELIVERY_FEE


def generate_tracking_number() -> str:
    return "SHK" + now_ist().strftime("%y%m%d") + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


def generate_otp() -> str:
    return f"{random.randint(0, 9999):04d}"


def add_event(order: Order, status: FulfillmentStatus, description: Optional[str] = None, location: Optional[str] = None) -> OrderTrackingEvent:
    title, default_desc = STATUS_COPY[order.fulfillmentType or FulfillmentType.PICKUP][status]
    event = OrderTrackingEvent(
        status=status.value,
        title=title,
        description=description or default_desc,
        location=location,
    )
    order.trackingEvents.append(event)
    return event


def _day_label(day: date, today: date) -> str:
    if day == today:
        return "Today"
    if day == today + timedelta(days=1):
        return "Tomorrow"
    return day.strftime("%a, %d %b")
