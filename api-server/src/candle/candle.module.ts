import { Module } from '@nestjs/common';
import { CandleController } from './candle.controller';
import { CandleService } from './candle.service';

@Module({
  controllers: [CandleController],
  providers: [CandleService]
})
export class CandleModule {}
