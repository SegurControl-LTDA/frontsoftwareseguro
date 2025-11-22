import { GET } from './route';
import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';

const prisma = new PrismaClient();

const mockRequest = (userId: string | null) => {
  const headers = new Headers();
  if (userId) {
    headers.set('x-user-id', userId);
  }
  return new NextRequest('http://localhost/api/profile', { headers });
};

describe('API - GET /api/profile', () => {
  it('should return 401 if user is not authenticated', async () => {
    const req = mockRequest(null);
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('No autorizado.');
  });

  it('should return 404 if user is not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const req = mockRequest('non-existent-user-id');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Usuario no encontrado.');
  });

  it('should return user profile on success', async () => {
    const mockUser = { id: '1', name: 'Test User', email: 'test@example.com' };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const req = mockRequest(mockUser.id);
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.name).toBe(mockUser.name);
    expect(body.email).toBe(mockUser.email);
  });
});
