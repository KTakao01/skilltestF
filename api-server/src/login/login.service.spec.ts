import { Test, TestingModule } from '@nestjs/testing';
import { LoginService } from './login.service';
import * as crypto from 'crypto';

// モックするためにcrypto.createHashのスパイを作成
jest.mock('crypto', () => {
  const originalModule = jest.requireActual('crypto');
  return {
    ...originalModule,
    createHash: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('mockedHashValue'),
    }),
  };
});

describe('LoginService', () => {
  let service: LoginService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoginService],
    }).compile();

    service = module.get<LoginService>(LoginService);
    jest.clearAllMocks(); // 各テスト前にモックをリセット
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateToken', () => {
    it('should combine username and password and return SHA1 hash', () => {
      // 実際のcryptoモジュールを使用してテスト
      jest.restoreAllMocks();
      
      const username = 'admin';
      const password = 'thisispassword';
      const expectedHash = '8368890114e5e84ade36e721e8cf29b1207004d5'; // 実際のSHA1ハッシュ
      
      const result = service.generateToken(username, password);
      
      expect(result).toBe(expectedHash);
    });

    it('should call crypto.createHash with sha1 algorithm', () => {
      const username = 'testuser';
      const password = 'testpass';
      
      service.generateToken(username, password);
      
      expect(crypto.createHash).toHaveBeenCalledWith('sha1');
    });

    it('should pass the combined username and password to update method', () => {
      const username = 'user';
      const password = 'pass';
      const combined = username + password;
      
      const mockUpdate = crypto.createHash('sha1').update as jest.Mock;
      
      service.generateToken(username, password);
      
      expect(mockUpdate).toHaveBeenCalledWith(combined);
    });
  });
});