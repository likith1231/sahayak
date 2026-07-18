import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";

export async function POST(req: NextRequest) {
    try {
        const { phone, password } = await req.json();

        if (!phone || !password) {
            return NextResponse.json(
                { error: "Phone and password required" },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({ where: { phone } });
        if (!user) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        const token = signToken({ userId: user.id, role: user.role });

        return NextResponse.json({ token, user: { id: user.id, name: user.name, role: user.role } });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Login failed" }, { status: 500 });
    }
}