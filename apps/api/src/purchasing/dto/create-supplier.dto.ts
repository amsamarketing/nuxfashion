import { IsString, IsOptional, IsInt, IsEmail, Min } from 'class-validator';
export class CreateSupplierDto {
  @IsString() name: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() contact_person?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() tax_number?: string;
  @IsOptional() @IsInt() @Min(0) payment_terms?: number;
  @IsOptional() @IsString() notes?: string;
}
