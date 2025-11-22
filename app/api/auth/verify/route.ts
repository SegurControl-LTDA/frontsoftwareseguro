import { NextResponse } from 'next/server';
import { PrismaClient, TokenType } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token no proporcionado.' }, { status: 400 });
  }

  try {
    const verificationToken = await prisma.verificationToken.findFirst({
      where: { token, type: TokenType.EMAIL_VERIFICATION },
    });

    if (!verificationToken || new Date() > new Date(verificationToken.expires)) {
      return NextResponse.json({ error: 'Token inválido o expirado.' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: new Date() },
    });

    await prisma.verificationToken.delete({ where: { id: verificationToken.id } });

    // You can redirect to a login page with a success message
    const url = new URL('/', req.url);
    url.searchParams.set('verified', 'true');
    return NextResponse.redirect(url);

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
