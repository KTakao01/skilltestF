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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';
    
    console.log('Initializing Supabase client with:');
    console.log(`URL: ${supabaseUrl ? 'Set (hidden for security)' : 'Not set'}`);
    console.log(`Key: ${supabaseKey ? 'Set (hidden for security)' : 'Not set'}`);
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async onModuleInit() {
    // Supabaseからデータを読み込む
    console.log('Initializing CandleService and loading data from Supabase...');
    await this.loadDataFromSupabase();
  }

  private async loadDataFromSupabase() {
    try {
      console.log('Attempting to load data from Supabase order_books table...');
      const { data, error } = await this.supabase
        .from('order_books') // テーブル名を指定
        .select('*');

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // データを変換して保存
      this.tickData = data.map(row => ({
        id: row.id,
        time: new Date(row.time),
        code: row.code,
        price: row.price
      }));

      console.log(`Successfully loaded ${this.tickData.length} tick data records from Supabase`);
      if (this.tickData.length > 0) {
        console.log('Sample data:', {
          first: this.tickData[0],
          last: this.tickData[this.tickData.length - 1]
        });
      }
    } catch (error) {
      console.error('Error loading data from Supabase:', error);
    }
  }

  // 日本時間（JST）からUTCに変換する関数
  private convertJSTtoUTC(year: number, month: number, day: number, hour: number): Date {
    // 日本時間で日時を作成
    const jstDate = new Date(year, month - 1, day, hour, 0, 0);
    // UTCに変換（JSTはUTC+9なので9時間引く）
    return new Date(jstDate.getTime() - 9 * 60 * 60 * 1000);
  }

  // UTCから日本時間（JST）に変換する関数
  private convertUTCtoJST(utcDate: Date): Date {
    // UTCからJSTに変換（JSTはUTC+9なので9時間足す）
    return new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
  }

  async calculateCandle(code: string, year: number, month: number, day: number, hour: number): Promise<CandleData> {
    console.log(`Received request for candle data - code: ${code}, date: ${year}-${month}-${day}, hour: ${hour}`);
    
    // 入力パラメータをUTCに変換（APIリクエストがUTCで来る場合はこの変換は不要）
    // 以下のコメントアウトされたコードは、入力がJSTの場合に使用
    // const utcStartTime = this.convertJSTtoUTC(year, month, day, hour);
    // const utcEndTime = this.convertJSTtoUTC(year, month, day, hour + 1);
    
    // 入力がUTCの場合はそのまま使用
    const startTime = new Date(year, month - 1, day, hour, 0, 0);
    const endTime = new Date(year, month - 1, day, hour + 1, 0, 0);
    
    const startTimeISO = startTime.toISOString();
    const endTimeISO = endTime.toISOString();
    
    console.log(`Query time range (UTC): ${startTimeISO} to ${endTimeISO}`);
    console.log(`Query time range (JST): ${this.convertUTCtoJST(startTime).toISOString()} to ${this.convertUTCtoJST(endTime).toISOString()}`);
  
    try {
      console.log(`Querying Supabase for code: ${code}, time range: ${startTimeISO} to ${endTimeISO}`);
      
      // Supabaseにクエリを投げて直接フィルタリングしたデータを取得
      const { data, error } = await this.supabase
        .from('order_books')
        .select('time, price')
        .eq('code', code)
        .gte('time', startTimeISO)
        .lt('time', endTimeISO)
        .order('time');
  
      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }
  
      console.log(`Query returned ${data?.length || 0} records`);
      
      if (!data || data.length === 0) {
        console.log('No data found for the specified parameters');
        return { open: 0, high: 0, low: 0, close: 0 };
      }
  
      // データのサンプルをログに出力
      console.log('First record:', data[0]);
      console.log('Last record:', data[data.length - 1]);
      
      const prices = data.map(row => row.price);
      
      const result = {
        open: prices[0],
        close: prices[prices.length - 1],
        high: Math.max(...prices),
        low: Math.min(...prices)
      };
      
      console.log('Calculated candle data:', result);
      
      return result;
    } catch (error) {
      console.error('Error fetching data:', error);
      return { open: 0, high: 0, low: 0, close: 0 };
    }
  }
}