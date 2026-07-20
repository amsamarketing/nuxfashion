import { IsUUID, IsInt, IsString, IsOptional, Min } from 'class-validator';
export class TransferStockDto {
  @IsUUID() from_warehouse_id: string;
  @IsUUID() to_warehouse_id: string;
  @IsUUID() variant_id: string;
  @IsInt() @Min(1) quantity: number;
  @IsOptional() @IsString() notes?: string;
}
