import { POST } from './route';
import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';
import bcrypt from 'bcrypt';

// The PrismaClient is automatically mocked by jest.setup.ts
const prisma = new PrismaClient();

// Mock the NextRequest object
const mockRequest = (body: any) => {
  return {
    json: async () => body,
  } as NextRequest;
};

describe('API - Register Endpoint', () => {

  it('should return 400 if required fields are missing', async () => {
    const req = mockRequest({ name: 'Test' }); // Missing email and password
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Todos los campos son obligatorios.');
  });

  it('should return 400 if password does not meet policy', async () => {
    const req = mockRequest({ name: 'Test', email: 'test@example.com', password: 'weak' });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('La contraseña debe tener al menos 8 caracteres');
  });

  it('should return 409 if user already exists', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: '1', email: 'test@example.com' } as any);
    const req = mockRequest({ name: 'Test', email: 'test@example.com', password: 'Password123!' });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe('El correo electrónico ya está en uso.');
  });

  it('should create a new user and return 201 on successful registration', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({ id: '1', name: 'Test', email: 'test@example.com' } as any);
    (prisma.verificationToken.create as jest.Mock).mockResolvedValue({} as any);

    // Mock bcrypt hashing
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedpassword' as never);

    const req = mockRequest({ name: 'Test', email: 'test@example.com', password: 'Password123!' });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.message).toBe('Usuario registrado con éxito.');
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        name: 'Test',
        email: 'test@example.com',
        password: 'hashedpassword',
      },
    });
    expect(prisma.verificationToken.create).toHaveBeenCalled();
  });

});
