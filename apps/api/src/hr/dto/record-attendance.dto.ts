import { IsUUID, IsDateString, IsOptional, IsEnum, IsString } from 'class-validator';
export class RecordAttendanceDto {
  @IsUUID() employee_id: string;
  @IsDateString() date: string;
  @IsOptional() @IsUUID() shift_id?: string;
  @IsOptional() @IsString() check_in?: string;
  @IsOptional() @IsString() check_out?: string;
  @IsOptional() @IsEnum(['present','absent','late','half_day','holiday']) status?: string;
  @IsOptional() @IsString() notes?: string;
}
