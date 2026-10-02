"""Add home delivery, order tracking and saved addresses

Revision ID: a7d3c9e1f2b4
Revises: 5cf19c63066d
Create Date: 2026-10-02 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7d3c9e1f2b4'
down_revision: Union[str, Sequence[str], None] = '5cf19c63066d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


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


def upgrade() -> None:
    """Upgrade schema."""
    # The Order table predates alembic (created by Prisma), so add columns idempotently.
    for name, ddl in ORDER_COLUMNS:
        op.execute(f'ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "{name}" {ddl}')

    op.execute('CREATE UNIQUE INDEX IF NOT EXISTS "ix_Order_trackingNumber" ON "Order" ("trackingNumber")')
    op.execute('CREATE INDEX IF NOT EXISTS "ix_Order_checkoutGroupId" ON "Order" ("checkoutGroupId")')

    # Backfill existing orders so they show up sensibly in tracking views.
    op.execute('''
        UPDATE "Order" SET "fulfillmentStatus" = CASE "status"::text
            WHEN 'CANCELLED' THEN 'CANCELLED'
            WHEN 'DELIVERED' THEN 'DELIVERED'
            WHEN 'CONFIRMED' THEN 'CONFIRMED'
            ELSE 'PLACED' END
    ''')
    op.execute('''UPDATE "Order" SET "fulfillmentType" = 'PICKUP' WHERE "fulfillmentType" IS NULL''')
    op.execute('''UPDATE "Order" SET "deliveryFee" = 0 WHERE "deliveryFee" IS NULL''')
    op.execute('''
        UPDATE "Order"
        SET "trackingNumber" = 'SHK' || upper(substr(replace("id", '-', ''), 1, 12)),
            "deliveryOtp" = lpad((floor(random() * 10000))::int::text, 4, '0')
        WHERE "trackingNumber" IS NULL
    ''')

    op.create_table('OrderTrackingEvent',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('orderId', sa.String(), nullable=False),
    sa.Column('status', sa.String(), nullable=False),
    sa.Column('title', sa.String(), nullable=False),
    sa.Column('description', sa.String(), nullable=True),
    sa.Column('location', sa.String(), nullable=True),
    sa.Column('createdAt', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['orderId'], ['Order.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_OrderTrackingEvent_orderId', 'OrderTrackingEvent', ['orderId'])

    # Seed a "placed" event for existing orders so their timeline isn't empty.
    op.execute('''
        INSERT INTO "OrderTrackingEvent" ("id", "orderId", "status", "title", "description", "createdAt")
        SELECT gen_random_uuid()::text, "id", 'PLACED', 'Order placed',
               'We''ve received your order and notified the farmer.', "createdAt"
        FROM "Order"
    ''')

    op.create_table('Address',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('userId', sa.String(), nullable=False),
    sa.Column('label', sa.String(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('phone', sa.String(), nullable=False),
    sa.Column('line1', sa.String(), nullable=False),
    sa.Column('line2', sa.String(), nullable=True),
    sa.Column('landmark', sa.String(), nullable=True),
    sa.Column('city', sa.String(), nullable=False),
    sa.Column('pincode', sa.String(), nullable=False),
    sa.Column('isDefault', sa.Boolean(), nullable=True),
    sa.Column('createdAt', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['userId'], ['User.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_Address_userId', 'Address', ['userId'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_Address_userId', table_name='Address')
    op.drop_table('Address')
    op.drop_index('ix_OrderTrackingEvent_orderId', table_name='OrderTrackingEvent')
    op.drop_table('OrderTrackingEvent')
    op.execute('DROP INDEX IF EXISTS "ix_Order_checkoutGroupId"')
    op.execute('DROP INDEX IF EXISTS "ix_Order_trackingNumber"')
    for name, _ in reversed(ORDER_COLUMNS):
        op.execute(f'ALTER TABLE "Order" DROP COLUMN IF EXISTS "{name}"')
