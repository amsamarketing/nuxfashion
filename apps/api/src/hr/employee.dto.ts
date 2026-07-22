import { IsDateString, IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { EmployeeStatus, Gender } from './employee.entity';
export class CreateEmployeeDto {
  @IsString() @IsNotEmpty() firstName: string;
  @IsString() @IsNotEmpty() lastName: string;
  @IsEmail() email: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() address?: string;
  @IsEnum(Gender) @IsOptional() gender?: Gender;
  @IsDateString() @IsOptional() dateOfBirth?: string;
  @IsDateString() joiningDate: string;
  @IsNumber() @Min(0) basicSalary: number;
  @IsString() @IsOptional() departmentId?: string;
  @IsString() @IsOptional() designationId?: string;
  @IsEnum(EmployeeStatus) @IsOptional() status?: EmployeeStatus;
  @IsString() @IsOptional() nationalId?: string;
  @IsString() @IsOptional() bankAccount?: string;
  @IsString() @IsOptional() bankName?: string;
  @IsString() @IsOptional() avatarUrl?: string;
}
export class UpdateEmployeeDto {
  @IsString() @IsOptional() firstName?: string;
  @IsString() @IsOptional() lastName?: string;
  @IsEmail() @IsOptional() email?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() address?: string;
  @IsEnum(Gender) @IsOptional() gender?: Gender;
  @IsDateString() @IsOptional() dateOfBirth?: string;
  @IsDateString() @IsOptional() joiningDate?: string;
  @IsNumber() @Min(0) @IsOptional() basicSalary?: number;
  @IsString() @IsOptional() departmentId?: string;
  @IsString() @IsOptional() designationId?: string;
  @IsEnum(EmployeeStatus) @IsOptional() status?: EmployeeStatus;
  @IsString() @IsOptional() nationalId?: string;
  @IsString() @IsOptional() bankAccount?: string;
  @IsString() @IsOptional() bankName?: string;
  @IsString() @IsOptional() avatarUrl?: string;
}
