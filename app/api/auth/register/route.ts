import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";

export async function POST(req: NextRequest) {
    try {
        const { name, phone, email, password, role } = await req.json();

        if (!name || !phone || !password || !role) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const existingUser = await prisma.user.findUnique({ where: { phone } });
        if (existingUser) {
            return NextResponse.json(
                { error: "Phone number already registered" },
                { status: 409 }
            );
        }

        const passwordHash = await hashPassword(password);

        const user = await prisma.user.create({
            data: { name, phone, email, passwordHash, role },
        });

        const token = signToken({ userId: user.id, role: user.role });

        return NextResponse.json({ token, user: { id: user.id, name: user.name, role: user.role } });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Registration failed" }, { status: 500 });
    }
}