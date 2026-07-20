import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
export class AddAddressDto {
  @IsOptional() @IsEnum(['home','work','other']) label?: string;
  @IsString() address_line1: string;
  @IsOptional() @IsString() address_line2?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() postal_code?: string;
  @IsOptional() @IsBoolean() is_default?: boolean;
}
