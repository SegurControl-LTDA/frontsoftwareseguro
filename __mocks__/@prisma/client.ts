import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

export const prismaMock = mockDeep<PrismaClient>() as DeepMockProxy<PrismaClient>;

export const PrismaClientMock = jest.fn(() => prismaMock);

jest.mock('@prisma/client', () => ({
  ...jest.requireActual('@prisma/client'),
  PrismaClient: PrismaClientMock,
}));
