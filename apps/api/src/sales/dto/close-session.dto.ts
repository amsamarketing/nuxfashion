import { IsNumber, Min, IsOptional, IsString } from 'class-validator';
export class CloseSessionDto {
  @IsNumber() @Min(0) closing_cash: number;
  @IsOptional() @IsString() notes?: string;
}
