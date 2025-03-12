import { Controller, Get, Query, Put, Body, HttpCode } from '@nestjs/common';
import { CandleService } from './candle.service';

@Controller()
export class CandleController {
  constructor(private readonly candleService: CandleService) {}

  @Get('candle')
  async getCandle(
    @Query('code') code: string,
    @Query('year') year: number,
    @Query('month') month: number,
    @Query('day') day: number,
    @Query('hour') hour: number,
  ) {
    return this.candleService.calculateCandle(code, year, month, day, hour);
  }

  @Put('flag')
  @HttpCode(200)
  async getFlag(@Body() body: { flag: string }) {
    // flagの値を記録するなど必要に応じて処理を追加
    console.log('Received flag:', body.flag);
    return { success: true };
  }
}