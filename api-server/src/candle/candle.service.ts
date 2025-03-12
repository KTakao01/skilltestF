import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'fast-csv';

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

// コード別・時間別にインデックス化するためのインターフェース
interface DataIndex {
  [code: string]: {
    [timeKey: string]: {
      prices: number[];
      times: Date[];
    }
  }
}

@Injectable()
export class CandleService implements OnModuleInit {
  // 全データではなく、インデックス化されたデータを保持
  private dataIndex: DataIndex = {};
  // 統計情報を保持
  private stats = {
    totalRows: 0,
    uniqueCodes: new Set<string>(),
    minTime: new Date(),
    maxTime: new Date(0)
  };

  constructor() {
    console.log('Initializing CandleService - CSV only mode with optimized memory usage');
  }

  async onModuleInit() {
    console.log('Initializing CandleService and loading data from CSV...');
    await this.loadDataFromCSV();
  }
  
  // CSVファイルからデータを読み込み、インデックス化する
  private async loadDataFromCSV(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log('Loading and indexing data from CSV file...');
        
        // CSVファイルのパスを取得
        const csvFilePath = path.resolve(process.cwd(), 'order_books.csv');
        console.log(`CSV file path: ${csvFilePath}`);
        
        // ファイルの存在確認
        if (!fs.existsSync(csvFilePath)) {
          console.error(`CSV file not found at ${csvFilePath}`);
          resolve();
          return;
        }
        
        let rowCount = 0;
        
        fs.createReadStream(csvFilePath)
          .pipe(csv.parse({ headers: true }))
          .on('error', error => {
            console.error('Error parsing CSV:', error);
            reject(error);
          })
          .on('data', row => {
            try {
              rowCount++;
              
              // 進捗ログ（1万行ごとに表示）
              if (rowCount % 10000 === 0) {
                console.log(`Processed ${rowCount} rows...`);
              }
              
              const time = new Date(row.time);
              const code = row.code;
              const price = parseFloat(row.price);
              
              // 統計情報の更新
              this.stats.uniqueCodes.add(code);
              if (time < this.stats.minTime) this.stats.minTime = time;
              if (time > this.stats.maxTime) this.stats.maxTime = time;
              
              // 時間の切り捨て（時間単位でグループ化）
              const timeKey = this.getTimeKey(time);
              
              // インデックスの初期化
              if (!this.dataIndex[code]) {
                this.dataIndex[code] = {};
              }
              
              if (!this.dataIndex[code][timeKey]) {
                this.dataIndex[code][timeKey] = {
                  prices: [],
                  times: []
                };
              }
              
              // データの追加
              this.dataIndex[code][timeKey].prices.push(price);
              this.dataIndex[code][timeKey].times.push(time);
            } catch (e) {
              console.error('Error processing CSV row:', e, row);
            }
          })
          .on('end', () => {
            this.stats.totalRows = rowCount;
            console.log(`Successfully indexed ${rowCount} tick data records from CSV`);
            console.log(`Unique codes: ${this.stats.uniqueCodes.size}`);
            console.log(`Time range: ${this.stats.minTime.toISOString()} to ${this.stats.maxTime.toISOString()}`);
            
            // メモリ使用量の概算を表示
            const memoryUsage = process.memoryUsage();
            console.log(`Memory usage: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`);
            
            resolve();
          });
      } catch (error) {
        console.error('Error loading data from CSV:', error);
        resolve();
      }
    });
  }

  // 時間をキーに変換する関数（YYYY-MM-DDTHH形式）
  private getTimeKey(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}T${String(date.getUTCHours()).padStart(2, '0')}`;
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

  async calculateCandle(code: string, year: number, month: number, day: number, hour: number, isJST: boolean = false): Promise<CandleData> {
    console.log(`Received request for candle data - code: ${code}, date: ${year}-${month}-${day}, hour: ${hour}, isJST: ${isJST}`);
    
    let startTime: Date;
    let endTime: Date;
    
    if (isJST) {
      // 入力がJSTの場合、UTCに変換
      console.log('Converting JST input to UTC for query...');
      startTime = this.convertJSTtoUTC(year, month, day, hour);
      endTime = this.convertJSTtoUTC(year, month, day, hour + 1);
    } else {
      // 入力がUTCの場合はそのまま使用
      startTime = new Date(year, month - 1, day, hour, 0, 0);
      endTime = new Date(year, month - 1, day, hour + 1, 0, 0);
    }
    
    const startTimeISO = startTime.toISOString();
    const endTimeISO = endTime.toISOString();
    
    console.log(`Query time range (UTC): ${startTimeISO} to ${endTimeISO}`);
    console.log(`Query time range (JST): ${this.convertUTCtoJST(startTime).toISOString()} to ${this.convertUTCtoJST(endTime).toISOString()}`);
  
    // インデックスを使用してローソク足を計算
    return this.calculateCandleFromIndex(code, startTime, endTime);
  }
  
  // インデックスからローソク足データを計算
  private calculateCandleFromIndex(code: string, startTime: Date, endTime: Date): CandleData {
    console.log(`Calculating candle from indexed data for code: ${code}, time range: ${startTime.toISOString()} to ${endTime.toISOString()}`);
    
    // コードが存在しない場合
    if (!this.dataIndex[code]) {
      console.log(`No data found for code: ${code}`);
      return { open: 0, high: 0, low: 0, close: 0 };
    }
    
    // 時間キーを取得
    const timeKey = this.getTimeKey(startTime);
    
    // 指定された時間のデータが存在しない場合
    if (!this.dataIndex[code][timeKey]) {
      console.log(`No data found for code: ${code} at time: ${timeKey}`);
      return { open: 0, high: 0, low: 0, close: 0 };
    }
    
    const hourData = this.dataIndex[code][timeKey];
    
    // 時間範囲内のデータをフィルタリング
    const filteredPrices: number[] = [];
    const filteredTimes: Date[] = [];
    
    for (let i = 0; i < hourData.times.length; i++) {
      const time = hourData.times[i];
      if (time >= startTime && time < endTime) {
        filteredPrices.push(hourData.prices[i]);
        filteredTimes.push(time);
      }
    }
    
    console.log(`Filtered ${filteredPrices.length} records from indexed data`);
    
    if (filteredPrices.length === 0) {
      console.log('No matching data found in the specified time range');
      return { open: 0, high: 0, low: 0, close: 0 };
    }
    
    // ローソク足データの計算
    const result = {
      open: filteredPrices[0],
      close: filteredPrices[filteredPrices.length - 1],
      high: Math.max(...filteredPrices),
      low: Math.min(...filteredPrices)
    };
    
    console.log('Calculated candle data from indexed data:', result);
    
    return result;
  }
}