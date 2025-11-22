import { GET } from './route';
import { PrismaClient, TokenType } from '@prisma/client';
import { NextRequest } from 'next/server';

const prisma = new PrismaClient();

const mockRequest = (token: string | null) => {
  const url = `http://localhost/api/auth/verify?token=${token || ''}`;
  return new NextRequest(url);
};

describe('API - GET /api/auth/verify', () => {

  it('should return 400 if token is not provided', async () => {
    const req = mockRequest(null);
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toBe('Token no proporcionado.');
  });

  it('should return 400 for an invalid or expired token', async () => {
    (prisma.verificationToken.findUnique as jest.Mock).mockResolvedValue(null);
    const req = mockRequest('invalid-token');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toBe('Token inválido o expirado.');
  });

  it('should return 400 for a token of the wrong type', async () => {
    const wrongTypeToken = {
      id: '1', 
      userId: 'user-1',
      expires: new Date(Date.now() + 3600 * 1000),
      type: TokenType.PASSWORD_RESET
    };
    (prisma.verificationToken.findUnique as jest.Mock).mockResolvedValue(wrongTypeToken);
    const req = mockRequest('password-reset-token');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(400);
  });

  it('should verify the user and redirect on success', async () => {
    const validToken = {
      id: '1',
      userId: 'user-1',
      expires: new Date(Date.now() + 3600 * 1000),
      type: TokenType.EMAIL_VERIFICATION
    };
    (prisma.verificationToken.findUnique as jest.Mock).mockResolvedValue(validToken);

    const req = mockRequest('valid-token');
    const response = await GET(req);

    // Expect a redirect
    expect(response.status).toBe(307); // Or 302, depending on Next.js version
    expect(response.headers.get('Location')).toContain('/?verified=true');

    // Expect user and token to be updated/deleted
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: validToken.userId },
      data: { emailVerified: expect.any(Date) },
    });
    expect(prisma.verificationToken.delete).toHaveBeenCalledWith({
      where: { id: validToken.id },
    });
  });
});
