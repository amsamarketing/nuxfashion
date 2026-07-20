import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
export class CreateAccountDto {
  @IsString() code: string;
  @IsString() name: string;
  @IsEnum(['asset','liability','equity','revenue','expense']) type: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsUUID() parent_id?: string;
}
