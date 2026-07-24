import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';

@Module({
  imports:[DatabaseModule,ConfigModule],
  controllers:[StorefrontController],
  providers:[StorefrontService],
})
export class StorefrontModule {}
