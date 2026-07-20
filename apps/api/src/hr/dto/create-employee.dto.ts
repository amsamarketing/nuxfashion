import { IsString, IsOptional, IsUUID, IsEnum, IsNumber, Min, IsDateString } from 'class-validator';
export class CreateEmployeeDto {
  @IsOptional() @IsUUID() user_id?: string;
  @IsString() employee_number: string;
  @IsString() full_name: string;
  @IsOptional() @IsString() national_id?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsUUID() department_id?: string;
  @IsOptional() @IsString() job_title?: string;
  @IsOptional() @IsEnum(['full_time','part_time','contract']) employment_type?: string;
  @IsDateString() hire_date: string;
  @IsOptional() @IsNumber() @Min(0) basic_salary?: number;
  @IsOptional() @IsNumber() @Min(0) housing_allowance?: number;
  @IsOptional() @IsNumber() @Min(0) transport_allowance?: number;
  @IsOptional() @IsString() notes?: string;
}
