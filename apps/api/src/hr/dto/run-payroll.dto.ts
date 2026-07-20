import { IsInt, Min, Max } from 'class-validator';
export class RunPayrollDto {
  @IsInt() @Min(1) @Max(12) period_month: number;
  @IsInt() @Min(2020) period_year: number;
}
