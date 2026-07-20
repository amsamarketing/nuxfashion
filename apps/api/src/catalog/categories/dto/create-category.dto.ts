import { IsString, IsOptional, IsBoolean, IsUUID, IsInt } from 'class-validator';
export class CreateCategoryDto {
  @IsString() name: string;
  @IsOptional() @IsString() name_ar?: string;
  @IsString() slug: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() description_ar?: string;
  @IsOptional() @IsUUID() parent_id?: string;
  @IsOptional() @IsString() image_url?: string;
  @IsOptional() @IsInt() sort_order?: number;
  @IsOptional() @IsBoolean() is_active?: boolean;
}
