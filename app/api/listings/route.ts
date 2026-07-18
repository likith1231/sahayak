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
        if (!payload || payload.role !== "FARMER") {
            return NextResponse.json({ error: "Only farmers can create listings" }, { status: 403 });
        }

        const { cropName, quantity, unit, price, harvestDate, photoUrl } = await req.json();

        if (!cropName || !quantity || !unit || !price || !harvestDate) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const listing = await prisma.listing.create({
            data: {
                farmerId: payload.userId,
                cropName,
                quantity,
                unit,
                price,
                harvestDate: new Date(harvestDate),
                photoUrl,
            },
        });

        return NextResponse.json({ listing });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to create listing" }, { status: 500 });
    }
}

export async function GET() {
    try {
        const listings = await prisma.listing.findMany({
            where: { status: "AVAILABLE" },
            include: { farmer: { select: { name: true, phone: true } } },
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json({ listings });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch listings" }, { status: 500 });
    }
}