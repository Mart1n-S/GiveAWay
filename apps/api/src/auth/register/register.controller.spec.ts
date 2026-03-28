import { Test, TestingModule } from '@nestjs/testing';
import { GuestGuard } from '../guards/guest.guard';
import { RegisterController } from './register.controller';
import { RegisterService } from './register.service';

const mockRegisterService = { register: jest.fn() };

describe('RegisterController', () => {
  let controller: RegisterController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegisterController],
      providers: [{ provide: RegisterService, useValue: mockRegisterService }],
    })
      .overrideGuard(GuestGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RegisterController>(RegisterController);
    jest.clearAllMocks();
  });

  it('✅ Devrait déléguer au RegisterService avec dto et fichier', async () => {
    const dto = { email: 'a@a.com', password: 'pass' } as any;
    const file = { originalname: 'avatar.png' } as Express.Multer.File;
    mockRegisterService.register.mockResolvedValue({ message: 'ok' });

    const result = await controller.register(dto, file);

    expect(mockRegisterService.register).toHaveBeenCalledWith(dto, file);
    expect(result).toEqual({ message: 'ok' });
  });

  it('✅ Devrait fonctionner sans fichier', async () => {
    mockRegisterService.register.mockResolvedValue({ message: 'ok' });

    await controller.register({} as any, undefined);

    expect(mockRegisterService.register).toHaveBeenCalledWith({}, undefined);
  });

  it("✅ Devrait uploader un fichier et enregistrer l'utilisateur", async () => {
    const file = { originalname: 'test.jpg' } as Express.Multer.File;
    mockRegisterService.register.mockResolvedValue({ message: 'Success' });

    await controller.register({ email: 'test@test.com' } as any, file);

    expect(mockRegisterService.register).toHaveBeenCalledWith(
      { email: 'test@test.com' },
      file,
    );
  });

  it("❌ Devrait propager l'erreur si le service échoue", async () => {
    mockRegisterService.register.mockRejectedValue(new Error('DB Error'));

    await expect(
      controller.register({ email: 'test@test.com' } as any, undefined),
    ).rejects.toThrow('DB Error');
  });
});
