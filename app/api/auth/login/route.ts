import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// IMPORTANT: Store this in an environment variable (.env) in a real application
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-that-is-long-and-random';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME_MINUTES = 15;

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña son obligatorios.' }, { status: 400 });
    }

    // 1. Find user by email
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ error: 'Credenciales inválidas.' }, { status: 401 });
    }

    // 2. Check if account is locked
    if (user.lockoutUntil && new Date() < new Date(user.lockoutUntil)) {
      const timeLeft = Math.ceil((new Date(user.lockoutUntil).getTime() - new Date().getTime()) / (1000 * 60));
      return NextResponse.json({ error: `Cuenta bloqueada. Inténtalo de nuevo en ${timeLeft} minutos.` }, { status: 403 });
    }

    // 3. Compare password with the stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Increment failed login attempts
      const newAttempts = user.failedLoginAttempts + 1;
      let updateData: any = { failedLoginAttempts: newAttempts };

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        // Lock the account
        const lockoutUntil = new Date(new Date().getTime() + LOCKOUT_TIME_MINUTES * 60 * 1000);
        updateData.lockoutUntil = lockoutUntil;
        updateData.failedLoginAttempts = 0; // Reset attempts after locking
      }

      await prisma.user.update({ where: { id: user.id }, data: updateData });

      return NextResponse.json({ error: 'Credenciales inválidas.' }, { status: 401 });
    }

    // 4. Reset failed attempts on successful login
    if (user.failedLoginAttempts > 0) {
      await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockoutUntil: null } });
    }

    // 5. Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '60m' } // Token expires in 60 minutes
    );

    // 6. Set JWT in an HttpOnly, Secure cookie
    const response = NextResponse.json({ message: 'Inicio de sesión exitoso.' });
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
