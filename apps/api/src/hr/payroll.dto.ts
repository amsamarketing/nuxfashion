import { IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { PayrollStatus } from './payroll.entity';
export class CreatePayrollDto {
  @IsString() employeeId: string;
  @IsNumber() @Min(1) @Max(12) month: number;
  @IsNumber() year: number;
  @IsNumber() @Min(0) basicSalary: number;
  @IsArray() @IsOptional() allowances?: { label: string; amount: number }[];
  @IsArray() @IsOptional() deductions?: { label: string; amount: number }[];
  @IsString() @IsOptional() notes?: string;
  @IsNumber() @IsOptional() presentDays?: number;
  @IsNumber() @IsOptional() absentDays?: number;
  @IsNumber() @IsOptional() leaveDays?: number;
}
export class UpdatePayrollDto {
  @IsNumber() @Min(0) @IsOptional() basicSalary?: number;
  @IsArray() @IsOptional() allowances?: { label: string; amount: number }[];
  @IsArray() @IsOptional() deductions?: { label: string; amount: number }[];
  @IsString() @IsOptional() notes?: string;
  @IsNumber() @IsOptional() presentDays?: number;
  @IsNumber() @IsOptional() absentDays?: number;
  @IsNumber() @IsOptional() leaveDays?: number;
}
export class UpdatePayrollStatusDto {
  @IsEnum(PayrollStatus) status: PayrollStatus;
  @IsDateString() @IsOptional() paymentDate?: string;
  @IsString() @IsOptional() paymentMethod?: string;
}
export class GeneratePayrollDto {
  @IsNumber() @Min(1) @Max(12) month: number;
  @IsNumber() year: number;
  @IsOptional() employeeIds?: string[];
}
