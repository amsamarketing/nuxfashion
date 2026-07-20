import { IsString, IsDateString, IsNumber, Min, IsOptional, IsEnum, IsUUID } from 'class-validator';
export class CreateExpenseDto {
  @IsOptional() @IsUUID() category_id?: string;
  @IsDateString() date: string;
  @IsString() description: string;
  @IsNumber() @Min(0) amount: number;
  @IsOptional() @IsNumber() @Min(0) tax_amount?: number;
  @IsOptional() @IsEnum(['cash','card','bank_transfer']) payment_method?: string;
  @IsOptional() @IsString() vendor?: string;
  @IsOptional() @IsString() receipt_ref?: string;
  @IsOptional() @IsString() notes?: string;
}
