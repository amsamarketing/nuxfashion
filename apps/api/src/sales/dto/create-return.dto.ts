import { IsUUID, IsArray, ValidateNested, IsEnum, IsInt, Min, IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class ReturnLineDto {
  @IsUUID() order_line_id: string;
  @IsUUID() variant_id: string;
  @IsInt() @Min(1) quantity: number;
  @IsNumber() @Min(0) refund_amount: number;
  @IsOptional() @IsBoolean() restock?: boolean;
}

export class CreateReturnDto {
  @IsUUID() original_order_id: string;
  @IsEnum(['cash','card','store_credit']) refund_method: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ReturnLineDto) lines: ReturnLineDto[];
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() notes?: string;
}
