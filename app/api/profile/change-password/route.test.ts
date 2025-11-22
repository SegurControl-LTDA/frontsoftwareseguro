import { PUT } from './route';
import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const mockRequest = (userId: string | null, body: any) => {
  const headers = new Headers();
  if (userId) {
    headers.set('x-user-id', userId);
  }
  return new NextRequest('http://localhost/api/profile/change-password', {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
};

describe('API - PUT /api/profile/change-password', () => {
  const mockUser = { 
    id: '1', 
    password: 'oldHashedPassword',
    tokenVersion: 0 
  };

  it('should return 401 if user is not authenticated', async () => {
    const req = mockRequest(null, { currentPassword: 'a', newPassword: 'b' });
    const response = await PUT(req);
    expect(response.status).toBe(401);
  });

  it('should return 403 if current password is incorrect', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

    const req = mockRequest(mockUser.id, { currentPassword: 'wrong', newPassword: 'NewPassword123!' });
    const response = await PUT(req);
    expect(response.status).toBe(403);
  });

  it('should return 400 if new password is weak', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

    const req = mockRequest(mockUser.id, { currentPassword: 'oldHashedPassword', newPassword: 'weak' });
    const response = await PUT(req);
    expect(response.status).toBe(400);
  });

  it('should update password and increment tokenVersion on success', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('newHashedPassword' as never);

    const req = mockRequest(mockUser.id, { currentPassword: 'oldHashedPassword', newPassword: 'NewPassword123!' });
    const response = await PUT(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: mockUser.id },
      data: {
        password: 'newHashedPassword',
        tokenVersion: { increment: 1 },
      },
    });
    expect(body.message).toContain('Contraseña actualizada con éxito');
  });
});
