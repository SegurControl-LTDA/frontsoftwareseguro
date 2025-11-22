import { POST } from './route';
import { PrismaClient, TokenType } from '@prisma/client';
import { NextRequest } from 'next/server';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const mockRequest = (body: any) => {
  return new NextRequest('http://localhost/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

describe('API - POST /api/auth/reset-password', () => {

  it('should return 400 for an invalid or expired token', async () => {
    (prisma.verificationToken.findMany as jest.Mock).mockResolvedValue([]);
    const req = mockRequest({ token: 'invalid-token', newPassword: 'NewPassword123!' });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('should return 400 if new password is weak', async () => {
    const validToken = {
      token: 'hashed-token',
      userId: 'user-1',
      user: { email: 'test@example.com' },
    };
    (prisma.verificationToken.findMany as jest.Mock).mockResolvedValue([validToken]);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

    const req = mockRequest({ token: 'unhashed-token', newPassword: 'weak' });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('should reset password and invalidate all tokens on success', async () => {
    const validToken = {
      token: 'hashed-token',
      userId: 'user-1',
      user: { email: 'test@example.com' },
    };
    (prisma.verificationToken.findMany as jest.Mock).mockResolvedValue([validToken]);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('new-hashed-password' as never);

    const req = mockRequest({ token: 'unhashed-token', newPassword: 'NewPassword123!' });
    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: validToken.userId },
      data: {
        password: 'new-hashed-password',
        tokenVersion: { increment: 1 },
      },
    });
    expect(prisma.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: validToken.userId,
        type: TokenType.PASSWORD_RESET,
      },
    });
  });
});
