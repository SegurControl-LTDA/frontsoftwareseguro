import { GET } from './route';
import { PrismaClient, TokenType } from '@prisma/client';
import { NextRequest } from 'next/server';

const prisma = new PrismaClient();

const mockRequest = (token: string | null) => {
  const url = `http://localhost/api/auth/verify-new-email?token=${token || ''}`;
  return new NextRequest(url);
};

describe('API - GET /api/auth/verify-new-email', () => {

  it('should return 400 if token is invalid or expired', async () => {
    (prisma.verificationToken.findUnique as jest.Mock).mockResolvedValue(null);
    const req = mockRequest('invalid-token');
    const response = await GET(req);
    expect(response.status).toBe(400);
  });

  it('should return 409 if new email is already in use', async () => {
    const token = {
      userId: 'user-1',
      newEmail: 'taken@example.com',
      expires: new Date(Date.now() + 3600 * 1000),
      type: TokenType.EMAIL_CHANGE
    };
    (prisma.verificationToken.findUnique as jest.Mock).mockResolvedValue(token);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-2' }); // Another user has the email

    const req = mockRequest('valid-token');
    const response = await GET(req);
    expect(response.status).toBe(409);
  });

  it('should update the user email and redirect on success', async () => {
    const token = {
      id: 'token-1',
      userId: 'user-1',
      newEmail: 'new-email@example.com',
      expires: new Date(Date.now() + 3600 * 1000),
      type: TokenType.EMAIL_CHANGE
    };
    (prisma.verificationToken.findUnique as jest.Mock).mockResolvedValue(token);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null); // New email is not in use

    const req = mockRequest('valid-token');
    const response = await GET(req);

    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toContain('/?email_updated=true');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: token.userId },
      data: { 
        email: token.newEmail,
        emailVerified: expect.any(Date),
      },
    });
    expect(prisma.verificationToken.delete).toHaveBeenCalledWith({ where: { id: token.id } });
  });
});
