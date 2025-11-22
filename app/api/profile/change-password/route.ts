import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Password policy from registration
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export async function PUT(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    // 1. Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'La contraseña actual es incorrecta.' }, { status: 403 });
    }

    // 2. Validate new password policy
    if (!passwordRegex.test(newPassword)) {
      return NextResponse.json({ error: 'La nueva contraseña no cumple con los requisitos de seguridad.' }, { status: 400 });
    }

    // 3. Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // 4. Update password and invalidate old sessions by incrementing tokenVersion
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
        tokenVersion: { increment: 1 },
      },
    });

    // 5. Simulate email notification
    console.log(`Password changed notification sent to ${user.email}`);

    // Clear the auth cookie to force re-login on the current device
    const response = NextResponse.json({ message: 'Contraseña actualizada con éxito. Por favor, inicia sesión de nuevo.' });
    response.cookies.delete('auth_token');

    return response;

  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
