import { IsString, IsEnum, IsNumber, Min, IsOptional, IsBoolean, IsInt, IsDateString } from 'class-validator';
export class CreateDiscountDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsEnum(['percentage','fixed_amount','buy_x_get_y','free_item']) type: string;
  @IsEnum(['order','item']) scope: string;
  @IsNumber() @Min(0) value: number;
  @IsOptional() @IsNumber() @Min(0) min_order_amount?: number;
  @IsOptional() @IsInt() buy_quantity?: number;
  @IsOptional() @IsInt() get_quantity?: number;
  @IsOptional() @IsBoolean() is_coupon?: boolean;
  @IsOptional() @IsString() coupon_code?: string;
  @IsOptional() @IsInt() usage_limit?: number;
  @IsOptional() @IsDateString() valid_from?: string;
  @IsOptional() @IsDateString() valid_until?: string;
}
