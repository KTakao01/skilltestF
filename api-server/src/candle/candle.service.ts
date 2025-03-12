import { Injectable, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface TickData {
  id: number;
  time: Date;
  code: string;
  price: number;
}

interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
}

@Injectable()
export class CandleService implements OnModuleInit {
  private supabase: SupabaseClient;
  private tickData: TickData[] = [];

  constructor() {
    // Supabaseクライアントの初期化
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_KEY || ''
    );
  }

  async onModuleInit() {
    // Supabaseからデータを読み込む
    await this.loadDataFromSupabase();
  }

  private async loadDataFromSupabase() {
    try {
      const { data, error } = await this.supabase
        .from('order_books') // テーブル名を指定
        .select('*');

      if (error) {
        throw error;
      }

      // データを変換して保存
      this.tickData = data.map(row => ({
        id: row.id,
        time: new Date(row.time),
        code: row.code,
        price: row.price
      }));

      console.log(`Loaded ${this.tickData.length} tick data records from Supabase`);
    } catch (error) {
      console.error('Error loading data from Supabase:', error);
    }
  }

  async calculateCandle(code: string, year: number, month: number, day: number, hour: number): Promise<CandleData> {
    const startTime = new Date(year, month - 1, day, hour, 0, 0).toISOString();
    const endTime = new Date(year, month - 1, day, hour + 1, 0, 0).toISOString();
  
    try {
      // Supabaseにクエリを投げて直接フィルタリングしたデータを取得
      const { data, error } = await this.supabase
        .from('order_books')
        .select('time, price')
        .eq('code', code)
        .gte('time', startTime)
        .lt('time', endTime)
        .order('time');
  
      if (error) {
        throw error;
      }
  
      if (!data || data.length === 0) {
        return { open: 0, high: 0, low: 0, close: 0 };
      }
  
      const prices = data.map(row => row.price);
      
      return {
        open: prices[0],
        close: prices[prices.length - 1],
        high: Math.max(...prices),
        low: Math.min(...prices)
      };
    } catch (error) {
      console.error('Error fetching data:', error);
      return { open: 0, high: 0, low: 0, close: 0 };
    }
  }
}