import { IsUUID, IsArray, ValidateNested, IsEnum, IsNumber, Min, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class PaymentLineDto {
  @IsEnum(['cash','card','mada','stc_pay','apple_pay','store_credit','tabby','tamara','bank_transfer','gift_card','wallet','loyalty_points']) method: string;
  @IsNumber() @Min(0.01) amount: number;
  @IsOptional() @IsString() reference?: string;
}

export class ProcessPaymentDto {
  @IsUUID() order_id: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => PaymentLineDto) payments: PaymentLineDto[];
}
