import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/jwt";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.replace("Bearer ", "");
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = verifyToken(token);
        if (!payload || payload.role !== "CONSUMER") {
            return NextResponse.json({ error: "Only consumers can place orders" }, { status: 403 });
        }

        const { listingId, quantity } = await req.json();

        if (!listingId || !quantity || quantity <= 0) {
            return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
        }

        const order = await prisma.$transaction(async (tx) => {
            const listing = await tx.listing.findUnique({ where: { id: listingId } });

            if (!listing) {
                throw new Error("LISTING_NOT_FOUND");
            }
            if (listing.status !== "AVAILABLE") {
                throw new Error("LISTING_UNAVAILABLE");
            }
            if (listing.quantity < quantity) {
                throw new Error("INSUFFICIENT_QUANTITY");
            }

            const remainingQuantity = listing.quantity - quantity;

            await tx.listing.update({
                where: { id: listingId },
                data: {
                    quantity: remainingQuantity,
                    status: remainingQuantity === 0 ? "SOLD_OUT" : "AVAILABLE",
                },
            });

            const newOrder = await tx.order.create({
                data: {
                    consumerId: payload.userId,
                    listingId,
                    quantity,
                    totalPrice: listing.price * quantity,
                },
            });

            return newOrder;
        });

        return NextResponse.json({ order });
    } catch (error: any) {
        console.error(error);

        if (error.message === "LISTING_NOT_FOUND") {
            return NextResponse.json({ error: "Listing not found" }, { status: 404 });
        }
        if (error.message === "LISTING_UNAVAILABLE") {
            return NextResponse.json({ error: "Listing is no longer available" }, { status: 409 });
        }
        if (error.message === "INSUFFICIENT_QUANTITY") {
            return NextResponse.json({ error: "Not enough quantity available" }, { status: 409 });
        }

        return NextResponse.json({ error: "Failed to place order" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.replace("Bearer ", "");
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = verifyToken(token);
        if (!payload) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        const orders = await prisma.order.findMany({
            where: { consumerId: payload.userId },
            include: {
                listing: {
                    select: { cropName: true, unit: true, farmer: { select: { name: true, phone: true } } },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ orders });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }
}