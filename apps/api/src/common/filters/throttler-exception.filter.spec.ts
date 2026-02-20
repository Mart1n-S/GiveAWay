import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { ThrottlerExceptionFilter } from './throttler-exception.filter';

describe('ThrottlerExceptionFilter', () => {
  let filter: ThrottlerExceptionFilter;

  // On crée des mocks pour les objets complexes de NestJS
  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  const mockArgumentsHost = {
    switchToHttp: jest.fn().mockReturnThis(),
    getResponse: jest.fn().mockReturnValue(mockResponse),
  } as unknown as ArgumentsHost;

  beforeEach(() => {
    filter = new ThrottlerExceptionFilter();
    jest.clearAllMocks();
  });

  it('✅ devrait intercepter ThrottlerException et renvoyer une 429 personnalisée', () => {
    const exception = new ThrottlerException();

    filter.catch(exception, mockArgumentsHost);

    // Vérification du code HTTP 429
    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.TOO_MANY_REQUESTS,
    );

    // Vérification du corps de la réponse JSON
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      message:
        'Oups ! Vous allez trop vite. Veuillez réessayer dans quelques instants.',
      error: 'Too Many Requests',
    });
  });
});
