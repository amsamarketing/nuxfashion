import { IsUUID, IsArray, IsInt, Min, IsOptional, IsString, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
export class ReceiveLineDto {
  @IsUUID() po_line_id: string;
  @IsUUID() variant_id: string;
  @IsInt() @Min(1) quantity_received: number;
  @IsNumber() @Min(0) unit_cost: number;
}
export class ReceiveGoodsDto {
  @IsUUID() po_id: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ReceiveLineDto) lines: ReceiveLineDto[];
  @IsOptional() @IsString() supplier_invoice?: string;
  @IsOptional() @IsString() notes?: string;
}
