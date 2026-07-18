import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/jwt";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const listing = await prisma.listing.findUnique({
            where: { id },
            include: { farmer: { select: { name: true, phone: true } } },
        });
        if (!listing) {
            return NextResponse.json({ error: "Listing not found" }, { status: 404 });
        }
        return NextResponse.json({ listing });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch listing" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.replace("Bearer ", "");
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = verifyToken(token);
        if (!payload) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        const listing = await prisma.listing.findUnique({ where: { id } });
        if (!listing || listing.farmerId !== payload.userId) {
            return NextResponse.json({ error: "Not authorized to delete this listing" }, { status: 403 });
        }

        await prisma.listing.update({
            where: { id },
            data: { status: "REMOVED" },
        });

        return NextResponse.json({ message: "Listing removed" });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to delete listing" }, { status: 500 });
    }
}