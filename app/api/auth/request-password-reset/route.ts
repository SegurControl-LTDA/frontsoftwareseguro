import { NextResponse } from 'next/server';
import { PrismaClient, TokenType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// In-memory store for rate limiting (in a real app, use Redis or a similar persistent store)
const rateLimitStore: Record<string, { count: number; expiry: number }> = {};
const RATE_LIMIT_COUNT = 3;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';

  // Rate limiting logic
  const now = Date.now();
  const record = rateLimitStore[ip];
  if (record && now < record.expiry) {
    if (record.count >= RATE_LIMIT_COUNT) {
      return NextResponse.json({ message: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.' }, { status: 429 });
    }
    rateLimitStore[ip].count++;
  } else {
    rateLimitStore[ip] = { count: 1, expiry: now + RATE_LIMIT_WINDOW_MS };
  }

  try {
    const { email } = await req.json();
    const genericResponse = NextResponse.json({ message: 'Si tu cuenta existe, recibirás un correo con instrucciones para restablecer tu contraseña.' });

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return a generic response to prevent user enumeration
    if (!user) {
      return genericResponse;
    }

    // Generate a secure token
    const token = uuidv4();
    const hashedToken = await bcrypt.hash(token, 10);
    const expires = new Date(new Date().getTime() + 15 * 60 * 1000); // 15 minutes

    await prisma.verificationToken.create({
      data: {
        token: hashedToken,
        expires,
        type: TokenType.PASSWORD_RESET,
        userId: user.id,
      },
    });

    // Simulate sending email with the *unhashed* token
    const resetLink = `http://localhost:3000/reset-password/${token}`;
    console.log(`Password reset link for ${email}: ${resetLink}`);

    return genericResponse;

  } catch (error) {
    console.error('Password reset request error:', error);
    // Still return a generic response in case of internal errors
    return NextResponse.json({ message: 'Si tu cuenta existe, recibirás un correo con instrucciones para restablecer tu contraseña.' });
  }
}
