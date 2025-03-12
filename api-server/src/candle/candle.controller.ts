import { Controller, Get, Query, Put, Body, HttpCode } from '@nestjs/common';
import { CandleService } from './candle.service';

interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
}

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
    @Query('timezone') timezone?: string,
  ): Promise<CandleData> {
    console.log('=== Candle API Request ===');
    console.log(`Received parameters: code=${code}, year=${year}, month=${month}, day=${day}, hour=${hour}, timezone=${timezone || 'not specified'}`);
    console.log(`Parameter types: year=${typeof year}, month=${typeof month}, day=${typeof day}, hour=${typeof hour}`);
    
    // 数値型に変換（クエリパラメータは文字列として受け取られる可能性があるため）
    const numYear = Number(year);
    const numMonth = Number(month);
    const numDay = Number(day);
    const numHour = Number(hour);
    
    console.log(`Converted parameters: year=${numYear}, month=${numMonth}, day=${numDay}, hour=${numHour}`);
    
    // タイムゾーンの処理
    const isJST = timezone === 'JST' || timezone === 'Asia/Tokyo';
    console.log(`Using timezone: ${isJST ? 'JST (UTC+9)' : 'UTC'}`);
    
    const result = await this.candleService.calculateCandle(code, numYear, numMonth, numDay, numHour, isJST);
    console.log('API response:', result);
    return result;
  }

  @Put('flag')
  @HttpCode(200)
  async getFlag(@Body() body: { flag: string }) {
    // flagの値を記録するなど必要に応じて処理を追加
    console.log('Received flag:', body.flag);
    return { success: true };
  }
}