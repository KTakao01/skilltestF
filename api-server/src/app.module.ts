import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoginModule } from './login/login.module';
import { CandleModule } from './candle/candle.module';

@Module({
  imports: [LoginModule, CandleModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
