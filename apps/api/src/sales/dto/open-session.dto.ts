import { IsUUID, IsNumber, Min, IsOptional, IsString } from 'class-validator';
export class OpenSessionDto {
  @IsUUID() warehouse_id: string;
  @IsNumber() @Min(0) opening_cash: number;
  @IsOptional() @IsString() notes?: string;
}
