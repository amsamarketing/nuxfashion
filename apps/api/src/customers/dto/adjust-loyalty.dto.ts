import { IsInt, IsEnum, IsOptional, IsString } from 'class-validator';
export class AdjustLoyaltyDto {
  @IsEnum(['earn','redeem','adjust']) type: string;
  @IsInt() points: number;
  @IsOptional() @IsString() notes?: string;
}
