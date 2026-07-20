import { IsEnum, IsOptional, IsString } from 'class-validator';
export class ReviewLeaveDto {
  @IsEnum(['approved','rejected']) status: string;
  @IsOptional() @IsString() review_notes?: string;
}
