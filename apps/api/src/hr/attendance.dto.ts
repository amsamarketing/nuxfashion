import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { AttendanceStatus } from './attendance.entity';
export class CreateAttendanceDto {
  @IsString() @IsNotEmpty() employeeId: string;
  @IsDateString() date: string;
  @IsString() @IsOptional() checkIn?: string;
  @IsString() @IsOptional() checkOut?: string;
  @IsNumber() @IsOptional() workHours?: number;
  @IsEnum(AttendanceStatus) @IsOptional() status?: AttendanceStatus;
  @IsString() @IsOptional() notes?: string;
}
export class UpdateAttendanceDto {
  @IsString() @IsOptional() checkIn?: string;
  @IsString() @IsOptional() checkOut?: string;
  @IsNumber() @IsOptional() workHours?: number;
  @IsEnum(AttendanceStatus) @IsOptional() status?: AttendanceStatus;
  @IsString() @IsOptional() notes?: string;
}
export class BulkAttendanceDto {
  date: string;
  records: { employeeId: string; status: AttendanceStatus; checkIn?: string; checkOut?: string }[];
}
