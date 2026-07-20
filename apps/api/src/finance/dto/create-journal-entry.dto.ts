import { IsString, IsDateString, IsArray, IsOptional, IsNumber, Min, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
export class JournalLineDto {
  @IsUUID() account_id: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() @Min(0) debit: number;
  @IsNumber() @Min(0) credit: number;
}
export class CreateJournalEntryDto {
  @IsDateString() date: string;
  @IsString() description: string;
  @IsOptional() @IsString() reference_type?: string;
  @IsOptional() @IsUUID() reference_id?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => JournalLineDto) lines: JournalLineDto[];
}
