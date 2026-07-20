import { IsUUID, IsArray, IsNumber, Min, IsOptional, IsString, ValidateNested, IsEnum, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderLineDto {
  @IsUUID() variant_id: string;
  @IsInt() @Min(1) quantity: number;
  @IsNumber() @Min(0) unit_price: number;
  @IsOptional() @IsEnum(['percentage','fixed_amount','manual']) discount_type?: string;
  @IsOptional() @IsNumber() @Min(0) discount_value?: number;
}

export class OrderDiscountDto {
  @IsOptional() @IsUUID() discount_id?: string;
  @IsString() name: string;
  @IsEnum(['percentage','fixed_amount','coupon','buy_x_get_y']) type: string;
  @IsNumber() @Min(0) value: number;
  @IsOptional() @IsString() coupon_code?: string;
}

export class CreateOrderDto {
  @IsOptional() @IsUUID() pos_session_id?: string;
  @IsUUID() warehouse_id: string;
  @IsOptional() @IsUUID() customer_id?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderLineDto) lines: OrderLineDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => OrderDiscountDto) discounts?: OrderDiscountDto[];
  @IsOptional() @IsString() notes?: string;
}
