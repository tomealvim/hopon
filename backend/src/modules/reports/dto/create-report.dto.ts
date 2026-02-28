import { IsString, IsOptional, IsIn, IsUUID } from 'class-validator';

export const REPORT_REASONS = [
  'INAPPROPRIATE_BEHAVIOR',
  'NO_SHOW',
  'FRAUD',
  'HARASSMENT',
  'OTHER',
] as const;

export class CreateReportDto {
  @IsUUID()
  targetId: string;

  @IsIn(REPORT_REASONS)
  reason: string;

  @IsOptional()
  @IsString()
  details?: string;
}
