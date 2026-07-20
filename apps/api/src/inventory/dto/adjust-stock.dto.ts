import { IsUUID, IsInt, IsString, IsOptional, IsNotEmpty } from 'class-validator';
export class AdjustStockDto {
  @IsUUID() warehouse_id: string;
  @IsUUID() variant_id: string;
  @IsInt() quantity: number;
  @IsString() @IsNotEmpty() reason: string;
  @IsOptional() @IsString() notes?: string;
}
