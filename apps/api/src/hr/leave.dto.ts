import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { LeaveStatus } from './leave.entity';
export class CreateLeaveTypeDto {
  @IsString() @IsNotEmpty() name: string;
  @IsNumber() @Min(0) daysAllowed: number;
  @IsBoolean() @IsOptional() isPaid?: boolean;
  @IsString() @IsOptional() description?: string;
}
export class UpdateLeaveTypeDto {
  @IsString() @IsOptional() name?: string;
  @IsNumber() @Min(0) @IsOptional() daysAllowed?: number;
  @IsBoolean() @IsOptional() isPaid?: boolean;
  @IsString() @IsOptional() description?: string;
}
export class CreateLeaveRequestDto {
  @IsString() @IsNotEmpty() employeeId: string;
  @IsString() @IsOptional() leaveTypeId?: string;
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
  @IsString() @IsOptional() reason?: string;
}
export class UpdateLeaveRequestDto {
  @IsDateString() @IsOptional() startDate?: string;
  @IsDateString() @IsOptional() endDate?: string;
  @IsString() @IsOptional() reason?: string;
  @IsString() @IsOptional() leaveTypeId?: string;
}
export class ApproveLeaveDto {
  @IsEnum(LeaveStatus) status: LeaveStatus;
  @IsString() @IsOptional() approvedBy?: string;
  @IsString() @IsOptional() rejectionReason?: string;
}
