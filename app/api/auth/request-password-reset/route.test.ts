import { POST } from './route';
import { PrismaClient, TokenType } from '@prisma/client';
import { NextRequest } from 'next/server';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const mockRequest = (body: any, ip: string = '127.0.0.1') => {
  const headers = new Headers({ 'x-forwarded-for': ip });
  return new NextRequest('http://localhost/api/auth/request-password-reset', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
};

describe('API - POST /api/auth/request-password-reset', () => {

  it('should always return a generic success message to prevent user enumeration', async () => {
    // Case 1: User does not exist
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    let req = mockRequest({ email: 'nonexistent@example.com' });
    let response = await POST(req);
    let body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toContain('Si tu cuenta existe');

    // Case 2: User exists
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: '1', email: 'exists@example.com' });
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-token' as never);
    req = mockRequest({ email: 'exists@example.com' });
    response = await POST(req);
    body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toContain('Si tu cuenta existe');
  });

  it('should create a hashed password reset token if user exists', async () => {
    const user = { id: '1', email: 'test@example.com' };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-token' as never);

    const req = mockRequest({ email: user.email });
    await POST(req);

    expect(prisma.verificationToken.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: user.id,
        type: TokenType.PASSWORD_RESET,
        token: 'hashed-token',
      }),
    }));
  });

  it('should apply rate limiting', async () => {
    const user = { id: '1', email: 'test@example.com' };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);

    const ip = '192.168.1.1';
    // Send 3 requests, they should pass
    for (let i = 0; i < 3; i++) {
      const req = mockRequest({ email: user.email }, ip);
      const response = await POST(req);
      expect(response.status).toBe(200);
    }

    // The 4th request should be rate limited
    const req = mockRequest({ email: user.email }, ip);
    const response = await POST(req);
    expect(response.status).toBe(429);
  });
});
