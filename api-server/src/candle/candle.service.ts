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
        let sampleRows: any[] = [];
        
        fs.createReadStream(csvFilePath)
          .pipe(csv.parse({ headers: true }))
          .on('error', error => {
            console.error('Error parsing CSV:', error);
            reject(error);
          })
          .on('data', row => {
            try {
              rowCount++;
              
              // サンプルデータを保存（最初の5行）
              if (rowCount <= 5) {
                sampleRows.push(row);
              }
              
              // 進捗ログ（1万行ごとに表示）
              if (rowCount % 10000 === 0) {
                console.log(`Processed ${rowCount} rows...`);
              }
              
              // 日時の解析
              const timeStr = row.time;
              let time: Date;
              
              try {
                // 標準的なフォーマットで解析（JSTとして扱う）
                time = new Date(timeStr);
                
                // 解析に失敗した場合
                if (isNaN(time.getTime())) {
                  throw new Error(`Invalid date: ${timeStr}`);
                }
              } catch (dateError) {
                console.error(`Error parsing date "${timeStr}":`, dateError);
                // エラーが発生した場合はスキップ
                return;
              }
              
              const code = row.code;
              const price = parseFloat(row.price);
              
              // デバッグ: 最初の数行のデータを詳細に表示
              if (rowCount <= 5) {
                console.log(`Row ${rowCount}: original time="${timeStr}", parsed time=${time.toISOString()}, code=${code}, price=${price}`);
              }
              
              // 統計情報の更新
              this.stats.uniqueCodes.add(code);
              if (time < this.stats.minTime) this.stats.minTime = time;
              if (time > this.stats.maxTime) this.stats.maxTime = time;
              
              // 時間の切り捨て（時間単位でグループ化）- JSTの時間をそのまま使用
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
            console.log(`Unique codes: ${Array.from(this.stats.uniqueCodes).join(', ')}`);
            console.log(`Time range: ${this.stats.minTime.toISOString()} to ${this.stats.maxTime.toISOString()}`);
            
            // サンプルデータの表示
            console.log('Sample rows from CSV:');
            sampleRows.forEach((row, index) => {
              console.log(`Sample ${index + 1}:`, row);
            });
            
            // 各コードの時間キー数を表示
            for (const code of this.stats.uniqueCodes) {
              const timeKeys = Object.keys(this.dataIndex[code] || {});
              console.log(`Code ${code} has ${timeKeys.length} time keys. Sample keys: ${timeKeys.slice(0, 3).join(', ')}`);
            }
            
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

  // 時間をキーに変換する関数（YYYY-MM-DDTHHの形式、JSTの時間をそのまま使用）
  private getTimeKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}`;
  }

  async calculateCandle(code: string, year: number, month: number, day: number, hour: number): Promise<CandleData> {
    console.log(`Received request for candle data - code: ${code}, date: ${year}-${month}-${day}, hour: ${hour} (JST)`);
    
    // JST時間範囲を指定（JSTのままDateオブジェクトを作成）
    const startTime = new Date(year, month - 1, day, hour, 0, 0);
    const endTime = new Date(year, month - 1, day, hour + 1, 0, 0);
    
    const startTimeISO = startTime.toISOString();
    const endTimeISO = endTime.toISOString();
    
    console.log(`Query time range (JST): ${startTime.toString()} to ${endTime.toString()}`);
    console.log(`ISO representation: ${startTimeISO} to ${endTimeISO}`);
  
    // ローソク足を計算
    return this.calculateCandleFromIndex(code, startTime, endTime);
  }
  
  // インデックスからローソク足データを計算
  private calculateCandleFromIndex(code: string, startTime: Date, endTime: Date): CandleData {
    console.log(`Calculating candle from indexed data for code: ${code}, time range: ${startTime.toString()} to ${endTime.toString()}`);
    
    // コードが存在しない場合
    if (!this.dataIndex[code]) {
      console.log(`No data found for code: ${code}`);
      return { open: 0, high: 0, low: 0, close: 0 };
    }
    
    // 時間キーを取得
    const timeKey = this.getTimeKey(startTime);
    console.log(`Looking for timeKey: ${timeKey}`);
    
    // 指定された時間のデータが存在しない場合（完全一致のみ）
    if (!this.dataIndex[code][timeKey]) {
      console.log(`No data found for code: ${code} at time: ${timeKey}`);
      return { open: 0, high: 0, low: 0, close: 0 };
    }
    
    const hourData = this.dataIndex[code][timeKey];
    console.log(`Found ${hourData.times.length} records for this hour`);
    
    // 時間範囲内のデータをフィルタリング
    const filteredPrices: number[] = [];
    const filteredTimes: Date[] = [];
    
    // デバッグ: 最初と最後の時間を表示
    if (hourData.times.length > 0) {
      console.log(`First time in hour data: ${hourData.times[0].toString()}`);
      console.log(`Last time in hour data: ${hourData.times[hourData.times.length - 1].toString()}`);
    }
    
    for (let i = 0; i < hourData.times.length; i++) {
      const time = hourData.times[i];
      if (time >= startTime && time < endTime) {
        filteredPrices.push(hourData.prices[i]);
        filteredTimes.push(time);
      }
    }
    
    console.log(`Filtered ${filteredPrices.length} records from indexed data`);
    
    // 指定された時間範囲内にデータがない場合は0を返す（完全一致のみ）
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