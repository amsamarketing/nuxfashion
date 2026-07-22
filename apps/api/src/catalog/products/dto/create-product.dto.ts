import { IsString, IsOptional, IsBoolean, IsUUID, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
export class CreateVariantDto {
  @IsString() name: string;
  @IsOptional() @IsString() name_ar?: string;
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsString() barcode?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() size?: string;
  @IsOptional() cost_price?: number;
  @IsOptional() selling_price?: number;
  @IsOptional() compare_price?: number;
  @IsOptional() stock_quantity?: number;
  @IsOptional() low_stock_threshold?: number;
}
export class CreateProductDto {
  @IsString() name: string;
  @IsOptional() @IsString() name_ar?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() description_ar?: string;
  @IsOptional() @IsUUID() category_id?: string;
  @IsOptional() @IsUUID() brand_id?: string;
  @IsOptional() @IsString() sku_prefix?: string;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsBoolean() is_active?: boolean;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CreateVariantDto) variants?: CreateVariantDto[];
}
