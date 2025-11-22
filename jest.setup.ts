import '@testing-library/jest-dom';
import { mockReset } from 'jest-mock-extended';
import { prismaMock } from './__mocks__/@prisma/client';

beforeEach(() => {
  mockReset(prismaMock);
});
