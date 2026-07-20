import { Module } from '@nestjs/common';
import { PurchasingController } from './purchasing.controller';
import { PurchasingService } from './purchasing.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PurchasingController],
  providers: [PurchasingService],
})
export class PurchasingModule {}
