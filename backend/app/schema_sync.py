"""Idempotent schema upgrades applied at startup.

Render only runs `uvicorn`, never `alembic upgrade`, so tables/columns added by
newer migrations would be missing in production and every query touching them
would 500. These statements mirror migration a7d3c9e1f2b4 and are safe to run
on every boot (IF NOT EXISTS / backfill-only-NULL).
"""
import logging

from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.models import Address, OrderTrackingEvent

logger = logging.getLogger(__name__)

ORDER_COLUMNS = [
    ('fulfillmentType', "VARCHAR(20) DEFAULT 'PICKUP'"),
    ('fulfillmentStatus', "VARCHAR(32) DEFAULT 'PLACED'"),
    ('trackingNumber', 'VARCHAR'),
    ('checkoutGroupId', 'VARCHAR'),
    ('deliveryName', 'VARCHAR'),
    ('deliveryPhone', 'VARCHAR'),
    ('deliveryAddress', 'VARCHAR'),
    ('deliveryCity', 'VARCHAR'),
    ('deliveryPincode', 'VARCHAR'),
    ('deliveryInstructions', 'VARCHAR'),
    ('deliveryDate', 'TIMESTAMP WITHOUT TIME ZONE'),
    ('deliverySlot', 'VARCHAR'),
    ('estimatedDeliveryAt', 'TIMESTAMP WITHOUT TIME ZONE'),
    ('deliveryFee', 'DOUBLE PRECISION DEFAULT 0'),
    ('deliveryOtp', 'VARCHAR'),
    ('deliveryPartnerName', 'VARCHAR'),
    ('deliveryPartnerPhone', 'VARCHAR'),
    ('deliveredAt', 'TIMESTAMP WITHOUT TIME ZONE'),
    ('cancelledAt', 'TIMESTAMP WITHOUT TIME ZONE'),
    ('cancelReason', 'VARCHAR'),
    ('refundStatus', 'VARCHAR'),
    ('rating', 'INTEGER'),
    ('review', 'VARCHAR'),
    ('updatedAt', 'TIMESTAMP WITHOUT TIME ZONE'),
]


def ensure_delivery_schema(engine: Engine) -> None:
    try:
        with engine.begin() as conn:
            existing = {r[0] for r in conn.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'Order'"
            ))}
            first_run = "fulfillmentStatus" not in existing
            for name, ddl in ORDER_COLUMNS:
                conn.execute(text(f'ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "{name}" {ddl}'))
            conn.execute(text('CREATE UNIQUE INDEX IF NOT EXISTS "ix_Order_trackingNumber" ON "Order" ("trackingNumber")'))
            conn.execute(text('CREATE INDEX IF NOT EXISTS "ix_Order_checkoutGroupId" ON "Order" ("checkoutGroupId")'))

            # Backfill orders that predate delivery tracking. The column default fills
            # existing rows with PLACED, so map legacy statuses only on first creation.
            if first_run:
                conn.execute(text('''
                    UPDATE "Order" SET "fulfillmentStatus" = CASE "status"::text
                        WHEN 'CANCELLED' THEN 'CANCELLED'
                        WHEN 'DELIVERED' THEN 'DELIVERED'
                        WHEN 'CONFIRMED' THEN 'CONFIRMED'
                        ELSE 'PLACED' END
                '''))
            conn.execute(text('''UPDATE "Order" SET "fulfillmentType" = 'PICKUP' WHERE "fulfillmentType" IS NULL'''))
            conn.execute(text('''UPDATE "Order" SET "deliveryFee" = 0 WHERE "deliveryFee" IS NULL'''))
            conn.execute(text('''
                UPDATE "Order"
                SET "trackingNumber" = 'SHK' || upper(substr(replace("id", '-', ''), 1, 12)),
                    "deliveryOtp" = lpad((floor(random() * 10000))::int::text, 4, '0')
                WHERE "trackingNumber" IS NULL
            '''))

        # New tables (checkfirst — no-op when they already exist)
        Address.__table__.create(bind=engine, checkfirst=True)
        OrderTrackingEvent.__table__.create(bind=engine, checkfirst=True)

        with engine.begin() as conn:
            # Give legacy orders a starting point on their tracking timeline
            conn.execute(text('''
                INSERT INTO "OrderTrackingEvent" ("id", "orderId", "status", "title", "description", "createdAt")
                SELECT gen_random_uuid()::text, o."id", 'PLACED', 'Order placed',
                       'We''ve received your order and notified the farmer.', o."createdAt"
                FROM "Order" o
                WHERE NOT EXISTS (SELECT 1 FROM "OrderTrackingEvent" e WHERE e."orderId" = o."id")
            '''))
        logger.info("Delivery/tracking schema is up to date")
    except Exception:
        # Never block startup; the error will also surface on the affected endpoints
        logger.exception("Failed to apply delivery/tracking schema upgrades")
