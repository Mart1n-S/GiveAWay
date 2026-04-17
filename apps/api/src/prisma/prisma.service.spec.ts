import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { ConfigService } from '@nestjs/config';

jest.mock('../generated/prisma/client', () => {
  return {
    PrismaClient: class {
      $connect = jest.fn();
      $disconnect = jest.fn();
    },
  };
});

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('postgresql://...'),
          },
        },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('✅ should be defined', () => {
    expect(service).toBeDefined();
  });

  it('✅ should call $connect on init', async () => {
    const spy = jest.spyOn(service, '$connect').mockResolvedValue(undefined);
    await service.onModuleInit();
    expect(spy).toHaveBeenCalled();
  });

  it('✅ should call $disconnect on destroy', async () => {
    const spy = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);
    await service.onModuleDestroy();
    expect(spy).toHaveBeenCalled();
  });
});
