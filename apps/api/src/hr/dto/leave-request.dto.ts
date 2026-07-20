import { IsUUID, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
export class LeaveRequestDto {
  @IsUUID() employee_id: string;
  @IsEnum(['annual','sick','emergency','unpaid','maternity','paternity']) type: string;
  @IsDateString() start_date: string;
  @IsDateString() end_date: string;
  @IsOptional() @IsString() reason?: string;
}
