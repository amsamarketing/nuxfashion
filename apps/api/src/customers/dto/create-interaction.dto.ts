import { IsString, IsOptional, IsEnum } from 'class-validator';
export class CreateInteractionDto {
  @IsEnum(['note','call','visit','complaint','compliment','followup']) type: string;
  @IsOptional() @IsString() subject?: string;
  @IsString() body: string;
}
