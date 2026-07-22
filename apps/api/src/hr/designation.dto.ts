import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
export class CreateDesignationDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() departmentId?: string;
}
export class UpdateDesignationDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() departmentId?: string;
}
