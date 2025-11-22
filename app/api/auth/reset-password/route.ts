import { NextResponse } from 'next/server';
import { PrismaClient, TokenType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Faltan datos requeridos.' }, { status: 400 });
    }

    // 1. Find all potential tokens for the user (this part is tricky without user context)
    // We must find the user associated with the token first.
    // Since the token is not stored in plain text, we can't look it up directly.
    // This requires a different strategy.

    // Let's find all non-expired password reset tokens.
    const potentialTokens = await prisma.verificationToken.findMany({
      where: {
        type: TokenType.PASSWORD_RESET,
        expires: { gt: new Date() },
      },
      include: { user: true },
    });

    let validToken = null;
    for (const t of potentialTokens) {
      const isMatch = await bcrypt.compare(token, t.token);
      if (isMatch) {
        validToken = t;
        break;
      }
    }

    if (!validToken) {
      return NextResponse.json({ error: 'Token inválido o expirado.' }, { status: 400 });
    }

    // 2. Validate new password policy
    if (!passwordRegex.test(newPassword)) {
      return NextResponse.json({ error: 'La nueva contraseña no cumple con los requisitos de seguridad.' }, { status: 400 });
    }

    // 3. Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // 4. Update password and invalidate all sessions
    await prisma.user.update({
      where: { id: validToken.userId },
      data: {
        password: hashedNewPassword,
        tokenVersion: { increment: 1 },
      },
    });

    // 5. Invalidate all password reset tokens for this user
    await prisma.verificationToken.deleteMany({
      where: {
        userId: validToken.userId,
        type: TokenType.PASSWORD_RESET,
      },
    });

    // 6. Simulate email notification
    console.log(`Password has been reset for ${validToken.user.email}`);

    return NextResponse.json({ message: 'Contraseña restablecida con éxito. Serás redirigido para iniciar sesión.' });

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
