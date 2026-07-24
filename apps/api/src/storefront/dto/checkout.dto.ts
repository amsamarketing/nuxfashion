import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, Min, ValidateNested } from 'class-validator';

export class StoreCartLineDto {
  @IsUUID() variant_id: string;
  @IsInt() @Min(1) quantity: number;
}

export class StoreCheckoutDto {
  @IsString() customer_name: string;
  @IsString() @Matches(/^[+0-9 ()-]{7,20}$/) phone: string;
  @IsOptional() @IsEmail() email?: string;
  @IsString() city: string;
  @IsString() address: string;
  @IsOptional() @IsString() district?: string;
  @IsOptional() @IsString() postal_code?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() coupon_code?: string;
  @IsEnum(['cash_on_delivery','bank_transfer']) payment_method: string;
  @IsArray() @ValidateNested({each:true}) @Type(()=>StoreCartLineDto) lines: StoreCartLineDto[];
}
