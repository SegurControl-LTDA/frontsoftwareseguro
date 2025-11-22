import { POST } from './route';
import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// The PrismaClient is automatically mocked by jest.setup.ts
const prisma = new PrismaClient();

const mockRequest = (body: any) => {
  return {
    json: async () => body,
  } as NextRequest;
};

describe('API - Login Endpoint', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    password: 'hashedpassword',
    failedLoginAttempts: 0,
    lockoutUntil: null,
    tokenVersion: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 for non-existent user', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const req = mockRequest({ email: 'wrong@example.com', password: 'password' });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Credenciales inválidas.');
  });

  it('should return 401 for incorrect password and increment failed attempts', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

    const req = mockRequest({ email: mockUser.email, password: 'wrongpassword' });
    await POST(req);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: mockUser.id },
      data: { failedLoginAttempts: 1 },
    });
  });

  it('should lock the account after 5 failed attempts', async () => {
    const lockedUser = { ...mockUser, failedLoginAttempts: 4 };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(lockedUser);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

    const req = mockRequest({ email: mockUser.email, password: 'wrongpassword' });
    await POST(req);

    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ lockoutUntil: expect.any(Date) }),
    }));
  });

  it('should return 403 if account is locked', async () => {
    const lockedUser = { ...mockUser, lockoutUntil: new Date(Date.now() + 15 * 60 * 1000) };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(lockedUser);

    const req = mockRequest({ email: mockUser.email, password: 'password' });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain('Cuenta bloqueada.');
  });

  it('should return 200 and set a cookie on successful login', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
    jest.spyOn(jwt, 'sign').mockImplementation(() => 'mock-jwt-token');

    const req = mockRequest({ email: mockUser.email, password: 'correctpassword' });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe('Inicio de sesión exitoso.');
    expect(response.headers.get('set-cookie')).toContain('auth_token=mock-jwt-token');
  });
});
