import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token no proporcionado.' }, { status: 400 });
  }

  try {
    // 1. Find the token in the database
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 400 });
    }

    // 2. Check if the token has expired
    const hasExpired = new Date() > new Date(verificationToken.expires);
    if (hasExpired) {
      return NextResponse.json({ error: 'El token ha expirado.' }, { status: 400 });
    }

    // 3. Find the user associated with the token's email
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    // 4. Update the user's email verification status
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    // 5. Delete the token to ensure it's single-use
    await prisma.verificationToken.delete({
      where: { id: verificationToken.id },
    });

    // Redirect user to a success page or login page
    // For now, we'll return a success message.
    return NextResponse.json({ message: '¡Correo verificado con éxito!' });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
