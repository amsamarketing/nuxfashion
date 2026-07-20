import { IsString, IsOptional, IsEmail, IsEnum } from 'class-validator';
export class CreateCustomerDto {
  @IsString() name: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsEnum(['regular','silver','gold','vip']) tier?: string;
  @IsOptional() @IsString() notes?: string;
}
