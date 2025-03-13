import { Test, TestingModule } from '@nestjs/testing';
import { LoginController } from './login.controller';
import { LoginService } from './login.service';

describe('LoginController', () => {
  let controller: LoginController;
  let loginService: LoginService;

  // LoginServiceのモック作成
  const mockLoginService = {
    generateToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoginController],
      providers: [
        {
          provide: LoginService,
          useValue: mockLoginService,
        },
      ],
    }).compile();

    controller = module.get<LoginController>(LoginController);
    loginService = module.get<LoginService>(LoginService);
    jest.clearAllMocks(); // 各テスト前にモックをリセット
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return an object with a token property', async () => {
      // モックの戻り値を設定
      const mockToken = 'generated-token';
      mockLoginService.generateToken.mockReturnValue(mockToken);

      const username = 'testuser';
      const password = 'testpass';
      
      const result = await controller.login({ username, password });
      
      expect(result).toEqual({ token: mockToken });
      expect(loginService.generateToken).toHaveBeenCalledWith(username, password);
    });
  });

  describe('getFlag', () => {
    it('should return success: true', async () => {
      // コンソールログをモックしてテストする
      console.log = jest.fn();
      
      const flag = 'test-flag';
      const result = await controller.getFlag({ flag });
      
      expect(result).toEqual({ success: true });
      expect(console.log).toHaveBeenCalledWith('Received flag:', flag);
    });
  });
});