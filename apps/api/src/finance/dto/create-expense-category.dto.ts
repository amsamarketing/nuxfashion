import { IsString, IsOptional, IsUUID } from 'class-validator';
export class CreateExpenseCategoryDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() account_id?: string;
}
