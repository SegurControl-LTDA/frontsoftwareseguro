import { PUT } from './route';
import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';

const prisma = new PrismaClient();

const mockRequest = (userId: string | null, body: any) => {
  const headers = new Headers();
  if (userId) {
    headers.set('x-user-id', userId);
  }
  return new NextRequest('http://localhost/api/profile/update', {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
};

describe('API - PUT /api/profile/update', () => {
  const mockUser = { id: '1', name: 'Old Name', email: 'old@example.com' };

  it('should return 401 if user is not authenticated', async () => {
    const req = mockRequest(null, { name: 'New Name' });
    const response = await PUT(req);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('No autorizado.');
  });

  it('should update user name successfully', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    const req = mockRequest(mockUser.id, { name: 'New Name' });
    await PUT(req);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: mockUser.id },
      data: { name: 'New Name' },
    });
  });

  it('should trigger email verification if email is changed', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser).mockResolvedValueOnce(null);

    const req = mockRequest(mockUser.id, { name: mockUser.name, email: 'new@example.com' });
    const response = await PUT(req);
    const body = await response.json();

    expect(prisma.verificationToken.create).toHaveBeenCalled();
    expect(body.message).toContain('Se ha enviado un correo de verificación');
  });

  it('should return 409 if new email is already in use', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser).mockResolvedValueOnce({ id: '2' });

    const req = mockRequest(mockUser.id, { name: mockUser.name, email: 'taken@example.com' });
    const response = await PUT(req);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe('El nuevo correo electrónico ya está en uso.');
  });
});
