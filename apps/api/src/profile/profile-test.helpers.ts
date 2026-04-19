import { UserStatus } from '../generated/prisma/client';
import { CookieService } from '../auth/shared/cookie.service';

export const mockUserComplete = {
  id: 1,
  email: 'me@test.com',
  firstName: 'Me',
  lastName: 'MYSELF',
  age: 30,
  biography: 'Bio',
  profilePicture: null,
  password: 'hashed_password',
  emailVerifiedAt: new Date(),
  status: UserStatus.ACTIVE,
  emailNotifications: false,
  pushToken: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  address: {
    id: 10,
    street: 'Rue Test',
    postalCode: '75000',
    city: 'Paris',
    latitude: 48.85,
    longitude: 2.35,
  },
  associations: [
    {
      associationId: 5,
      role: 'ADMIN',
      association: { id: 5, name: 'Asso Test' },
    },
  ],
  skills: [{ skill: { id: 1, label: 'Informatique' } }],
  causes: [{ cause: { id: 1, label: 'Écologie' } }],
  availability: {
    frequency: 'HOURS_WEEK',
    timeSlot: 'WEEKDAY',
    type: 'HYBRID',
  },
  participations: [],
};

export const mockMappedUser = {
  id: 1,
  email: 'me@test.com',
  skills: [{ id: 1, label: 'Informatique' }],
  causes: [{ id: 1, label: 'Écologie' }],
  availability: {
    frequency: 'HOURS_WEEK',
    timeSlot: 'WEEKDAY',
    type: 'HYBRID',
  },
  participations: [],
  createdAt: new Date().toISOString(),
};

export const createMockAuthService = () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    userSkill: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    userCause: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    userAvailability: {
      upsert: jest.fn(),
    },
  },
  logger: { error: jest.fn(), warn: jest.fn() },
  mapUserToResponse: jest.fn().mockReturnValue(mockMappedUser),
});

export const createMockFileService = () => ({
  uploadFile: jest.fn().mockResolvedValue({ publicId: 'avatars/test.jpg' }),
  deleteFile: jest.fn().mockResolvedValue(undefined),
});

// Mock CookieService centralisé — partagé par tous les specs du ProfileService
export const createMockCookieService = (): Partial<CookieService> => ({
  clearAuthCookies: jest.fn(),
  setAuthCookies: jest.fn(),
});
