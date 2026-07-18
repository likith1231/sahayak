import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not set in environment variables");
}

export interface TokenPayload {
    userId: string;
    role: string;
}

export function signToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch {
        return null;
    }
}