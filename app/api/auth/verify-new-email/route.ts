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
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token, type: TokenType.EMAIL_CHANGE },
    });

    if (!verificationToken || new Date() > new Date(verificationToken.expires) || !verificationToken.newEmail) {
      return NextResponse.json({ error: 'Token inválido, expirado o malformado.' }, { status: 400 });
    }

    // Check if the new email is already in use by another user
    const existingUser = await prisma.user.findUnique({ where: { email: verificationToken.newEmail } });
    if (existingUser) {
      return NextResponse.json({ error: 'El correo electrónico ya está en uso.' }, { status: 409 });
    }

    // Update the user's email
    await prisma.user.update({
      where: { id: verificationToken.userId },
      data: { 
        email: verificationToken.newEmail,
        emailVerified: new Date(),
      },
    });

    // Delete the token after use
    await prisma.verificationToken.delete({ where: { id: verificationToken.id } });

    // Redirect to a success page or login
    const url = new URL('/', req.url);
    url.searchParams.set('email_updated', 'true');
    return NextResponse.redirect(url);

  } catch (error) {
    console.error('Email change verification error:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
