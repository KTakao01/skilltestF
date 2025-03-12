import { Test, TestingModule } from '@nestjs/testing';
import { CandleController } from './candle.controller';

describe('CandleController', () => {
  let controller: CandleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CandleController],
    }).compile();

    controller = module.get<CandleController>(CandleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
