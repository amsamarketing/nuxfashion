import { IsString, IsOptional, IsEmail, IsEnum, IsBoolean } from 'class-validator';
export class UpdateCustomerDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsEnum(['regular','silver','gold','vip']) tier?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() is_active?: boolean;
}
