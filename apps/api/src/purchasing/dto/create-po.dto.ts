import { IsUUID, IsArray, IsNumber, Min, IsOptional, IsString, ValidateNested, IsInt, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
export class POLineDto {
  @IsUUID() variant_id: string;
  @IsInt() @Min(1) quantity_ordered: number;
  @IsNumber() @Min(0) unit_cost: number;
  @IsOptional() @IsNumber() @Min(0) tax_rate?: number;
}
export class CreatePODto {
  @IsUUID() supplier_id: string;
  @IsUUID() warehouse_id: string;
  @IsOptional() @IsDateString() expected_date?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => POLineDto) lines: POLineDto[];
  @IsOptional() @IsString() notes?: string;
}
