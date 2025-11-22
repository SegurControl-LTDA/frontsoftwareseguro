import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { PrismaClient, TokenType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export async function PUT(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    const { name, email } = await req.json();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    // Update name
    await prisma.user.update({
      where: { id: userId },
      data: { name },
    });

    // Handle email change
    if (email && email !== user.email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return NextResponse.json({ error: 'El nuevo correo electrónico ya está en uso.' }, { status: 409 });
      }

      // Generate a new verification token for the new email
      const token = uuidv4();
      const expires = new Date(new Date().getTime() + 3600 * 1000); // 1 hour

      await prisma.verificationToken.create({
        data: {
          token,
          expires,
          type: TokenType.EMAIL_CHANGE,
          userId: user.id,
          newEmail: email,
        },
      });

      // Simulate sending email
      const verificationLink = `http://localhost:3000/api/auth/verify-new-email?token=${token}`;
      console.log(`Verification link for new email ${email}: ${verificationLink}`);

      return NextResponse.json({ message: 'Perfil actualizado. Se ha enviado un correo de verificación a la nueva dirección.' });
    }

    return NextResponse.json({ message: 'Perfil actualizado con éxito.' });

  } catch (error) {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
