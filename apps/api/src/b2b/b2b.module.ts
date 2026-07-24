import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { B2bController } from './b2b.controller';
import { B2bService } from './b2b.service';
@Module({ imports:[DatabaseModule], controllers:[B2bController], providers:[B2bService] })
export class B2bModule {}
