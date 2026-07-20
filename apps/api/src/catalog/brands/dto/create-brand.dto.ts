import { IsString, IsOptional, IsBoolean } from 'class-validator';
export class CreateBrandDto {
  @IsString() name: string;
  @IsOptional() @IsString() name_ar?: string;
  @IsOptional() @IsString() logo_url?: string;
  @IsOptional() @IsBoolean() is_active?: boolean;
}
